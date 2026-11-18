import 'dotenv/config';

import { createPrismaClient } from '../src/database/prisma-client.js';

const employeeId = process.env.ADMIN_EMPLOYEE_ID;
const authUserId = process.env.ADMIN_AUTH_USER_ID;
const connectionString = process.env.DIRECT_URL;
const apply = process.env.ADMIN_GRANT_ACK === 'YES';

if (!employeeId || !authUserId || !connectionString) {
  throw new Error('ADMIN_EMPLOYEE_ID, ADMIN_AUTH_USER_ID, and DIRECT_URL are required.');
}

const prisma = createPrismaClient(connectionString);

try {
  const [database] = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT current_database() AS name
  `;
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      authUserId: true,
      companyId: true,
      status: true,
      company: { select: { active: true } },
      employeeGroups: {
        select: {
          active: true,
          group: {
            select: {
              id: true,
              code: true,
              active: true,
              groupPermissions: {
                select: {
                  active: true,
                  effect: true,
                  permission: { select: { code: true, active: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  const permissions = await prisma.permission.findMany({
    where: { active: true },
    select: { id: true, code: true },
    orderBy: { code: 'asc' },
  });
  const effective = new Map<string, 'ALLOW' | 'DENY'>();
  for (const membership of employee?.employeeGroups ?? []) {
    if (!membership.active || !membership.group.active) {
      continue;
    }
    for (const rule of membership.group.groupPermissions) {
      if (!rule.active || !rule.permission.active) {
        continue;
      }
      const code = rule.permission.code;
      if (rule.effect === 'DENY' || !effective.has(code)) {
        effective.set(code, rule.effect);
      }
    }
  }

  if (apply) {
    if (
      process.env.NODE_ENV === 'production' ||
      database?.name !== process.env.ADMIN_EXPECTED_DATABASE_NAME
    ) {
      throw new Error('The non-production database name must be acknowledged.');
    }
    if (
      !employee ||
      employee.authUserId !== authUserId ||
      employee.status !== 'ACTIVE' ||
      !employee.company.active
    ) {
      throw new Error('Administrator identity or active status does not match.');
    }
    if (permissions.length === 0) {
      throw new Error('No active permissions found.');
    }

    const groupCode = `ACCOUNT_ADMIN_${employee.id.slice(0, 8).toUpperCase()}`;
    await prisma.$transaction(async (tx) => {
      const group = await tx.group.upsert({
        where: { companyId_code: { companyId: employee.companyId, code: groupCode } },
        create: {
          companyId: employee.companyId,
          code: groupCode,
          name: 'Account Administrator',
          description: `Dedicated administrator permissions for employee ${employee.id}`,
          active: true,
        },
        update: { active: true },
      });
      const otherMembers = await tx.employeeGroup.count({
        where: { groupId: group.id, employeeId: { not: employee.id }, active: true },
      });
      if (otherMembers > 0) {
        throw new Error('Dedicated administrator group has another active member.');
      }
      await tx.employeeGroup.upsert({
        where: { employeeId_groupId: { employeeId: employee.id, groupId: group.id } },
        create: { employeeId: employee.id, groupId: group.id, active: true },
        update: { active: true },
      });
      for (const permission of permissions) {
        await tx.groupPermission.upsert({
          where: { groupId_permissionId: { groupId: group.id, permissionId: permission.id } },
          create: { groupId: group.id, permissionId: permission.id, effect: 'ALLOW', active: true },
          update: { effect: 'ALLOW', active: true },
        });
      }
      await tx.groupPolicyAudit.create({
        data: {
          companyId: employee.companyId,
          actorEmployeeId: employee.id,
          action: 'ADMIN_ALL_PERMISSIONS_GRANTED',
          targetType: 'GROUP',
          targetId: group.id,
        },
      });
    });
  }

  console.log(
    JSON.stringify(
      {
        database: database?.name,
        employeeFound: Boolean(employee),
        idsMatch: employee?.authUserId === authUserId,
        companyId: employee?.companyId,
        status: employee?.status,
        companyActive: employee?.company.active,
        activePermissions: permissions.map(({ code }) => code),
        allPermissionsEffective: permissions.every(({ code }) => effective.get(code) === 'ALLOW'),
        grantApplied: apply,
        groups: employee?.employeeGroups.map(({ active, group }) => ({
          code: group.code,
          active: active && group.active,
          rules: group.groupPermissions
            .filter((rule) => rule.active && rule.permission.active)
            .map((rule) => ({
              code: rule.permission.code,
              effect: rule.effect,
            })),
        })),
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
