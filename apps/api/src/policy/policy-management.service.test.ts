import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import type { EffectivePermissionService } from './effective-permission.service.js';
import { PolicyManagementService } from './policy-management.service.js';

const actor = { employeeId: 'employee-1', companyId: 'company-1' };

describe('Group Policy batch management', () => {
  it('saves multiple permissions and audits them in one transaction', async () => {
    const upsert = vi.fn().mockImplementation(async ({ create }) => ({ id: create.permissionId }));
    const audit = vi.fn().mockResolvedValue({});
    const tx = {
      group: { findFirst: vi.fn().mockResolvedValue({ id: 'group-1' }) },
      permission: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'permission-1', code: 'Document.Create' },
          { id: 'permission-2', code: 'Document.Download' },
        ]),
      },
      groupPermission: { upsert },
      groupPolicyAudit: { create: audit },
    };
    const transaction = vi.fn(async (operation: (client: typeof tx) => Promise<unknown>) =>
      operation(tx),
    );
    const service = new PolicyManagementService(
      { $transaction: transaction } as unknown as PrismaService,
      {} as EffectivePermissionService,
    );

    const result = await service.setPermissionsBatch(actor, 'group-1', {
      permissionCodes: ['Document.Create', 'Document.Download'],
      effect: 'DENY',
    });

    expect(result).toHaveLength(2);
    expect(transaction).toHaveBeenCalledOnce();
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(audit).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ effect: 'DENY' }) }),
    );
  });

  it('rejects an unknown permission before changing any policy', async () => {
    const upsert = vi.fn();
    const tx = {
      group: { findFirst: vi.fn().mockResolvedValue({ id: 'group-1' }) },
      permission: {
        findMany: vi.fn().mockResolvedValue([{ id: 'permission-1', code: 'Document.Create' }]),
      },
      groupPermission: { upsert },
    };
    const service = new PolicyManagementService(
      {
        $transaction: (operation: (client: typeof tx) => Promise<unknown>) => operation(tx),
      } as unknown as PrismaService,
      {} as EffectivePermissionService,
    );

    await expect(
      service.setPermissionsBatch(actor, 'group-1', {
        permissionCodes: ['Document.Create', 'Missing.Permission'],
        effect: 'ALLOW',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('searches active employees by name or NIP within the group company', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      group: { findFirst: vi.fn().mockResolvedValue({ id: 'group-1' }) },
      employee: { findMany },
    };
    const service = new PolicyManagementService(
      prisma as unknown as PrismaService,
      {} as EffectivePermissionService,
    );

    await service.searchMemberCandidates(actor, 'group-1', '123');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'company-1', status: 'ACTIVE' }),
        take: 20,
      }),
    );
    const where = findMany.mock.calls[0]?.[0]?.where;
    expect(where.OR).toEqual([
      { fullName: { contains: '123', mode: 'insensitive' } },
      { employeeNumber: { contains: '123', mode: 'insensitive' } },
    ]);
  });
});
