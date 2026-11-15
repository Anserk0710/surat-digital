import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import request from 'supertest';

import { createApplication } from '../src/bootstrap.js';

import { createPrismaClient } from '../src/database/prisma-client.js';

interface DataApiPrivilegeGrant {
  grantee: string;
  tableName: string;
}

async function verifyDataApiPrivileges(
  prisma: ReturnType<typeof createPrismaClient>,
): Promise<void> {
  const grants = await prisma.$queryRaw<DataApiPrivilegeGrant[]>`
    WITH data_api_roles("grantee") AS (
      VALUES ('anon'), ('authenticated')
    ),
    application_tables("tableName") AS (
      VALUES
        ('companies'),
        ('offices'),
        ('divisions'),
        ('office_divisions'),
        ('job_titles'),
        ('employees'),
        ('employee_assignments'),
        ('groups'),
        ('permissions'),
        ('employee_groups'),
        ('group_permissions'),
        ('auth_sessions')
    )
    SELECT "grantee", "tableName"
    FROM data_api_roles
    CROSS JOIN application_tables
    WHERE has_table_privilege("grantee", format('public.%I', "tableName"), 'SELECT')
      OR has_table_privilege("grantee", format('public.%I', "tableName"), 'INSERT')
      OR has_table_privilege("grantee", format('public.%I', "tableName"), 'UPDATE')
      OR has_table_privilege("grantee", format('public.%I', "tableName"), 'DELETE')
      OR has_table_privilege("grantee", format('public.%I', "tableName"), 'TRUNCATE')
      OR has_table_privilege("grantee", format('public.%I', "tableName"), 'REFERENCES')
      OR has_table_privilege("grantee", format('public.%I', "tableName"), 'TRIGGER')
  `;

  assert.deepEqual(grants, [], `Unexpected Supabase Data API grants: ${JSON.stringify(grants)}`);
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value?.trim()) {
    throw new Error(`${name} is required for P03 verification.`);
  }

  return value.trim();
}

function extractCookie(response: request.Response, cookieName: string): string {
  const header = response.headers['set-cookie'] as string | string[] | undefined;

  const values = Array.isArray(header) ? header : header ? [header] : [];

  const cookie = values.find((value) => value.startsWith(`${cookieName}=`));

  assert.ok(cookie, `Expected ${cookieName} Set-Cookie header.`);

  return cookie.split(';')[0]!;
}

function assertNoSupabaseTokens(body: unknown): void {
  const serialized = JSON.stringify(body);

  assert.equal(serialized.includes('access_token'), false);

  assert.equal(serialized.includes('refresh_token'), false);
}

async function main(): Promise<void> {
  const databaseUrl = requiredEnv('DATABASE_URL');

  const supabaseUrl = requiredEnv('SUPABASE_URL');

  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  const browserOrigin = requiredEnv('FRONTEND_ORIGIN');

  const cookieName = process.env.AUTH_SESSION_COOKIE_NAME ?? 'sd_session';

  const suffix = randomBytes(6).toString('hex');

  const email = `p03.${suffix}@example.com`;

  const username = `p03_${suffix}`;

  const employeeNumber = `P03${Date.now()}${suffix.slice(0, 4)}`;

  const password = `${randomBytes(18).toString('base64url')}Aa1!`;

  const companyCode = `P03-${suffix}`.toUpperCase();

  const prisma = createPrismaClient(databaseUrl);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  let authUserId: string | null = null;

  let employeeId: string | null = null;

  let companyId: string | null = null;

  const app = await createApplication();

  try {
    await verifyDataApiPrivileges(prisma);

    const { data: createUserData, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,

      email_confirm: true,
    });

    if (createUserError || !createUserData.user) {
      throw new Error(
        `Unable to create Supabase P03 test user: ${createUserError?.message ?? 'unknown error'}`,
      );
    }

    authUserId = createUserData.user.id;

    const company = await prisma.company.create({
      data: {
        code: companyCode,

        name: `P03 Verification ${suffix}`,
      },
    });

    companyId = company.id;

    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,

        authUserId,

        employeeNumber,

        username,

        usernameNormalized: username.toLowerCase(),

        email,

        emailNormalized: email.toLowerCase(),

        fullName: 'P03 Verification User',

        status: 'ACTIVE',
      },
    });

    employeeId = employee.id;

    await app.init();

    const server = app.getHttpServer();

    /*
     * --------------------------------------------------------
     * P03-T04
     * Existing username + wrong password
     * vs nonexistent username/NIP must have same response.
     * --------------------------------------------------------
     */

    const existingWrong = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', browserOrigin)
      .send({
        identifier: username,

        password: `${password}-wrong`,
      });

    const missingUsername = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', browserOrigin)
      .send({
        identifier: `missing-${suffix}`,

        password: `${password}-wrong`,
      });

    const missingNip = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', browserOrigin)
      .send({
        identifier: `999999-${suffix}`,

        password: `${password}-wrong`,
      });

    assert.equal(existingWrong.status, 401);

    assert.equal(missingUsername.status, 401);

    assert.equal(missingNip.status, 401);

    assert.deepEqual(existingWrong.body, missingUsername.body);

    assert.deepEqual(existingWrong.body, missingNip.body);

    /*
     * --------------------------------------------------------
     * P03-T01 / P03-T03 — username login lifecycle
     * --------------------------------------------------------
     */

    const agent = request.agent(server);

    const loginResponse = await agent.post('/api/v1/auth/login').set('Origin', browserOrigin).send({
      identifier: username,

      password,
    });

    assert.equal(loginResponse.status, 200);

    assertNoSupabaseTokens(loginResponse.body);

    const firstCookie = extractCookie(loginResponse, cookieName);

    const meAfterLogin = await agent.get('/api/v1/auth/me');

    assert.equal(meAfterLogin.status, 200);

    assert.equal(meAfterLogin.body.user.id, employee.id);

    /*
     * Refresh must rotate opaque session.
     */

    const refreshResponse = await agent.post('/api/v1/auth/refresh').set('Origin', browserOrigin);

    assert.equal(refreshResponse.status, 200);

    assertNoSupabaseTokens(refreshResponse.body);

    const refreshedCookie = extractCookie(refreshResponse, cookieName);

    assert.notEqual(refreshedCookie, firstCookie);

    /*
     * Old cookie must immediately fail after rotation.
     */

    const oldCookieAfterRefresh = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', firstCookie);

    assert.equal(oldCookieAfterRefresh.status, 401);

    const meAfterRefresh = await agent.get('/api/v1/auth/me');

    assert.equal(meAfterRefresh.status, 200);

    /*
     * Logout.
     */

    const logoutResponse = await agent.post('/api/v1/auth/logout').set('Origin', browserOrigin);

    assert.equal(logoutResponse.status, 204);

    /*
     * Even manually replaying the previous cookie
     * must fail because auth_sessions is revoked.
     */

    const replayAfterLogout = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', refreshedCookie);

    assert.equal(replayAfterLogout.status, 401);

    /*
     * --------------------------------------------------------
     * Verify valid NIP login.
     * --------------------------------------------------------
     */

    const nipAgent = request.agent(server);

    const nipLogin = await nipAgent.post('/api/v1/auth/login').set('Origin', browserOrigin).send({
      identifier: employeeNumber,

      password,
    });

    assert.equal(nipLogin.status, 200);

    assert.equal((await nipAgent.get('/api/v1/auth/me')).status, 200);

    await nipAgent.post('/api/v1/auth/logout').set('Origin', browserOrigin);

    /*
     * --------------------------------------------------------
     * Verify valid Email login.
     * --------------------------------------------------------
     */

    const emailAgent = request.agent(server);

    const emailLogin = await emailAgent
      .post('/api/v1/auth/login')
      .set('Origin', browserOrigin)
      .send({
        identifier: email,

        password,
      });

    assert.equal(emailLogin.status, 200);

    assert.equal((await emailAgent.get('/api/v1/auth/me')).status, 200);

    await emailAgent.post('/api/v1/auth/logout').set('Origin', browserOrigin);

    /*
     * --------------------------------------------------------
     * P03-T02 — Browser contract.
     * --------------------------------------------------------
     */

    const rootDirectory = path.resolve(process.cwd(), '../..');

    const webPackage = JSON.parse(
      fs.readFileSync(path.join(rootDirectory, 'apps/web/package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    assert.equal(webPackage.dependencies?.['@supabase/supabase-js'], undefined);

    assert.equal(webPackage.devDependencies?.['@supabase/supabase-js'], undefined);

    const webEnv = fs.readFileSync(path.join(rootDirectory, 'apps/web/.env.example'), 'utf8');

    assert.equal(/SUPABASE_/i.test(webEnv), false);

    console.log('\nP03 AUTH GATEWAY VERIFICATION');

    console.log('--------------------------------');

    console.log('P03-T01: PASS');

    console.log('P03-T02: PASS');

    console.log('P03-T03: PASS');

    console.log('P03-T04: PASS');

    console.log('C05 Data API privileges: PASS');
  } finally {
    await app.close();

    if (employeeId) {
      await prisma.authSession.deleteMany({
        where: {
          employeeId,
        },
      });

      await prisma.employee.deleteMany({
        where: {
          id: employeeId,
        },
      });
    }

    if (companyId) {
      await prisma.company.deleteMany({
        where: {
          id: companyId,
        },
      });
    }

    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId);
    }

    await prisma.$disconnect();
  }
}

await main();
