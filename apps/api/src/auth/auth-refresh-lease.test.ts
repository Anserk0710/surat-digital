import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../database/prisma.service.js';
import type { AuthTokenCryptoService } from './auth-token-crypto.service.js';

import { AuthSessionService } from './auth-session.service.js';
import { hashSessionToken } from './auth-session-token.js';

function fixture(count: number) {
  const updateMany = vi.fn().mockResolvedValue({ count });

  const prisma = {
    authSession: { updateMany },
  };

  const service = new AuthSessionService(
    prisma as unknown as PrismaService,
    {} as AuthTokenCryptoService,
    new ConfigService({
      AUTH_SESSION_MAX_AGE_SECONDS: 3600,
    }),
  );

  return { service, updateMany };
}

describe('AuthSessionService refresh lease', () => {
  it('acquires lease using cookie hash and expiry conditions', async () => {
    const { service, updateMany } = fixture(1);

    const leaseId = await service.acquireRefreshLease('session-1', 'cookie-1');

    expect(leaseId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        sessionTokenHash: hashSessionToken('cookie-1'),
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
        OR: [{ refreshLeaseUntil: null }, { refreshLeaseUntil: { lte: expect.any(Date) } }],
      },
      data: {
        refreshLeaseId: leaseId,
        refreshLeaseUntil: expect.any(Date),
      },
    });
  });

  it('rejects lease when conditional update finds no matching row', async () => {
    const { service } = fixture(0);

    await expect(service.acquireRefreshLease('session-1', 'cookie-1')).resolves.toBeNull();
  });

  it('releases only the matching lease ID', async () => {
    const { service, updateMany } = fixture(1);

    await service.releaseRefreshLease('session-1', 'lease-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        refreshLeaseId: 'lease-1',
      },
      data: {
        refreshLeaseId: null,
        refreshLeaseUntil: null,
      },
    });
  });
});
