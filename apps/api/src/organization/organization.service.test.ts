import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { PrismaService } from '../database/prisma.service.js';
import { OrganizationService } from './organization.service.js';

describe('OrganizationService database error mapping', () => {
  it('maps an adapter-wrapped PostgreSQL constraint violation to conflict', async () => {
    const driverAdapterError = Object.assign(new Error('P05_MASTER_STILL_REFERENCED'), {
      cause: {
        originalCode: '23514',
        code: '23514',
        message: 'P05_MASTER_STILL_REFERENCED',
      },
    });
    const prismaError = Object.assign(new Error('Database error.'), {
      code: 'P2039',
      meta: { driverAdapterError },
    });
    const service = new OrganizationService({} as PrismaService);
    const target = service as unknown as {
      write<T>(operation: () => Promise<T>): Promise<T>;
    };

    await expect(
      target.write.call(service, () => Promise.reject(prismaError)),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
