import 'dotenv/config';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient, type Session } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { AuthSessionService } from '../src/auth/auth-session.service.js';
import { createApplication } from '../src/bootstrap.js';
import { PrismaService } from '../src/database/prisma.service.js';

function fakeSession(): Session {
  const payload = Buffer.from(JSON.stringify({ session_id: randomUUID() })).toString('base64url');
  return {
    access_token: `e30.${payload}.fixture`,
    refresh_token: randomBytes(32).toString('base64url'),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
  } as Session;
}

async function main() {
  if (process.env.P05_NONPROD_ACK !== 'YES' || process.env.NODE_ENV === 'production') {
    throw new Error('Non-production acknowledgement required.');
  }
  const app = await createApplication();
  await app.init();
  const prisma = app.get(PrismaService);
  const sessions = app.get(AuthSessionService);
  const db = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  if (db[0]?.name !== process.env.P05_EXPECTED_DATABASE_NAME) {
    throw new Error('Unexpected database.');
  }
  const suffix = randomBytes(5).toString('hex');
  const company = await prisma.company.create({
    data: { code: `P05_ONBOARD_${suffix}`, name: 'P05 Onboarding Test' },
  });
  const auth = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let registeredAuthId: string | undefined;
  try {
    const server = app.getHttpServer();
    const origin = process.env.FRONTEND_ORIGIN!;
    const browser = request.agent(server);
    const csrf = await browser.get('/api/v1/auth/csrf').set('Origin', origin).expect(200);
    const token = csrf.body.csrfToken as string;
    const email = `p05-onboard-${suffix}@example.com`;
    const registration = {
      companyCode: company.code,
      employeeNumber: `NIP${suffix}`,
      username: `p05_${suffix}`,
      fullName: 'Onboarding Test User',
      email,
      password: `${randomBytes(18).toString('base64url')}Aa1!`,
    };
    await browser
      .post('/api/v1/users/register')
      .set('Origin', origin)
      .set('X-CSRF-Token', token)
      .send(registration)
      .expect(201);
    const pending = await prisma.employee.findFirstOrThrow({
      where: { companyId: company.id, emailNormalized: email },
    });
    registeredAuthId = pending.authUserId ?? undefined;
    assert.equal(pending.status, 'PENDING');
    await browser
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('X-CSRF-Token', token)
      .send({ identifier: registration.username, password: registration.password })
      .expect(401);

    const adminId = randomUUID();
    const admin = await prisma.employee.create({
      data: {
        companyId: company.id,
        authUserId: adminId,
        employeeNumber: `ADMIN${suffix}`,
        username: `admin_${suffix}`,
        usernameNormalized: `admin_${suffix}`,
        email: `admin-${suffix}@example.com`,
        emailNormalized: `admin-${suffix}@example.com`,
        fullName: 'P05 Administrator',
        status: 'ACTIVE',
      },
    });
    const group = await prisma.group.create({
      data: { companyId: company.id, code: `P05_ADMIN_${suffix}`, name: 'P05 Admin' },
    });
    await prisma.employeeGroup.create({ data: { employeeId: admin.id, groupId: group.id } });
    for (const code of ['User.View', 'User.Manage']) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.groupPermission.create({
        data: { groupId: group.id, permissionId: permission.id, effect: 'ALLOW' },
      });
    }
    const session = await sessions.create(admin.id, adminId, fakeSession());
    const csrfCookies = csrf.headers['set-cookie'] as string[] | string | undefined;
    const cookies = (
      Array.isArray(csrfCookies) ? csrfCookies : csrfCookies ? [csrfCookies] : []
    ).map((value) => value.split(';')[0]);
    const cookie = [
      ...cookies,
      `${process.env.AUTH_SESSION_COOKIE_NAME || 'sd_session'}=${session.cookieToken}`,
    ].join('; ');
    const client = request(server);
    const api = (method: 'get' | 'post' | 'patch', path: string) =>
      client[method](`/api/v1/users${path}`)
        .set('Origin', origin)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token);
    await api('get', '').expect(200);
    await api('patch', `/${pending.id}/status`).send({ status: 'ACTIVE' }).expect(200);
    assert.equal(
      (await prisma.employee.findUniqueOrThrow({ where: { id: pending.id } })).status,
      'ACTIVE',
    );
    await api('patch', '/me/profile').send({ fullName: 'Updated Administrator' }).expect(200);
    assert.equal(
      (await api('get', '/me/profile').expect(200)).body.fullName,
      'Updated Administrator',
    );

    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Users');
    sheet.addRow(['nip', 'username', 'email', 'nama']);
    sheet.addRow([
      `IMP${suffix}`,
      `import_${suffix}`,
      `import-${suffix}@example.com`,
      'Imported User',
    ]);
    sheet.addRow([
      `IMP${suffix}`,
      `import_${suffix}`,
      `import-${suffix}@example.com`,
      'Duplicate User',
    ]);
    const buffer = Buffer.from(await book.xlsx.writeBuffer());
    const result = await api('post', '/import').attach('file', buffer, 'users.xlsx').expect(201);
    assert.equal(result.body.created, 1);
    assert.equal(result.body.errors.length, 1);
    assert.equal(result.body.errors[0].row, 3);
    assert.equal(
      (
        await prisma.employee.findFirstOrThrow({
          where: { companyId: company.id, employeeNumber: `IMP${suffix}` },
        })
      ).status,
      'PENDING',
    );
    console.log('P05-T05 registration, activation, profile, Excel row validation: PASS');
  } finally {
    await prisma.authSession.deleteMany({ where: { employee: { companyId: company.id } } });
    await prisma.groupPermission.deleteMany({ where: { group: { companyId: company.id } } });
    await prisma.employeeGroup.deleteMany({ where: { group: { companyId: company.id } } });
    await prisma.group.deleteMany({ where: { companyId: company.id } });
    await prisma.employee.deleteMany({ where: { companyId: company.id } });
    await prisma.company.delete({ where: { id: company.id } });
    if (registeredAuthId) {
      await auth.auth.admin.deleteUser(registeredAuthId);
    }
    await app.close();
  }
}

await main();
