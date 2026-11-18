import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import type { Session } from '@supabase/supabase-js';
import request from 'supertest';

import { AuthSessionService } from '../src/auth/auth-session.service.js';
import { createApplication } from '../src/bootstrap.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { EffectivePermissionService } from '../src/policy/effective-permission.service.js';

function fakeSession(): Session {
  const sessionId = randomUUID();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64url');

  return {
    access_token: `${header}.${payload}.fixture`,
    refresh_token: randomBytes(32).toString('base64url'),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
  } as Session;
}

async function main() {
  if (process.env.P06_NONPROD_ACK !== 'YES') {
    throw new Error('P06_NONPROD_ACK=YES is required.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('P06 verifier cannot run in production.');
  }

  const expectedDatabase = process.env.P06_EXPECTED_DATABASE_NAME;
  if (!expectedDatabase) {
    throw new Error('P06_EXPECTED_DATABASE_NAME is required.');
  }

  const appA = await createApplication();
  const appB = await createApplication();
  const createdCompanies: string[] = [];

  try {
    await appA.init();
    await appB.init();

    const prisma = appA.get(PrismaService);
    const prismaB = appB.get(PrismaService);
    const sessions = appA.get(AuthSessionService);
    const permissionsA = appA.get(EffectivePermissionService);
    const permissionsB = appB.get(EffectivePermissionService);
    const config = appA.get(ConfigService);
    const database = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT current_database() AS name
    `;

    if (database[0]?.name !== expectedDatabase) {
      throw new Error('Unexpected test database.');
    }

    const [auditPrivileges] = await prisma.$queryRaw<
      Array<{
        canSelect: boolean;
        canInsert: boolean;
        canUpdate: boolean;
        canDelete: boolean;
      }>
    >`
      SELECT
        has_table_privilege(
          'surat_runtime',
          'public.group_policy_audit',
          'SELECT'
        ) AS "canSelect",
        has_table_privilege(
          'surat_runtime',
          'public.group_policy_audit',
          'INSERT'
        ) AS "canInsert",
        has_table_privilege(
          'surat_runtime',
          'public.group_policy_audit',
          'UPDATE'
        ) AS "canUpdate",
        has_table_privilege(
          'surat_runtime',
          'public.group_policy_audit',
          'DELETE'
        ) AS "canDelete"
    `;

    assert.deepEqual(auditPrivileges, {
      canSelect: true,
      canInsert: true,
      canUpdate: false,
      canDelete: false,
    });

    const origin = config.getOrThrow<string>('FRONTEND_ORIGIN');
    const cookieName = config.getOrThrow<string>('AUTH_SESSION_COOKIE_NAME');
    const server = appA.getHttpServer();
    const suffix = randomBytes(5).toString('hex');

    const companyA = await prisma.company.create({
      data: { code: `P06A_${suffix}`, name: 'P06 Verification A' },
    });
    createdCompanies.push(companyA.id);

    const companyB = await prisma.company.create({
      data: { code: `P06B_${suffix}`, name: 'P06 Verification B' },
    });
    createdCompanies.push(companyB.id);

    async function createEmployee(companyId: string, label: string) {
      const userId = randomUUID();
      const key = randomBytes(6).toString('hex');
      const username = `p06_${label}_${key}`;
      const employee = await prisma.employee.create({
        data: {
          companyId,
          authUserId: userId,
          employeeNumber: `P06_${key}`,
          username,
          usernameNormalized: username.toLowerCase(),
          email: `${username}@example.test`,
          emailNormalized: `${username}@example.test`,
          fullName: `P06 ${label}`,
          status: 'ACTIVE',
        },
      });
      const applicationSession = await sessions.create(employee.id, userId, fakeSession());

      return {
        employee,
        actor: { employeeId: employee.id, companyId },
        cookieToken: applicationSession.cookieToken,
      };
    }

    const admin = await createEmployee(companyA.id, 'admin');
    const target = await createEmployee(companyA.id, 'target');
    const outsider = await createEmployee(companyB.id, 'outsider');
    const catalog = await prisma.permission.findMany({
      where: {
        code: {
          in: ['System.Configure', 'Group.Manage', 'Group.View', 'User.View'],
        },
        active: true,
      },
    });

    assert.equal(catalog.length, 4, 'Permission catalog must be seeded first.');

    const adminGroup = await prisma.group.create({
      data: {
        companyId: companyA.id,
        code: `P06_ADMIN_${suffix}`,
        name: 'P06 Admin Fixture',
      },
    });
    await prisma.employeeGroup.create({
      data: { employeeId: admin.employee.id, groupId: adminGroup.id },
    });

    for (const code of ['System.Configure', 'Group.Manage']) {
      const permission = catalog.find((item) => item.code === code);
      assert.ok(permission);
      await prisma.groupPermission.create({
        data: {
          groupId: adminGroup.id,
          permissionId: permission.id,
          effect: 'ALLOW',
        },
      });
    }

    async function makeBrowser(cookieToken: string) {
      const csrfResponse = await request(server)
        .get('/api/v1/auth/csrf')
        .set('Origin', origin)
        .expect(200);
      const csrfToken = csrfResponse.body.csrfToken as string;
      const cookieHeaders = csrfResponse.headers['set-cookie'] as string[] | string | undefined;
      const cookies = Array.isArray(cookieHeaders)
        ? cookieHeaders
        : cookieHeaders
          ? [cookieHeaders]
          : [];
      const combinedCookie = [
        ...cookies.map((item) => item.split(';')[0]!),
        `${cookieName}=${cookieToken}`,
      ].join('; ');

      return (method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: object) => {
        const client = request(server);
        const builder = client[method](`/api/v1${path}`)
          .set('Origin', origin)
          .set('Cookie', combinedCookie)
          .set('X-CSRF-Token', csrfToken);

        return body ? builder.send(body) : builder;
      };
    }

    const adminApi = await makeBrowser(admin.cookieToken);
    const targetApi = await makeBrowser(target.cookieToken);

    assert.equal(await permissionsA.has(target.actor, 'Group.View'), false);
    await targetApi('get', '/group-policy/groups').expect(403);
    await targetApi('get', '/group-policy/me/effective-permissions').expect(200);
    console.log('P06-T03 Default Deny: PASS');

    const allowResponse = await adminApi('post', '/group-policy/groups', {
      code: `P06_ALLOW_${suffix.toUpperCase()}`,
      name: 'P06 Allow Group',
    }).expect(201);
    const denyResponse = await adminApi('post', '/group-policy/groups', {
      code: `P06_DENY_${suffix.toUpperCase()}`,
      name: 'P06 Deny Group',
    }).expect(201);
    const allowGroupId = allowResponse.body.id as string;
    const denyGroupId = denyResponse.body.id as string;

    await adminApi('post', `/group-policy/groups/${allowGroupId}/permissions`, {
      permissionCode: 'Group.View',
      effect: 'ALLOW',
    }).expect(201);
    await adminApi('post', `/group-policy/groups/${denyGroupId}/permissions`, {
      permissionCode: 'Group.View',
      effect: 'DENY',
    }).expect(201);

    await adminApi('post', `/group-policy/groups/${allowGroupId}/members`, {
      employeeId: target.employee.id,
    }).expect(201);
    assert.equal(await permissionsB.has(target.actor, 'Group.View'), true);
    await targetApi('get', '/group-policy/groups').expect(200);
    console.log('P06-T01 Single ALLOW: PASS');

    await targetApi('post', '/group-policy/groups', {
      code: `UNAUTHORIZED_${suffix.toUpperCase()}`,
      name: 'Unauthorized Group',
    }).expect(403);

    await adminApi('post', `/group-policy/groups/${denyGroupId}/members`, {
      employeeId: target.employee.id,
    }).expect(201);
    assert.equal(await permissionsB.has(target.actor, 'Group.View'), false);
    await targetApi('get', '/group-policy/groups').expect(403);
    console.log('P06-T02 DENY precedence: PASS');

    await adminApi(
      'delete',
      `/group-policy/groups/${denyGroupId}/members/${target.employee.id}`,
    ).expect(200);
    assert.equal(await permissionsB.has(target.actor, 'Group.View'), true);
    await adminApi(
      'delete',
      `/group-policy/groups/${allowGroupId}/members/${target.employee.id}`,
    ).expect(200);
    assert.equal(await permissionsB.has(target.actor, 'Group.View'), false);
    await adminApi('post', `/group-policy/groups/${allowGroupId}/members`, {
      employeeId: target.employee.id,
    }).expect(201);
    assert.equal(await permissionsB.has(target.actor, 'Group.View'), true);
    await adminApi('post', `/group-policy/groups/${allowGroupId}/permissions`, {
      permissionCode: 'Group.View',
      effect: 'DENY',
    }).expect(201);
    assert.equal(await permissionsB.has(target.actor, 'Group.View'), false);
    await adminApi('post', `/group-policy/groups/${allowGroupId}/permissions`, {
      permissionCode: 'Group.View',
      effect: 'ALLOW',
    }).expect(201);
    assert.equal(await permissionsB.has(target.actor, 'Group.View'), true);
    console.log('P06-T04 No-cache consistency: PASS');

    await adminApi('post', `/group-policy/groups/${allowGroupId}/members`, {
      employeeId: outsider.employee.id,
    }).expect(400);
    await assert.rejects(() =>
      prismaB.employeeGroup.create({
        data: { employeeId: outsider.employee.id, groupId: allowGroupId },
      }),
    );
    console.log('P06 cross-company integrity: PASS');

    const foreignGroup = await prisma.group.create({
      data: {
        companyId: companyB.id,
        code: `FOREIGN_${suffix.toUpperCase()}`,
        name: 'Foreign Group',
      },
    });
    await adminApi('get', `/group-policy/groups/${foreignGroup.id}`).expect(404);
    console.log('P06 cross-tenant group access: PASS');

    await adminApi('post', `/group-policy/groups/${allowGroupId}/permissions`, {
      permissionCode: 'Group.Manage',
      effect: 'ALLOW',
    }).expect(201);
    await targetApi('post', '/group-policy/groups', {
      code: `MANAGE_ONLY_${suffix.toUpperCase()}`,
      name: 'Manage Without Configure',
    }).expect(403);

    await adminApi('post', `/group-policy/groups/${allowGroupId}/permissions`, {
      permissionCode: 'User.View',
      effect: 'ALLOW',
    }).expect(201);
    await targetApi('get', '/organization/offices').expect(200);
    await adminApi('post', `/group-policy/groups/${denyGroupId}/members`, {
      employeeId: target.employee.id,
    }).expect(201);
    await adminApi('post', `/group-policy/groups/${denyGroupId}/permissions`, {
      permissionCode: 'User.View',
      effect: 'DENY',
    }).expect(201);
    await targetApi('get', '/organization/offices').expect(403);
    console.log('P05/P06 shared evaluator: PASS');

    await adminApi('delete', `/group-policy/groups/${allowGroupId}`).expect(200);
    assert.equal(await permissionsB.has(target.actor, 'Group.View'), false);
    await adminApi('patch', `/group-policy/groups/${allowGroupId}/status`, {
      active: true,
    }).expect(200);
    assert.equal(await permissionsB.has(target.actor, 'Group.View'), false);
    console.log('P06 group reactivation safety: PASS');

    const auditCount = await prisma.groupPolicyAudit.count({
      where: { companyId: companyA.id },
    });
    assert.ok(auditCount > 0);
    console.log('P06 transactional audit: PASS');
    console.log('\nP06 INTEGRATION VERIFICATION: PASS');
  } finally {
    try {
      if (createdCompanies.length > 0) {
        const prisma = appA.get(PrismaService);
        const employees = await prisma.employee.findMany({
          where: { companyId: { in: createdCompanies } },
          select: { id: true },
        });
        const employeeIds = employees.map((employee) => employee.id);
        const groups = await prisma.group.findMany({
          where: { companyId: { in: createdCompanies } },
          select: { id: true },
        });
        const groupIds = groups.map((group) => group.id);

        await prisma.authSession.deleteMany({
          where: { employeeId: { in: employeeIds } },
        });
        await prisma.employeeGroup.deleteMany({
          where: { employeeId: { in: employeeIds } },
        });
        await prisma.groupPermission.deleteMany({
          where: { groupId: { in: groupIds } },
        });
        await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
        await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
        await prisma.company.deleteMany({
          where: { id: { in: createdCompanies } },
        });
      }
    } finally {
      await appB.close();
      await appA.close();
    }
  }
}

await main();
