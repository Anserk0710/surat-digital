import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

const invitation = vi.hoisted(() => ({
  send: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { admin: { inviteUserByEmail: invitation.send, deleteUser: invitation.delete } },
  }),
}));

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
    const service = new OrganizationService({} as PrismaService, {} as ConfigService);
    const target = service as unknown as {
      write<T>(operation: () => Promise<T>): Promise<T>;
    };

    await expect(
      target.write.call(service, () => Promise.reject(prismaError)),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not let a company administrator read or create another company', async () => {
    const prisma = {
      company: {
        findUnique: () => {
          throw new Error('Must remain scoped');
        },
      },
    };
    const service = new OrganizationService(
      prisma as unknown as PrismaService,
      { get: () => undefined } as unknown as ConfigService,
    );
    const actor = { employeeId: 'employee', companyId: 'own-company' };

    await expect(service.getCompany(actor, 'other-company')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.createCompany(actor, {
        code: 'OTHER',
        name: 'Other Company',
        adminEmail: 'admin@example.com',
        adminName: 'Admin',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires a configured migration role before deleting related organization data', async () => {
    const prisma = {
      office: { findFirst: async () => ({ id: 'office', companyId: 'company' }) },
    };
    const service = new OrganizationService(
      prisma as unknown as PrismaService,
      { get: () => undefined } as unknown as ConfigService,
    );
    const actor = { employeeId: 'employee', companyId: 'company' };

    await expect(service.deleteMasterPermanently(actor, 'office', 'office')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('creates a company with an invited first administrator and scoped permissions', async () => {
    invitation.send.mockResolvedValue({ data: { user: { id: 'auth-user' } }, error: null });
    const permissions = [
      'System.Configure',
      'User.Manage',
      'User.View',
      'Group.View',
      'Group.Manage',
    ].map((code, index) => ({ id: `permission-${index}`, code }));
    const tx = {
      company: {
        create: vi.fn().mockResolvedValue({ id: 'company-new', code: 'NEW', name: 'New Company' }),
      },
      employee: { create: vi.fn().mockResolvedValue({ id: 'admin-new' }) },
      group: { create: vi.fn().mockResolvedValue({ id: 'group-new' }) },
      employeeGroup: { create: vi.fn().mockResolvedValue({}) },
      groupPermission: { createMany: vi.fn().mockResolvedValue({ count: 5 }) },
      groupPolicyAudit: { create: vi.fn().mockResolvedValue({}) },
      organizationChange: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      company: { findUnique: vi.fn().mockResolvedValue(null) },
      permission: { findMany: vi.fn().mockResolvedValue(permissions) },
      $transaction: async (operation: (transaction: typeof tx) => Promise<unknown>) =>
        operation(tx),
    };
    const config = {
      get: (key: string) =>
        key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'service-key',
    };
    const service = new OrganizationService(
      prisma as unknown as PrismaService,
      config as ConfigService,
    );

    await expect(
      service.createCompany(
        { employeeId: 'platform-admin', companyId: 'platform-company', isPlatformAdmin: true },
        {
          code: 'NEW',
          name: 'New Company',
          adminEmail: 'First@Example.com',
          adminName: 'First Admin',
        },
      ),
    ).resolves.toMatchObject({ id: 'company-new' });

    expect(invitation.send).toHaveBeenCalledWith('first@example.com');
    expect(tx.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: 'company-new', authUserId: 'auth-user' }),
      }),
    );
    expect(tx.groupPermission.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ effect: 'ALLOW' })]),
      }),
    );
    expect(tx.organizationChange.create).toHaveBeenCalledOnce();
    expect(tx.groupPolicyAudit.create).toHaveBeenCalledOnce();
  });
});
