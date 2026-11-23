import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { AuthIdentityResolver } from './auth-identity.resolver.js';

function createResolver() {
  const findMany = vi.fn().mockResolvedValue([]);
  const prisma = {
    employee: { findMany },
  };

  return {
    findMany,
    resolver: new AuthIdentityResolver(prisma as unknown as PrismaService),
  };
}

describe('AuthIdentityResolver company scope', () => {
  it('keeps the single-company MVP query when no trusted company is available', async () => {
    const { findMany, resolver } = createResolver();

    await resolver.resolve(' Employee@Example.com ');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ companyId: expect.anything() }),
      }),
    );
  });

  it('adds the trusted company ID to the Prisma filter', async () => {
    const { findMany, resolver } = createResolver();
    const companyId = '11111111-1111-4111-8111-111111111111';

    await resolver.resolve('employee', companyId);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId }),
      }),
    );
  });

  it('resolves an invited administrator by email across companies', async () => {
    const { findMany, resolver } = createResolver();
    const companyId = '11111111-1111-4111-8111-111111111111';

    await resolver.resolve('Admin@New-Company.com', companyId);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ emailNormalized: 'admin@new-company.com' }],
        }),
      }),
    );
    expect(findMany.mock.calls[0]?.[0].where).not.toHaveProperty('companyId');
  });
});
