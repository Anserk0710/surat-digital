import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service.js';
import { authenticationRequiredException, invalidCredentialsException } from './auth-errors.js';
import { AuthIdentityResolver } from './auth-identity.resolver.js';
import { AuthSessionService } from './auth-session.service.js';
import { getSupabaseSessionId } from './auth-session-token.js';
import { SupabaseAuthGateway } from './supabase-auth.gateway.js';
import type { LoginRequestDto } from './dto/login-request.dto.js';

const DUMMY_LOGIN_EMAIL = 'invalid-login@invalid.example';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,

    @Inject(AuthIdentityResolver)
    private readonly identityResolver: AuthIdentityResolver,

    @Inject(AuthSessionService)
    private readonly sessions: AuthSessionService,

    @Inject(SupabaseAuthGateway)
    private readonly supabase: SupabaseAuthGateway,

    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginRequestDto) {
    const trustedCompanyId = this.config.get<string>('AUTH_DEFAULT_COMPANY_ID');

    const identity = await this.identityResolver.resolve(input.identifier, trustedCompanyId);

    /*
     * Penting:
     * Supabase sign-in tetap dijalankan walaupun identifier
     * tidak ditemukan.
     *
     * Ini mengurangi perbedaan response path yang dapat
     * dipakai sebagai account-enumeration oracle.
     */
    const authentication = await this.supabase.signInWithPassword(
      identity?.email ?? DUMMY_LOGIN_EMAIL,

      input.password,
    );

    if (!authentication || !identity || authentication.user.id !== identity.authUserId) {
      if (authentication) {
        await this.supabase.revokeSession(
          authentication.session.access_token,

          authentication.session.refresh_token,
        );
      }

      throw invalidCredentialsException();
    }

    let applicationSession;

    let user;

    try {
      user = await this.loadActiveEmployee(identity.id, authentication.user.id);

      applicationSession = await this.sessions.create(
        identity.id,
        authentication.user.id,
        authentication.session,
      );
    } catch (error) {
      await this.revokeProviderSessionBestEffort(
        authentication.session.access_token,

        authentication.session.refresh_token,

        'login_rollback',
      );

      throw error;
    }

    return {
      cookieToken: applicationSession.cookieToken,

      cookieExpiresAt: applicationSession.expiresAt,

      body: {
        authenticated: true,

        sessionExpiresAt: applicationSession.expiresAt.toISOString(),

        user,
      },
    };
  }

  async refresh(cookieToken: string | null) {
    if (!cookieToken) {
      throw authenticationRequiredException();
    }

    const current = await this.sessions.findActive(cookieToken);

    if (!current) {
      throw authenticationRequiredException();
    }

    const leaseId = await this.sessions.acquireRefreshLease(current.id, cookieToken);

    if (!leaseId) {
      throw new ConflictException({
        code: 'REFRESH_IN_PROGRESS',
        message: 'Session refresh in progress.',
      });
    }

    try {
      const { refreshToken } = this.sessions.decryptSecrets(current);

      const authentication = await this.supabase.refreshSession(refreshToken);

      if (
        !authentication ||
        authentication.user.id !== current.supabaseUserId ||
        getSupabaseSessionId(authentication.session.access_token) !== current.supabaseSessionId
      ) {
        await this.sessions.revokeIfCurrent(current.id, cookieToken);

        throw authenticationRequiredException();
      }

      await this.loadActiveEmployee(current.employeeId, authentication.user.id);

      const rotated = await this.sessions.rotate(
        current,
        cookieToken,
        authentication.session,
        leaseId,
      );

      if (!rotated) {
        throw authenticationRequiredException();
      }

      return {
        cookieToken: rotated.cookieToken,

        cookieExpiresAt: rotated.expiresAt,

        body: {
          refreshed: true,

          sessionExpiresAt: rotated.expiresAt.toISOString(),
        },
      };
    } finally {
      // Conditional release: tidak bisa melepaskan lease milik
      // refresh request lain yang sudah mengambil alih.
      await this.sessions.releaseRefreshLease(current.id, leaseId);
    }
  }

  async me(cookieToken: string | null) {
    if (!cookieToken) {
      throw authenticationRequiredException();
    }

    const session = await this.sessions.findActive(cookieToken);

    if (!session) {
      throw authenticationRequiredException();
    }

    const { accessToken } = this.sessions.decryptSecrets(session);

    const supabaseUser = await this.supabase.getUser(accessToken);

    if (!supabaseUser || supabaseUser.id !== session.supabaseUserId) {
      throw authenticationRequiredException();
    }

    if (getSupabaseSessionId(accessToken) !== session.supabaseSessionId) {
      await this.sessions.revoke(session.id);

      throw authenticationRequiredException();
    }

    return {
      authenticated: true,

      user: await this.loadActiveEmployee(session.employeeId, supabaseUser.id),
    };
  }

  async logout(cookieToken: string | null): Promise<void> {
    if (!cookieToken) {
      return;
    }

    const session = await this.sessions.findActive(cookieToken);

    if (!session) {
      return;
    }

    const secrets = this.sessions.decryptSecrets(session);

    /*
     * Local revoke dilakukan terlebih dahulu.
     * Ini adalah security boundary aplikasi kita.
     */
    await this.sessions.revoke(session.id);

    /*
     * Supabase revoke merupakan best effort.
     * Bahkan bila network Supabase sedang bermasalah,
     * opaque app-session sudah invalid.
     */
    await this.revokeProviderSessionBestEffort(secrets.accessToken, secrets.refreshToken, 'logout');
  }

  private async revokeProviderSessionBestEffort(
    accessToken: string,
    refreshToken: string,
    operation: 'login_rollback' | 'logout',
  ): Promise<void> {
    try {
      const revoked = await this.supabase.revokeSession(accessToken, refreshToken);

      if (!revoked) {
        this.logger.warn({
          event: 'auth.provider_revoke_failed',
          operation,
          reason: 'provider_rejected_request',
        });
      }
    } catch {
      this.logger.warn({
        event: 'auth.provider_revoke_failed',
        operation,
        reason: 'provider_unavailable',
      });
    }
  }

  private async loadActiveEmployee(employeeId: string, authUserId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        authUserId,
        status: 'ACTIVE',
      },

      select: {
        id: true,

        employeeNumber: true,

        username: true,

        email: true,

        fullName: true,

        status: true,

        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!employee) {
      throw authenticationRequiredException();
    }

    return employee;
  }
}
