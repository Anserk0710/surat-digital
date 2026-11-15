import {
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session, User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import type { AuthIdentityResolver } from './auth-identity.resolver.js';
import { AuthService } from './auth.service.js';
import { type ActiveAuthSession, AuthSessionService } from './auth-session.service.js';
import { hashSessionToken } from './auth-session-token.js';
import type { AuthTokenCryptoService } from './auth-token-crypto.service.js';
import type { SupabaseAuthGateway } from './supabase-auth.gateway.js';

const EMPLOYEE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '33333333-3333-4333-8333-333333333333';

function createJwt(sessionId = SESSION_ID): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64url');

  return `${header}.${payload}.signature`;
}

function createSupabaseSession(): Session {
  return {
    access_token: createJwt(),
    refresh_token: 'provider-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: createSupabaseUser(),
  } as Session;
}

function createSupabaseUser(): User {
  return {
    id: USER_ID,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date(0).toISOString(),
  } as User;
}

function createActiveSession(): ActiveAuthSession {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    employeeId: EMPLOYEE_ID,
    supabaseUserId: USER_ID,
    supabaseSessionId: SESSION_ID,
    sessionTokenHash: hashSessionToken('stale-cookie'),
    accessTokenCiphertext: 'encrypted-access',
    refreshTokenCiphertext: 'encrypted-refresh',
    accessTokenExpiresAt: new Date(Date.now() + 3600_000),
    expiresAt: new Date(Date.now() + 86_400_000),
    lastRefreshedAt: null,
    revokedAt: null,
  };
}

function createEmployee() {
  return {
    id: EMPLOYEE_ID,
    employeeNumber: 'EMP-1',
    username: 'employee',
    email: 'employee@example.com',
    fullName: 'Example Employee',
    status: 'ACTIVE',
    company: {
      id: '55555555-5555-4555-8555-555555555555',
      code: 'EXAMPLE',
      name: 'Example Company',
    },
  } as const;
}

function createServiceFixture() {
  const prisma = {
    employee: {
      findFirst: vi.fn().mockResolvedValue(createEmployee()),
    },
  };
  const identityResolver = {
    resolve: vi.fn().mockResolvedValue({
      id: EMPLOYEE_ID,
      authUserId: USER_ID,
      email: 'employee@example.com',
    }),
  };
  const sessions = {
    create: vi.fn(),
    findActive: vi.fn(),
    decryptSecrets: vi.fn().mockReturnValue({
      accessToken: createJwt(),
      refreshToken: 'provider-refresh-token',
    }),
    rotate: vi.fn(),
    acquireRefreshLease: vi.fn().mockResolvedValue('lease-1'),
    releaseRefreshLease: vi.fn().mockResolvedValue(undefined),
    revoke: vi.fn().mockResolvedValue(undefined),
    revokeIfCurrent: vi.fn().mockResolvedValue(undefined),
  };
  const supabase = {
    signInWithPassword: vi.fn(),
    refreshSession: vi.fn(),
    getUser: vi.fn(),
    revokeSession: vi.fn().mockResolvedValue(true),
  };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    identityResolver as unknown as AuthIdentityResolver,
    sessions as unknown as AuthSessionService,
    supabase as unknown as SupabaseAuthGateway,
    new ConfigService({}),
  );

  return { identityResolver, prisma, service, sessions, supabase };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows only one provider refresh for concurrent requests', async () => {
    const { service, sessions, supabase } = createServiceFixture();

    const current = createActiveSession();

    const winner = {
      cookieToken: 'new-cookie',
      expiresAt: current.expiresAt,
    };

    sessions.findActive.mockResolvedValue(current);

    sessions.acquireRefreshLease.mockResolvedValueOnce('lease-1').mockResolvedValueOnce(null);

    sessions.rotate.mockResolvedValue(winner);

    supabase.refreshSession.mockResolvedValue({
      session: createSupabaseSession(),
      user: createSupabaseUser(),
    });

    const outcomes = await Promise.allSettled([
      service.refresh('old-cookie'),
      service.refresh('old-cookie'),
    ]);

    const success = outcomes.filter((item) => item.status === 'fulfilled');

    const failure = outcomes.filter((item) => item.status === 'rejected');

    expect(success).toHaveLength(1);
    expect(failure).toHaveLength(1);

    expect(supabase.refreshSession).toHaveBeenCalledTimes(1);

    expect(sessions.rotate).toHaveBeenCalledTimes(1);
    expect(sessions.releaseRefreshLease).toHaveBeenCalledTimes(1);

    expect(sessions.revoke).not.toHaveBeenCalled();
    expect(sessions.revokeIfCurrent).not.toHaveBeenCalled();

    const rejected = failure[0] as PromiseRejectedResult;

    expect(rejected.reason).toBeInstanceOf(ConflictException);
    expect(rejected.reason.getStatus()).toBe(409);
  });

  it('releases the lease when provider refresh fails', async () => {
    const { service, sessions, supabase } = createServiceFixture();

    const current = createActiveSession();

    sessions.findActive.mockResolvedValue(current);
    sessions.acquireRefreshLease.mockResolvedValue('lease-1');

    supabase.refreshSession.mockRejectedValue(
      new ServiceUnavailableException('Authentication provider temporarily unavailable.'),
    );

    await expect(service.refresh('old-cookie')).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(sessions.releaseRefreshLease).toHaveBeenCalledWith(current.id, 'lease-1');

    expect(sessions.revokeIfCurrent).not.toHaveBeenCalled();
  });

  it('passes backend-configured company scope to resolver', async () => {
    const companyId = '55555555-5555-4555-8555-555555555555';

    const prisma = {
      employee: {
        findFirst: vi.fn(),
      },
    };

    const resolver = {
      resolve: vi.fn().mockResolvedValue(null),
    };

    const sessions = {};

    const supabase = {
      signInWithPassword: vi.fn().mockResolvedValue(null),
    };

    const service = new AuthService(
      prisma as unknown as PrismaService,
      resolver as unknown as AuthIdentityResolver,
      sessions as unknown as AuthSessionService,
      supabase as unknown as SupabaseAuthGateway,
      new ConfigService({
        AUTH_DEFAULT_COMPANY_ID: companyId,
      }),
    );

    await expect(
      service.login({
        identifier: 'employee',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(resolver.resolve).toHaveBeenCalledWith('employee', companyId);
  });

  it('does not revoke a local session when refresh provider is unavailable', async () => {
    const { service, sessions, supabase } = createServiceFixture();
    sessions.findActive.mockResolvedValue(createActiveSession());
    supabase.refreshSession.mockRejectedValue(
      new ServiceUnavailableException('Authentication provider temporarily unavailable.'),
    );

    await expect(service.refresh('stale-cookie')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(sessions.revoke).not.toHaveBeenCalled();
    expect(sessions.revokeIfCurrent).not.toHaveBeenCalled();
  });

  it('does not create an orphan session when the employee is no longer active', async () => {
    const { prisma, service, sessions, supabase } = createServiceFixture();
    const providerSession = createSupabaseSession();
    prisma.employee.findFirst.mockResolvedValue(null);
    supabase.signInWithPassword.mockResolvedValue({
      session: providerSession,
      user: createSupabaseUser(),
    });

    await expect(
      service.login({ identifier: 'employee', password: 'password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.create).not.toHaveBeenCalled();
    expect(supabase.revokeSession).toHaveBeenCalledOnce();
  });

  it.each([
    ['throws', () => Promise.reject(new Error('network unavailable'))],
    ['returns false', () => Promise.resolve(false)],
  ])('finishes logout when provider revocation %s', async (_label, revokeProvider) => {
    const { service, sessions, supabase } = createServiceFixture();
    const current = createActiveSession();
    sessions.findActive.mockResolvedValue(current);
    supabase.revokeSession.mockImplementation(revokeProvider);

    await expect(service.logout('current-cookie')).resolves.toBeUndefined();
    expect(sessions.revoke).toHaveBeenCalledWith(current.id);
  });
});

describe('AuthSessionService.revokeIfCurrent', () => {
  it('guards revocation with the current cookie hash', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      authSession: { updateMany },
    };
    const service = new AuthSessionService(
      prisma as unknown as PrismaService,
      {} as AuthTokenCryptoService,
      new ConfigService({ AUTH_SESSION_MAX_AGE_SECONDS: 3600 }),
    );

    await service.revokeIfCurrent('session-id', 'stale-cookie');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-id',
        sessionTokenHash: hashSessionToken('stale-cookie'),
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});
