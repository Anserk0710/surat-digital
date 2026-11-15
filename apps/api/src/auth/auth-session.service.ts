import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session } from '@supabase/supabase-js';
import { PrismaService } from '../database/prisma.service.js';
import { AuthTokenCryptoService } from './auth-token-crypto.service.js';
import {
  createOpaqueSessionToken,
  getSupabaseSessionId,
  hashSessionToken,
} from './auth-session-token.js';

export interface ActiveAuthSession {
  id: string;
  employeeId: string;
  supabaseUserId: string;
  supabaseSessionId: string;

  sessionTokenHash: string;

  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;

  accessTokenExpiresAt: Date;
  expiresAt: Date;

  lastRefreshedAt: Date | null;
  revokedAt: Date | null;
}

interface CreateApplicationSessionResult {
  cookieToken: string;
  expiresAt: Date;
}

interface SessionSecrets {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthSessionService {
  private readonly sessionMaxAgeSeconds: number;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,

    @Inject(AuthTokenCryptoService)
    private readonly crypto: AuthTokenCryptoService,

    @Inject(ConfigService)
    configService: ConfigService,
  ) {
    this.sessionMaxAgeSeconds = configService.getOrThrow<number>('AUTH_SESSION_MAX_AGE_SECONDS');
  }

  async create(
    employeeId: string,
    supabaseUserId: string,
    session: Session,
  ): Promise<CreateApplicationSessionResult> {
    if (!session.refresh_token || !session.expires_at) {
      throw new Error('Supabase session is incomplete.');
    }

    const cookieToken = createOpaqueSessionToken();

    const expiresAt = new Date(Date.now() + this.sessionMaxAgeSeconds * 1000);

    await this.prisma.authSession.create({
      data: {
        employeeId,

        supabaseUserId,

        supabaseSessionId: getSupabaseSessionId(session.access_token),

        sessionTokenHash: hashSessionToken(cookieToken),

        accessTokenCiphertext: this.crypto.encrypt(session.access_token, 'access'),

        refreshTokenCiphertext: this.crypto.encrypt(session.refresh_token, 'refresh'),

        accessTokenExpiresAt: new Date(session.expires_at * 1000),

        expiresAt,
      },
    });

    return {
      cookieToken,
      expiresAt,
    };
  }

  async findActive(cookieToken: string): Promise<ActiveAuthSession | null> {
    const session = await this.prisma.authSession.findFirst({
      where: {
        sessionTokenHash: hashSessionToken(cookieToken),

        revokedAt: null,

        expiresAt: {
          gt: new Date(),
        },
      },

      select: {
        id: true,
        employeeId: true,
        supabaseUserId: true,
        supabaseSessionId: true,

        sessionTokenHash: true,

        accessTokenCiphertext: true,

        refreshTokenCiphertext: true,

        accessTokenExpiresAt: true,

        expiresAt: true,

        lastRefreshedAt: true,
        revokedAt: true,
      },
    });

    return session;
  }

  decryptSecrets(session: ActiveAuthSession): SessionSecrets {
    return {
      accessToken: this.crypto.decrypt(session.accessTokenCiphertext, 'access'),

      refreshToken: this.crypto.decrypt(session.refreshTokenCiphertext, 'refresh'),
    };
  }

  async rotate(
    current: ActiveAuthSession,

    currentCookieToken: string,

    newSession: Session,
  ): Promise<CreateApplicationSessionResult | null> {
    if (!newSession.refresh_token || !newSession.expires_at) {
      return null;
    }

    const newSupabaseSessionId = getSupabaseSessionId(newSession.access_token);

    if (newSupabaseSessionId !== current.supabaseSessionId) {
      return null;
    }

    const newCookieToken = createOpaqueSessionToken();

    const now = new Date();

    const result = await this.prisma.authSession.updateMany({
      where: {
        id: current.id,

        sessionTokenHash: hashSessionToken(currentCookieToken),

        revokedAt: null,

        expiresAt: {
          gt: now,
        },
      },

      data: {
        sessionTokenHash: hashSessionToken(newCookieToken),

        accessTokenCiphertext: this.crypto.encrypt(newSession.access_token, 'access'),

        refreshTokenCiphertext: this.crypto.encrypt(newSession.refresh_token, 'refresh'),

        accessTokenExpiresAt: new Date(newSession.expires_at * 1000),

        lastRefreshedAt: now,
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return {
      cookieToken: newCookieToken,

      expiresAt: current.expiresAt,
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });
  }
}
