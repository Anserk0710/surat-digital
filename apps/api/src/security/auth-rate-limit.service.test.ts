import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';

function fixture() {
  let count = 0;

  const upsert = vi.fn().mockImplementation(async () => ({
    requestCount: ++count,
  }));

  const prisma = {
    authRateLimitBucket: { upsert },
  };

  const key = Buffer.alloc(32, 7).toString('base64');

  const service = new AuthRateLimitService(
    prisma as unknown as PrismaService,
    new ConfigService({
      AUTH_RATE_LIMIT_HMAC_KEY_BASE64: key,
    }),
  );

  return { service, upsert };
}

describe('P04-T01 auth rate limiting', () => {
  const policy = {
    scope: 'login-ip-identifier',
    identity: '192.0.2.1\0test@example.com',
    limit: 5,
    windowSeconds: 900,
  };

  it('allows requests within the policy limit', async () => {
    const { service } = fixture();

    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(service.consume(policy)).resolves.toBeUndefined();
    }
  });

  it('returns HTTP 429 after the allowed attempts', async () => {
    const { service } = fixture();

    for (let attempt = 0; attempt < 5; attempt++) {
      await service.consume(policy);
    }

    await expect(service.consume(policy)).rejects.toMatchObject({
      status: 429,
    });
  });

  it('does not persist the raw IP or identifier', async () => {
    const { service, upsert } = fixture();

    await service.consume(policy);

    const input = upsert.mock.calls[0]![0];
    const storedId = input.create.id as string;

    expect(storedId).toMatch(/^[a-f0-9]{64}$/);
    expect(storedId).not.toContain('192.0.2.1');
    expect(storedId).not.toContain('test@example.com');
  });

  it('fails closed when rate-limit storage is unavailable', async () => {
    const { service, upsert } = fixture();

    upsert.mockRejectedValue(new Error('database unavailable'));

    await expect(service.consume(policy)).rejects.toMatchObject({
      status: 503,
    });
  });
});
