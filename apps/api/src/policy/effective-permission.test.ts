import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../database/prisma.service.js';
import {
  EffectivePermissionService,
  resolveEffectivePermissions,
} from './effective-permission.service.js';

const actor = { employeeId: 'employee-1', companyId: 'company-1' };

function fixture(effects: Array<{ code: string; effect: 'ALLOW' | 'DENY' }>) {
  const findMany = vi.fn().mockResolvedValue(
    effects.map((item) => ({
      effect: item.effect,
      permission: { code: item.code },
    })),
  );
  const prisma = { groupPermission: { findMany } };
  const service = new EffectivePermissionService(prisma as unknown as PrismaService);

  return { service, findMany };
}

describe('P06 effective-permission evaluator', () => {
  it('P06-T01: a single ALLOW grants access', () => {
    expect(
      resolveEffectivePermissions(['Group.View'], [{ code: 'Group.View', effect: 'ALLOW' }]),
    ).toEqual([{ code: 'Group.View', decision: 'ALLOW' }]);
  });

  it('P06-T02: DENY overrides ALLOW regardless of order', () => {
    const allow = { code: 'Document.Download', effect: 'ALLOW' as const };
    const deny = { code: 'Document.Download', effect: 'DENY' as const };

    expect(resolveEffectivePermissions(['Document.Download'], [allow, deny])[0]?.decision).toBe(
      'DENY',
    );
    expect(resolveEffectivePermissions(['Document.Download'], [deny, allow])[0]?.decision).toBe(
      'DENY',
    );
  });

  it('P06-T03: missing policy results in default DENY', () => {
    expect(resolveEffectivePermissions(['System.Configure'], [])).toEqual([
      { code: 'System.Configure', decision: 'DENY' },
    ]);
  });

  it('evaluates each permission independently', () => {
    expect(
      resolveEffectivePermissions(
        ['User.View', 'User.Manage'],
        [
          { code: 'User.View', effect: 'ALLOW' },
          { code: 'User.Manage', effect: 'DENY' },
        ],
      ),
    ).toEqual([
      { code: 'User.View', decision: 'ALLOW' },
      { code: 'User.Manage', decision: 'DENY' },
    ]);
  });

  it('applies DENY independently of array ordering', () => {
    const effects = [
      { code: 'Group.View', effect: 'ALLOW' as const },
      { code: 'Group.View', effect: 'DENY' as const },
      { code: 'Group.View', effect: 'ALLOW' as const },
    ];

    for (const rows of [effects, [...effects].reverse()]) {
      expect(resolveEffectivePermissions(['Group.View'], rows)[0]?.decision).toBe('DENY');
    }
  });

  it('requires every permission in hasAll()', async () => {
    const { service } = fixture([
      { code: 'Group.Manage', effect: 'ALLOW' },
      { code: 'System.Configure', effect: 'DENY' },
    ]);

    await expect(service.hasAll(actor, ['Group.Manage', 'System.Configure'])).resolves.toBe(false);
  });

  it('filters inactive policies/groups and tenant at database level', async () => {
    const { service, findMany } = fixture([]);

    await service.has(actor, 'Group.View');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          permission: { active: true, code: { in: ['Group.View'] } },
          group: expect.objectContaining({
            active: true,
            companyId: actor.companyId,
          }),
        }),
      }),
    );
  });

  it('does not reuse a previous evaluation result', async () => {
    const { service, findMany } = fixture([]);

    await service.has(actor, 'Group.View');
    await service.has(actor, 'Group.View');

    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
