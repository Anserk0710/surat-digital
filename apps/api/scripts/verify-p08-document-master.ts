import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Session } from '@supabase/supabase-js';
import request from 'supertest';
import { AuthSessionService } from '../src/auth/auth-session.service.js';
import { createApplication } from '../src/bootstrap.js';
import { createPrismaClient } from '../src/database/prisma-client.js';
import { PrismaService } from '../src/database/prisma.service.js';

if (process.env.P08_NONPROD_ACK !== 'YES' || process.env.NODE_ENV === 'production') {
  throw new Error('P08 verifier requires P08_NONPROD_ACK=YES and a non-production environment.');
}
const expectedDatabase = process.env.P08_EXPECTED_DATABASE_NAME;
const directUrl = process.env.DIRECT_URL;
if (!expectedDatabase || !directUrl) {
  throw new Error('P08 verifier configuration is incomplete.');
}

function fakeSession(): Session {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ session_id: randomUUID() })).toString('base64url');
  return {
    access_token: `${header}.${payload}.fixture`,
    refresh_token: randomBytes(32).toString('base64url'),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
  } as Session;
}

const app = await createApplication();
const fixturePrisma = createPrismaClient(directUrl);
const suffix = randomBytes(5).toString('hex');
let companyId: string | undefined;
const documentTypeIds: string[] = [];

try {
  await app.init();
  const prisma = app.get(PrismaService);
  const sessions = app.get(AuthSessionService);
  const config = app.get(ConfigService);
  const database = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  assert.equal(database[0]?.name, expectedDatabase, 'Unexpected P08 database.');

  const origin = config.getOrThrow<string>('FRONTEND_ORIGIN');
  const cookieName = config.getOrThrow<string>('AUTH_SESSION_COOKIE_NAME');
  const server = app.getHttpServer();
  const company = await fixturePrisma.company.create({
    data: { code: `P08_${suffix}`, name: 'P08 Verification' },
  });
  companyId = company.id;

  const offices = [
    await fixturePrisma.office.create({
      data: {
        companyId: company.id,
        code: `OA_${suffix}`,
        name: 'P08 Office A',
        timezone: 'Asia/Makassar',
      },
    }),
    await fixturePrisma.office.create({
      data: {
        companyId: company.id,
        code: `OB_${suffix}`,
        name: 'P08 Office B',
        timezone: 'Asia/Jakarta',
      },
    }),
  ];
  const divisions = [
    await fixturePrisma.division.create({
      data: { companyId: company.id, code: `DA_${suffix}`, name: 'P08 Division A' },
    }),
    await fixturePrisma.division.create({
      data: { companyId: company.id, code: `DB_${suffix}`, name: 'P08 Division B' },
    }),
  ];
  const scopes = [
    await fixturePrisma.officeDivision.create({
      data: { officeId: offices[0]!.id, divisionId: divisions[0]!.id },
    }),
    await fixturePrisma.officeDivision.create({
      data: { officeId: offices[1]!.id, divisionId: divisions[1]!.id },
    }),
  ];
  const types = [
    await fixturePrisma.documentType.create({
      data: { code: `P08_TYPE_A_${suffix}`, name: 'P08 Type A' },
    }),
    await fixturePrisma.documentType.create({
      data: { code: `P08_TYPE_B_${suffix}`, name: 'P08 Type B' },
    }),
  ];
  documentTypeIds.push(...types.map((type) => type.id));
  const subtypes = [
    await fixturePrisma.documentSubtype.create({
      data: { documentTypeId: types[0]!.id, code: `P08_SUB_A_${suffix}`, name: 'P08 Subtype A' },
    }),
    await fixturePrisma.documentSubtype.create({
      data: { documentTypeId: types[1]!.id, code: `P08_SUB_B_${suffix}`, name: 'P08 Subtype B' },
    }),
  ];

  async function createEmployee(label: string, officeDivisionId: string) {
    const authUserId = randomUUID();
    const username = `p08_${label}_${suffix}`;
    const employee = await fixturePrisma.employee.create({
      data: {
        companyId: company.id,
        authUserId,
        employeeNumber: `P08_${label}_${suffix}`,
        username,
        usernameNormalized: username,
        email: `${username}@example.test`,
        emailNormalized: `${username}@example.test`,
        fullName: `P08 ${label}`,
        status: 'ACTIVE',
      },
    });
    await fixturePrisma.employeeAssignment.create({
      data: { employeeId: employee.id, officeDivisionId, active: true, isPrimary: true },
    });
    const session = await sessions.create(employee.id, authUserId, fakeSession());
    return { employee, cookieToken: session.cookieToken };
  }

  const creator = await createEmployee('Creator', scopes[0]!.id);
  const secondCreator = await createEmployee('SecondCreator', scopes[1]!.id);
  const noPermission = await createEmployee('NoPermission', scopes[0]!.id);
  const documentCreate = await fixturePrisma.permission.findUniqueOrThrow({
    where: { code: 'Document.Create' },
  });

  async function grantCreate(employeeId: string, label: string) {
    const group = await fixturePrisma.group.create({
      data: { companyId: company.id, code: `P08_${label}_${suffix}`, name: `P08 ${label}` },
    });
    await fixturePrisma.employeeGroup.create({ data: { employeeId, groupId: group.id } });
    await fixturePrisma.groupPermission.create({
      data: { groupId: group.id, permissionId: documentCreate.id, effect: 'ALLOW' },
    });
  }
  await grantCreate(creator.employee.id, 'CREATOR');
  await grantCreate(secondCreator.employee.id, 'SECOND');

  async function makeApi(cookieToken: string) {
    const csrf = await request(server).get('/api/v1/auth/csrf').set('Origin', origin).expect(200);
    const setCookie = csrf.headers['set-cookie'] as string[] | string | undefined;
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const combinedCookie = [
      ...cookies.map((cookie) => cookie.split(';')[0]!),
      `${cookieName}=${cookieToken}`,
    ].join('; ');
    return (method: 'get' | 'post' | 'patch', path: string, body?: object) => {
      const client = request(server);
      const builder = client[method](`/api/v1${path}`)
        .set('Origin', origin)
        .set('Cookie', combinedCookie)
        .set('X-CSRF-Token', csrf.body.csrfToken as string);
      return body ? builder.send(body) : builder;
    };
  }
  const creatorApi = await makeApi(creator.cookieToken);
  const secondApi = await makeApi(secondCreator.cookieToken);
  const deniedApi = await makeApi(noPermission.cookieToken);

  const created = await creatorApi('post', '/documents', {
    documentTypeId: types[0]!.id,
    documentSubtypeId: subtypes[0]!.id,
    issuerOfficeId: offices[0]!.id,
    issuerDivisionId: divisions[0]!.id,
    title: 'P08 Draft Original',
    description: 'Initial description',
  }).expect(201);
  const documentId = created.body.id as string;
  assert.equal(created.body.status, 'DRAFT');
  assert.equal(created.body.revision, 1);
  const read = await creatorApi('get', `/documents/${documentId}`).expect(200);
  assert.equal(read.body.title, 'P08 Draft Original');
  const updated = await creatorApi('patch', `/documents/${documentId}`, {
    expectedRevision: 1,
    title: 'P08 Draft Updated',
  }).expect(200);
  assert.equal(updated.body.title, 'P08 Draft Updated');
  assert.equal(updated.body.revision, 2);
  const list = await creatorApi('get', '/documents?scope=mine').expect(200);
  assert.ok(list.body.items.some((item: { id: string }) => item.id === documentId));
  const stale = await creatorApi('patch', `/documents/${documentId}`, {
    expectedRevision: 1,
    title: 'Stale update',
  }).expect(409);
  assert.equal(stale.body.code, 'DOCUMENT_REVISION_CONFLICT');
  console.log('P08-T01 PASS: permitted creator can create/read/update Draft.');

  await deniedApi('post', '/documents', {
    documentTypeId: types[0]!.id,
    documentSubtypeId: subtypes[0]!.id,
    issuerOfficeId: offices[0]!.id,
    issuerDivisionId: divisions[0]!.id,
    title: 'Denied Draft',
  }).expect(403);
  await secondApi('get', `/documents/${documentId}`).expect(404);
  await secondApi('patch', `/documents/${documentId}`, {
    expectedRevision: 2,
    title: 'Foreign edit',
  }).expect(404);
  console.log('P08-T02 PASS: unauthorized/foreign document access is denied.');

  const invalid = await creatorApi('post', '/documents', {
    documentTypeId: types[0]!.id,
    documentSubtypeId: subtypes[1]!.id,
    issuerOfficeId: offices[0]!.id,
    issuerDivisionId: divisions[0]!.id,
    title: 'Invalid Classification',
  }).expect(400);
  assert.equal(invalid.body.code, 'INVALID_DOCUMENT_CLASSIFICATION');
  console.log('P08-T03 PASS: invalid type/subtype combination rejected.');

  await fixturePrisma.document.update({
    where: { id: documentId },
    data: { status: 'PENDING_APPROVAL' },
  });
  const nonDraft = await creatorApi('patch', `/documents/${documentId}`, {
    expectedRevision: 2,
    title: 'Must not update',
  }).expect(409);
  assert.equal(nonDraft.body.code, 'DOCUMENT_NOT_DRAFT');
  console.log('P08-T04 PASS: non-Draft document cannot be modified.');
  console.log('\nP08 BACKEND VERIFICATION: PASS');
} finally {
  try {
    if (companyId) {
      await fixturePrisma.document.deleteMany({ where: { companyId } });
      await fixturePrisma.authSession.deleteMany({ where: { employee: { companyId } } });
      await fixturePrisma.groupPermission.deleteMany({ where: { group: { companyId } } });
      await fixturePrisma.employeeGroup.deleteMany({ where: { group: { companyId } } });
      await fixturePrisma.group.deleteMany({ where: { companyId } });
      await fixturePrisma.employeeAssignment.deleteMany({ where: { employee: { companyId } } });
      await fixturePrisma.employee.deleteMany({ where: { companyId } });
      await fixturePrisma.officeDivision.deleteMany({ where: { office: { companyId } } });
      await fixturePrisma.office.deleteMany({ where: { companyId } });
      await fixturePrisma.division.deleteMany({ where: { companyId } });
      await fixturePrisma.company.deleteMany({ where: { id: companyId } });
    }
    if (documentTypeIds.length > 0) {
      await fixturePrisma.documentSubtype.deleteMany({
        where: { documentTypeId: { in: documentTypeIds } },
      });
      await fixturePrisma.documentType.deleteMany({ where: { id: { in: documentTypeIds } } });
    }
  } finally {
    await fixturePrisma.$disconnect();
    await app.close();
  }
}
