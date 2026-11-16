import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session } from '@supabase/supabase-js';
import { PrismaService } from '../database/prisma.service.js';
import { authenticationRequiredException } from './auth-errors.js';
import { AuthTokenCryptoService } from './auth-token-crypto.service.js';
import {
  createOpaqueSessionToken,
  getSupabaseSessionId,
  hashSessionToken,
} from './auth-session-token.js';

const REFRESH_LEASE_DURATION_MS = 90_000;

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

    await this.prisma.$transaction(async (tx) => {
      const activeEmployee = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT e."id"
        FROM public."employees" e
        JOIN public."companies" c
          ON c."id" = e."company_id"
        WHERE e."id" = ${employeeId}::uuid
          AND e."auth_user_id" = ${supabaseUserId}::uuid
          AND e."status" = 'ACTIVE'
          AND c."active" = true
        FOR UPDATE OF e
      `;

      if (activeEmployee.length !== 1) {
        throw authenticationRequiredException();
      }

      await tx.authSession.create({
        data: {
          employeeId,

          supabaseUserId,

          supabaseSessionId: getSupabaseSessionId(session.access_token),

          sessionTokenHash: hashSessionToken(cookieToken),

          accessTokenCiphertext: this.crypto.encrypt(session.access_token, 'access'),

          refreshTokenCiphertext: this.crypto.encrypt(session.refresh_token, 'refresh'),

          accessTokenExpiresAt: new Date(session.expires_at! * 1000),

          expiresAt,
        },
      });
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

        employee: {
          is: {
            status: 'ACTIVE',
            company: {
              is: {
                active: true,
              },
            },
          },
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

  async acquireRefreshLease(sessionId: string, cookieToken: string): Promise<string | null> {
    const now = new Date();
    const leaseId = randomUUID();

    const result = await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,
        sessionTokenHash: hashSessionToken(cookieToken),
        revokedAt: null,
        expiresAt: { gt: now },

        OR: [{ refreshLeaseUntil: null }, { refreshLeaseUntil: { lte: now } }],
      },

      data: {
        refreshLeaseId: leaseId,
        refreshLeaseUntil: new Date(now.getTime() + REFRESH_LEASE_DURATION_MS),
      },
    });

    return result.count === 1 ? leaseId : null;
  }

  async releaseRefreshLease(sessionId: string, leaseId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,
        refreshLeaseId: leaseId,
      },
      data: {
        refreshLeaseId: null,
        refreshLeaseUntil: null,
      },
    });
  }

  async rotate(
    current: ActiveAuthSession,

    currentCookieToken: string,

    newSession: Session,

    leaseId: string,
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

        refreshLeaseId: leaseId,

        revokedAt: null,

        expiresAt: {
          gt: now,
        },

        employee: {
          is: {
            status: 'ACTIVE',
            company: {
              is: {
                active: true,
              },
            },
          },
        },
      },

      data: {
        sessionTokenHash: hashSessionToken(newCookieToken),

        accessTokenCiphertext: this.crypto.encrypt(newSession.access_token, 'access'),

        refreshTokenCiphertext: this.crypto.encrypt(newSession.refresh_token, 'refresh'),

        accessTokenExpiresAt: new Date(newSession.expires_at * 1000),

        lastRefreshedAt: now,

        refreshLeaseId: null,
        refreshLeaseUntil: null,
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
        refreshLeaseId: null,
        refreshLeaseUntil: null,
      },
    });
  }

  async revokeIfCurrent(sessionId: string, cookieToken: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,
        sessionTokenHash: hashSessionToken(cookieToken),
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
        refreshLeaseId: null,
        refreshLeaseUntil: null,
      },
    });
  }
}
