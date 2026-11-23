import 'dotenv/config';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Session } from '@supabase/supabase-js';
import request from 'supertest';
import { AuthSessionService } from '../src/auth/auth-session.service.js';
import { createApplication } from '../src/bootstrap.js';
import { createPrismaClient } from '../src/database/prisma-client.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { PrivateFileStorage } from '../src/documents/private-file-storage.js';

if (process.env.P09_NONPROD_ACK !== 'YES' || process.env.NODE_ENV === 'production') {
  throw new Error('P09 verifier requires P09_NONPROD_ACK=YES and non-production environment.');
}
const expectedDatabase = process.env.P09_EXPECTED_DATABASE_NAME;
const directUrl = process.env.DIRECT_URL;
if (!expectedDatabase || !directUrl) {
  throw new Error('P09_EXPECTED_DATABASE_NAME and DIRECT_URL are required.');
}
process.env.FILE_STORAGE_DRIVER = 'local';

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
let documentTypeId: string | undefined;
try {
  await app.init();
  const prisma = app.get(PrismaService);
  const sessions = app.get(AuthSessionService);
  const config = app.get(ConfigService);
  // Check both connections before creating any fixture.
  for (const client of [prisma, fixturePrisma]) {
    const [database] = await client.$queryRaw<
      Array<{ name: string }>
    >`SELECT current_database() AS name`;
    assert.equal(database?.name, expectedDatabase, 'Unexpected P09 verification database.');
  }
  const origin = config.getOrThrow<string>('FRONTEND_ORIGIN');
  const cookieName = config.getOrThrow<string>('AUTH_SESSION_COOKIE_NAME');
  const server = app.getHttpServer();
  const company = await fixturePrisma.company.create({
    data: { code: `P09_${suffix}`, name: 'P09 Verification' },
  });
  companyId = company.id;
  const office = await fixturePrisma.office.create({
    data: { companyId, code: `P09_OFF_${suffix}`, name: 'P09 Office', timezone: 'Asia/Makassar' },
  });
  const division = await fixturePrisma.division.create({
    data: { companyId, code: `P09_DIV_${suffix}`, name: 'P09 Division' },
  });
  const officeDivision = await fixturePrisma.officeDivision.create({
    data: { officeId: office.id, divisionId: division.id },
  });
  const documentType = await fixturePrisma.documentType.create({
    data: { code: `P09_TYPE_${suffix}`, name: 'P09 Type' },
  });
  documentTypeId = documentType.id;
  const documentSubtype = await fixturePrisma.documentSubtype.create({
    data: { documentTypeId, code: `P09_SUB_${suffix}`, name: 'P09 Subtype' },
  });

  async function createEmployee(label: string) {
    const authUserId = randomUUID();
    const username = `p09_${label.toLowerCase()}_${suffix}`;
    const employee = await fixturePrisma.employee.create({
      data: {
        companyId: company.id,
        authUserId,
        employeeNumber: `P09_${label}_${suffix}`,
        username,
        usernameNormalized: username,
        email: `${username}@example.test`,
        emailNormalized: `${username}@example.test`,
        fullName: `P09 ${label}`,
        status: 'ACTIVE',
      },
    });
    await fixturePrisma.employeeAssignment.create({
      data: {
        employeeId: employee.id,
        officeDivisionId: officeDivision.id,
        active: true,
        isPrimary: true,
      },
    });
    const session = await sessions.create(employee.id, authUserId, fakeSession());
    return { employee, cookieToken: session.cookieToken };
  }
  async function addPermission(groupId: string, code: string) {
    const permission = await fixturePrisma.permission.findUniqueOrThrow({ where: { code } });
    await fixturePrisma.groupPermission.create({
      data: { groupId, permissionId: permission.id, effect: 'ALLOW' },
    });
  }
  async function grantPermissions(employeeId: string, label: string, codes: string[]) {
    const group = await fixturePrisma.group.create({
      data: { companyId: company.id, code: `P09_${label}_${suffix}`, name: `P09 ${label}` },
    });
    await fixturePrisma.employeeGroup.create({ data: { employeeId, groupId: group.id } });
    for (const code of codes) {
      await addPermission(group.id, code);
    }
    return group;
  }
  async function makeApi(cookieToken: string) {
    const csrf = await request(server).get('/api/v1/auth/csrf').set('Origin', origin).expect(200);
    const setCookie = csrf.headers['set-cookie'] as string[] | string | undefined;
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const cookie = [
      ...cookies.map((item) => item.split(';')[0]!),
      `${cookieName}=${cookieToken}`,
    ].join('; ');
    return {
      get(path: string) {
        return request(server).get(`/api/v1${path}`).set('Origin', origin).set('Cookie', cookie);
      },
      upload(
        path: string,
        options: { filename: string; mime: string; bytes: Buffer; role?: 'MAIN' | 'ATTACHMENT' },
      ) {
        return request(server)
          .post(`/api/v1${path}`)
          .set('Origin', origin)
          .set('Cookie', cookie)
          .set('X-CSRF-Token', csrf.body.csrfToken as string)
          .field('fileRole', options.role ?? 'ATTACHMENT')
          .attach('file', options.bytes, { filename: options.filename, contentType: options.mime });
      },
    };
  }
  const owner = await createEmployee('Owner');
  const viewer = await createEmployee('Viewer');
  const scopedDownloader = await createEmployee('ScopedDownloader');
  const allDownloader = await createEmployee('AllDownloader');
  const ownerGroup = await grantPermissions(owner.employee.id, 'OWNER', ['Document.Create']);
  const viewerGroup = await grantPermissions(viewer.employee.id, 'VIEWER', ['Document.ViewAll']);
  await grantPermissions(scopedDownloader.employee.id, 'SCOPED_DOWNLOAD', ['Document.Download']);
  await grantPermissions(allDownloader.employee.id, 'ALL_DOWNLOAD', ['Document.DownloadAll']);
  const document = await fixturePrisma.document.create({
    data: {
      companyId,
      documentTypeId,
      documentSubtypeId: documentSubtype.id,
      creatorEmployeeId: owner.employee.id,
      issuerOfficeId: office.id,
      issuerDivisionId: division.id,
      title: 'P09 Security Verification',
      status: 'DRAFT',
    },
  });
  const ownerApi = await makeApi(owner.cookieToken);
  const viewerApi = await makeApi(viewer.cookieToken);
  const scopedApi = await makeApi(scopedDownloader.cookieToken);
  const allApi = await makeApi(allDownloader.cookieToken);
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
  const expectedSha256 = createHash('sha256').update(pdf).digest('hex');
  const uploadPath = `/documents/${document.id}/files/upload`;
  const uploaded = await ownerApi
    .upload(uploadPath, {
      filename: 'p09-main.pdf',
      mime: 'application/pdf',
      bytes: pdf,
      role: 'MAIN',
    })
    .expect(201);
  const fileId = uploaded.body.id as string;
  assert.equal(uploaded.body.sha256, expectedSha256);
  assert.equal(uploaded.body.processingStatus, 'UPLOADED');
  assert.doesNotMatch(JSON.stringify(uploaded.body), /pathname|blob\.vercel-storage\.com/i);
  const stored = await fixturePrisma.documentFile.findUniqueOrThrow({
    where: { id: fileId },
    include: { storageObject: true, version: true },
  });
  assert.equal(stored.version.documentId, document.id);
  assert.equal(stored.storageObject.accessMode, 'PRIVATE');
  assert.equal(stored.storageObject.sha256, expectedSha256);
  console.log('P09-T01: PASS - private metadata and SHA-256 stored.');
  for (const [filename, mime, bytes, code] of [
    ['wrong.exe', 'application/pdf', pdf, 'FILE_EXTENSION_UNSUPPORTED'],
    ['wrong.pdf', 'application/msword', pdf, 'FILE_MIME_MISMATCH'],
    ['wrong.pdf', 'application/pdf', Buffer.from('this is not a PDF'), 'FILE_SIGNATURE_MISMATCH'],
  ] as const) {
    const result = await ownerApi.upload(uploadPath, { filename, mime, bytes });
    assert.equal(result.status, 400);
    assert.equal(result.body.code, code);
  }
  console.log('P09-T02: PASS - extension/MIME/signature mismatch rejected.');
  const downloadPath = `/documents/${document.id}/files/${fileId}/download`;
  await ownerApi.get(downloadPath).expect(403);
  await viewerApi.get(`/documents/${document.id}`).expect(200);
  await viewerApi.get(downloadPath).expect(403);
  await scopedApi.get(`/documents/${document.id}`).expect(404);
  await scopedApi.get(downloadPath).expect(404);
  await allApi.get(`/documents/${document.id}`).expect(404);
  const allDownload = await allApi.get(downloadPath).expect(200);
  assert.ok(Buffer.isBuffer(allDownload.body));
  assert.equal(
    createHash('sha256')
      .update(allDownload.body as Buffer)
      .digest('hex'),
    expectedSha256,
  );
  // A download transaction must not leak scope into later metadata/list/preview reads.
  await allApi.get(`/documents/${document.id}`).expect(404);
  await allApi.get(`/documents/${document.id}/files`).expect(404);
  await allApi.get(`/documents/${document.id}/files/${fileId}/preview`).expect(404);
  await request(server).get(`/api/v1${downloadPath}`).set('Origin', origin).expect(401);
  console.log('P09-T03: PASS - download authorization matrix enforced.');
  await addPermission(ownerGroup.id, 'Document.Download');
  const downloaded = await ownerApi.get(downloadPath).expect(200);
  assert.ok(Buffer.isBuffer(downloaded.body));
  assert.equal(
    createHash('sha256')
      .update(downloaded.body as Buffer)
      .digest('hex'),
    expectedSha256,
  );
  await addPermission(viewerGroup.id, 'Document.Download');
  await viewerApi.get(downloadPath).expect(200);
  console.log('P09-T04: PASS - downloaded hash equals stored metadata.');
  console.log('\nP09 BACKEND VERIFICATION: PASS');
} finally {
  try {
    if (companyId) {
      const storage = app.get(PrivateFileStorage);
      const objects = await fixturePrisma.storageObject.findMany({
        where: { companyId },
        select: { provider: true, pathname: true },
      });
      await fixturePrisma.documentFile.deleteMany({
        where: { version: { document: { companyId } } },
      });
      await fixturePrisma.documentVersion.deleteMany({ where: { document: { companyId } } });
      await fixturePrisma.storageObject.deleteMany({ where: { companyId } });
      for (const object of objects) {
        await storage.remove(object).catch(() => undefined);
      }
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
    if (documentTypeId) {
      await fixturePrisma.documentSubtype.deleteMany({ where: { documentTypeId } });
      await fixturePrisma.documentType.deleteMany({ where: { id: documentTypeId } });
    }
  } finally {
    await fixturePrisma.$disconnect();
    await app.close();
  }
}
