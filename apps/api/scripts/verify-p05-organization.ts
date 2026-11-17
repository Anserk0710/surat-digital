import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

import type { Session } from '@supabase/supabase-js';

import { ConfigService } from '@nestjs/config';
import request from 'supertest';

import { AuthSessionService } from '../src/auth/auth-session.service.js';
import { createApplication } from '../src/bootstrap.js';
import { PrismaService } from '../src/database/prisma.service.js';

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

async function main(): Promise<void> {
  if (process.env.P05_NONPROD_ACK !== 'YES') {
    throw new Error('P05_NONPROD_ACK=YES required.');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Integration test forbidden in production.');
  }

  const app = await createApplication();
  const temporaryCompanies: string[] = [];

  try {
    await app.init();

    const prisma = app.get(PrismaService);
    const expectedDatabaseName = process.env.P05_EXPECTED_DATABASE_NAME;

    if (!expectedDatabaseName) {
      throw new Error('P05_EXPECTED_DATABASE_NAME is required.');
    }

    const target = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT current_database() AS name
    `;

    if (target[0]?.name !== expectedDatabaseName) {
      throw new Error('P05 verification database name mismatch.');
    }

    const sessions = app.get(AuthSessionService);
    const config = app.get(ConfigService);
    const server = app.getHttpServer();
    const origin = config.getOrThrow<string>('FRONTEND_ORIGIN');
    const cookieName = config.getOrThrow<string>('AUTH_SESSION_COOKIE_NAME');
    const suffix = randomBytes(5).toString('hex');

    const companyA = await prisma.company.create({
      data: {
        code: `P05A_${suffix}`,
        name: 'P05 Test Company A',
      },
    });

    temporaryCompanies.push(companyA.id);

    const companyB = await prisma.company.create({
      data: {
        code: `P05B_${suffix}`,
        name: 'P05 Test Company B',
      },
    });

    temporaryCompanies.push(companyB.id);

    async function createActor(companyId: string, role: 'admin' | 'viewer') {
      const authUserId = randomUUID();
      const username = `p05_${role}_${randomUUID().slice(0, 8)}`;

      const employee = await prisma.employee.create({
        data: {
          companyId,
          authUserId,
          employeeNumber: `P05-${randomUUID().slice(0, 10)}`,
          username,
          usernameNormalized: username.toLowerCase(),
          email: `${username}@example.test`,
          emailNormalized: `${username}@example.test`,
          fullName: `P05 ${role}`,
          status: 'ACTIVE',
        },
      });

      const group = await prisma.group.create({
        data: {
          companyId,
          code: `P05_${role}_${randomUUID().slice(0, 8)}`,
          name: `P05 ${role}`,
          active: true,
        },
      });

      await prisma.employeeGroup.create({
        data: {
          employeeId: employee.id,
          groupId: group.id,
          active: true,
        },
      });

      const codes =
        role === 'admin' ? ['System.Configure', 'User.View', 'User.Manage'] : ['User.View'];

      const permissions = await prisma.permission.findMany({
        where: {
          code: { in: codes },
          active: true,
        },
      });

      assert.equal(
        permissions.length,
        codes.length,
        'Run the P02 permission seed before P05 verification.',
      );

      for (const permission of permissions) {
        await prisma.groupPermission.create({
          data: {
            groupId: group.id,
            permissionId: permission.id,
            effect: 'ALLOW',
          },
        });
      }

      const session = await sessions.create(employee.id, authUserId, fakeSession());

      const csrf = await request(server).get('/api/v1/auth/csrf').set('Origin', origin).expect(200);

      const csrfCookieHeader = csrf.headers['set-cookie'] as string[] | string | undefined;
      const csrfCookies = Array.isArray(csrfCookieHeader)
        ? csrfCookieHeader
        : csrfCookieHeader
          ? [csrfCookieHeader]
          : [];
      const cookie = [
        ...csrfCookies.map((value) => value.split(';')[0]),
        `${cookieName}=${session.cookieToken}`,
      ].join('; ');
      const csrfToken = csrf.body.csrfToken as string;

      function api(method: 'get' | 'post' | 'patch' | 'delete', path: string) {
        const client = request(server);

        return client[method](`/api/v1/organization${path}`)
          .set('Cookie', cookie)
          .set('Origin', origin)
          .set('X-CSRF-Token', csrfToken);
      }

      return { employee, group, session, api };
    }

    const admin = await createActor(companyA.id, 'admin');
    const viewer = await createActor(companyA.id, 'viewer');
    const otherTenant = await createActor(companyB.id, 'admin');

    const configurePermission = await prisma.permission.findUniqueOrThrow({
      where: { code: 'System.Configure' },
    });
    const denyGroup = await prisma.group.create({
      data: {
        companyId: companyA.id,
        code: `P05_DENY_${suffix}`,
        name: 'P05 Explicit Deny Group',
      },
    });

    await prisma.employeeGroup.create({
      data: {
        employeeId: admin.employee.id,
        groupId: denyGroup.id,
      },
    });

    const denial = await prisma.groupPermission.create({
      data: {
        groupId: denyGroup.id,
        permissionId: configurePermission.id,
        effect: 'DENY',
      },
    });

    await admin
      .api('post', '/offices')
      .send({
        code: 'DENIED_BY_POLICY',
        name: 'Permission Denied Office',
        timezone: 'Asia/Makassar',
      })
      .expect(403);

    await prisma.groupPermission.delete({ where: { id: denial.id } });

    console.log('P05-T01 DENY precedence: PASS');

    await viewer.api('get', '/offices').expect(200);

    await viewer
      .api('post', '/offices')
      .send({
        code: 'DENIED',
        name: 'Denied Office',
        timezone: 'Asia/Makassar',
      })
      .expect(403);

    const officeResponse = await admin
      .api('post', '/offices')
      .send({
        code: 'HQ',
        name: 'Headquarters',
        timezone: 'Asia/Makassar',
      })
      .expect(201);
    const officeId = officeResponse.body.id as string;

    const divisionResponse = await admin
      .api('post', '/divisions')
      .send({ code: 'FIN', name: 'Finance' })
      .expect(201);
    const divisionId = divisionResponse.body.id as string;

    await admin.api('get', `/offices/${officeId}`).expect(200);
    await admin
      .api('patch', `/offices/${officeId}`)
      .send({ name: 'Headquarters Updated' })
      .expect(200);
    await otherTenant.api('get', `/offices/${officeId}`).expect(404);

    const spare = await admin
      .api('post', '/offices')
      .send({
        code: 'SPARE',
        name: 'Unused Office',
        timezone: 'Asia/Jakarta',
      })
      .expect(201);

    await admin.api('delete', `/offices/${spare.body.id}`).expect(200);

    const inactiveSpare = await prisma.office.findUniqueOrThrow({
      where: { id: spare.body.id as string },
    });

    assert.equal(inactiveSpare.active, false);
    console.log('P05-T01 CRUD and permission: PASS');

    const foreignDivision = await prisma.division.create({
      data: {
        companyId: companyB.id,
        code: 'FOREIGN',
        name: 'Foreign Division',
      },
    });

    await admin
      .api('post', '/office-divisions')
      .send({ officeId, divisionId: foreignDivision.id })
      .expect(400);

    await assert.rejects(() =>
      prisma.officeDivision.create({
        data: { officeId, divisionId: foreignDivision.id },
      }),
    );

    const mappingResponse = await admin
      .api('post', '/office-divisions')
      .send({ officeId, divisionId })
      .expect(201);
    const mappingId = mappingResponse.body.id as string;

    await admin
      .api('post', '/assignments')
      .send({
        employeeId: otherTenant.employee.id,
        officeDivisionId: mappingId,
        isPrimary: false,
      })
      .expect(400);

    await assert.rejects(() =>
      prisma.employeeAssignment.create({
        data: {
          employeeId: otherTenant.employee.id,
          officeDivisionId: mappingId,
        },
      }),
    );

    console.log('P05-T02 cross-tenant assignment: PASS');
    console.log('P05-T02 office/division integrity: PASS');

    await admin
      .api('post', '/offices')
      .send({
        code: 'INVALID_TZ',
        name: 'Invalid Timezone Office',
        timezone: 'GMT+8',
      })
      .expect(400);

    await assert.rejects(() =>
      prisma.office.create({
        data: {
          companyId: companyA.id,
          code: 'INVALID_RAW',
          name: 'Invalid Raw Timezone',
          timezone: 'Asia/Invalid',
        },
      }),
    );

    console.log('P05-T03 IANA timezone: PASS');

    const jobResponse = await admin
      .api('post', '/job-titles')
      .send({ code: 'STAFF', name: 'Staff' })
      .expect(201);
    const jobTitleId = jobResponse.body.id as string;

    const assignmentResponse = await admin
      .api('post', '/assignments')
      .send({
        employeeId: admin.employee.id,
        officeDivisionId: mappingId,
        jobTitleId,
        isPrimary: true,
        validFrom: '2026-01-01',
      })
      .expect(201);
    const assignmentId = assignmentResponse.body.id as string;

    await admin.api('delete', `/office-divisions/${mappingId}`).expect(409);
    await admin.api('delete', `/offices/${officeId}`).expect(409);
    await admin.api('delete', `/divisions/${divisionId}`).expect(409);
    await admin.api('delete', `/job-titles/${jobTitleId}`).expect(409);
    await admin.api('delete', `/companies/${companyA.id}`).expect(409);
    await admin.api('delete', `/assignments/${assignmentId}`).expect(200);
    await admin.api('delete', `/office-divisions/${mappingId}`).expect(200);
    await admin.api('delete', `/offices/${officeId}`).expect(200);
    await admin.api('delete', `/divisions/${divisionId}`).expect(200);
    await admin.api('delete', `/job-titles/${jobTitleId}`).expect(200);

    await admin.api('patch', `/office-divisions/${mappingId}`).send({ active: true }).expect(409);

    console.log('P05-T04 deactivation integrity: PASS');

    await admin.api('patch', `/offices/${officeId}`).send({ active: true }).expect(200);
    await admin.api('patch', `/divisions/${divisionId}`).send({ active: true }).expect(200);
    await admin.api('patch', `/office-divisions/${mappingId}`).send({ active: true }).expect(200);

    const primaryOne = await admin
      .api('post', '/assignments')
      .send({
        employeeId: admin.employee.id,
        officeDivisionId: mappingId,
        isPrimary: true,
      })
      .expect(201);

    await admin
      .api('post', '/assignments')
      .send({
        employeeId: admin.employee.id,
        officeDivisionId: mappingId,
        isPrimary: true,
      })
      .expect(409);

    await admin.api('delete', `/assignments/${primaryOne.body.id}`).expect(200);

    console.log('P05 primary assignment integrity: PASS');
    console.log('\nP05 VERIFICATION: ALL TESTS PASSED');
  } finally {
    try {
      const prisma = app.get(PrismaService);

      if (temporaryCompanies.length > 0) {
        const employees = await prisma.employee.findMany({
          where: { companyId: { in: temporaryCompanies } },
          select: { id: true },
        });
        const employeeIds = employees.map((item) => item.id);
        const offices = await prisma.office.findMany({
          where: { companyId: { in: temporaryCompanies } },
          select: { id: true },
        });
        const officeIds = offices.map((item) => item.id);
        const groups = await prisma.group.findMany({
          where: { companyId: { in: temporaryCompanies } },
          select: { id: true },
        });
        const groupIds = groups.map((item) => item.id);

        await prisma.authSession.deleteMany({
          where: { employeeId: { in: employeeIds } },
        });
        await prisma.employeeAssignment.deleteMany({
          where: { employeeId: { in: employeeIds } },
        });
        await prisma.officeDivision.deleteMany({
          where: { officeId: { in: officeIds } },
        });
        await prisma.groupPermission.deleteMany({
          where: { groupId: { in: groupIds } },
        });
        await prisma.employeeGroup.deleteMany({
          where: { employeeId: { in: employeeIds } },
        });
        await prisma.group.deleteMany({
          where: { companyId: { in: temporaryCompanies } },
        });
        await prisma.jobTitle.deleteMany({
          where: { companyId: { in: temporaryCompanies } },
        });
        await prisma.office.deleteMany({
          where: { companyId: { in: temporaryCompanies } },
        });
        await prisma.division.deleteMany({
          where: { companyId: { in: temporaryCompanies } },
        });
        await prisma.employee.deleteMany({
          where: { companyId: { in: temporaryCompanies } },
        });
        await prisma.company.deleteMany({
          where: { id: { in: temporaryCompanies } },
        });
      }
    } finally {
      await app.close();
    }
  }
}

await main();
