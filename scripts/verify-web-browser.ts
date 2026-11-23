import { config } from 'dotenv';
config({ path: 'apps/api/.env' });
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

if (process.env.WEB_NONPROD_ACK !== 'YES' || process.env.NODE_ENV === 'production') {
  throw new Error('WEB_NONPROD_ACK=YES is required for browser integration tests.');
}
if (process.env.FRONTEND_ORIGIN !== 'http://localhost:5173') {
  throw new Error('Browser verification requires FRONTEND_ORIGIN=http://localhost:5173.');
}
if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL is required for P07 RLS browser fixtures.');
}

// The browser test opens several parallel HTTP requests. Keep the runtime role,
// but use the Supabase session pooler for a stable, isolated test connection.
const runtimeUrl = new URL(process.env.DATABASE_URL!);
if (runtimeUrl.searchParams.get('pgbouncer') === 'true' && runtimeUrl.port === '6543') {
  runtimeUrl.port = '5432';
  runtimeUrl.searchParams.delete('pgbouncer');
  process.env.DATABASE_URL = runtimeUrl.toString();
}

const { createApplication } = await import('../apps/api/src/bootstrap.js');
const { PrismaService } = await import('../apps/api/src/database/prisma.service.js');
const { createPrismaClient } = await import('../apps/api/src/database/prisma-client.js');
const { AuthSessionService } = await import('../apps/api/src/auth/auth-session.service.js');
const { PrivateFileStorage } = await import('../apps/api/src/documents/private-file-storage.js');
const prismaApp = await createApplication();
const fixturePrisma = createPrismaClient(process.env.DIRECT_URL);
let vite: Awaited<ReturnType<typeof createServer>> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let companyId: string | undefined;
let p08DocumentTypeId: string | undefined;
let p08DocumentId: string | undefined;
let registeredAuthId: string | undefined;
let adminAuthId: string | undefined;
let adminEmployeeId: string | undefined;
let registeredEmployeeId: string | undefined;
let p07OwnResourceId: string | undefined;
let p07CrossUserResourceId: string | undefined;
let p07CrossOfficeResourceId: string | undefined;
const statuses: Record<string, string> = {};
const suffix = randomBytes(5).toString('hex');

async function record(phase: string, test: () => Promise<void>) {
  await test();
  statuses[phase] = 'PASS';
  console.log(`${phase}-FE-T01: PASS`);
}

try {
  await prismaApp.listen(0, '127.0.0.1');
  const prisma = prismaApp.get(PrismaService);
  const sessions = prismaApp.get(AuthSessionService);
  const db = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  if (db[0]?.name !== process.env.WEB_EXPECTED_DATABASE_NAME) {
    throw new Error('Unexpected browser test database.');
  }
  const address = prismaApp.getHttpServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('API did not bind a port.');
  }
  const apiUrl = `http://127.0.0.1:${address.port}`;
  process.env.VITE_API_BASE_URL = '';
  vite = await createServer({
    configFile: 'apps/web/vite.config.ts',
    root: 'apps/web',
    server: { host: 'localhost', port: 5173, strictPort: true, proxy: { '/api': apiUrl } },
  });
  await vite.listen();
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined,
  });
  const context = await browser.newContext({ baseURL: process.env.FRONTEND_ORIGIN });
  const page = await context.newPage();

  await record('P01', async () => {
    await page.goto('/login');
    await page.getByRole('heading', { name: 'Masuk ke akun Anda' }).waitFor();
    assert.equal(await page.locator('nav').count(), 0);
  });

  const company = await prisma.company.create({
    data: { code: `WEB_${suffix}`, name: 'Browser Verification' },
  });
  companyId = company.id;
  const email = `web-${suffix}@example.com`;
  const password = `${randomBytes(18).toString('base64url')}Aa1!`;
  const username = `web_${suffix}`;

  await record('P05', async () => {
    await page.getByRole('link', { name: 'Daftar' }).click();
    await page.getByLabel('Kode perusahaan').fill(company.code);
    await page.getByLabel('NIP').fill(`WEB${suffix}`);
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Nama lengkap').fill('Browser User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Kata sandi').fill(password);
    await page.getByRole('button', { name: 'Kirim registrasi' }).click();
    await Promise.race([
      page.getByRole('status').filter({ hasText: 'Permintaan registrasi diterima' }).waitFor(),
      page
        .getByRole('alert')
        .waitFor()
        .then(async () => {
          throw new Error(`Registration UI: ${await page.getByRole('alert').innerText()}`);
        }),
    ]);
    await page.getByRole('status').filter({ hasText: 'Permintaan registrasi diterima' }).waitFor();
    const pending = await prisma.employee.findFirstOrThrow({
      where: { companyId: company.id, emailNormalized: email },
    });
    registeredAuthId = pending.authUserId ?? undefined;
    registeredEmployeeId = pending.id;
    assert.equal(pending.status, 'PENDING');
    await page.getByRole('link', { name: /Kembali ke login/ }).click();
    await page.getByLabel('Email, username, atau NIP').fill(username);
    await page.getByLabel('Kata sandi').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.getByRole('alert').filter({ hasText: 'tidak valid' }).waitFor();

    const provider = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const adminEmail = `admin-${suffix}@example.com`;
    const adminPassword = `${randomBytes(18).toString('base64url')}Aa1!`;
    const created = await provider.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error('Admin fixture creation failed.');
    }
    adminAuthId = created.data.user.id;
    const signedIn = await provider.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    if (signedIn.error || !signedIn.data.session) {
      throw new Error('Admin fixture login failed.');
    }
    const admin = await prisma.employee.create({
      data: {
        companyId: company.id,
        authUserId: adminAuthId,
        employeeNumber: `ADMIN${suffix}`,
        username: `admin_${suffix}`,
        usernameNormalized: `admin_${suffix}`,
        email: adminEmail,
        emailNormalized: adminEmail,
        fullName: 'Browser Administrator',
        status: 'ACTIVE',
      },
    });
    adminEmployeeId = admin.id;
    const group = await prisma.group.create({
      data: { companyId: company.id, code: `WEB_ADMIN_${suffix}`, name: 'Browser Admin' },
    });
    await prisma.employeeGroup.create({ data: { employeeId: admin.id, groupId: group.id } });
    for (const code of [
      'System.Configure',
      'User.View',
      'User.Manage',
      'Group.View',
      'Group.Manage',
      'Document.Create',
      'Document.Download',
    ]) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.groupPermission.create({
        data: { groupId: group.id, permissionId: permission.id, effect: 'ALLOW' },
      });
    }
    const session = await sessions.create(admin.id, adminAuthId, signedIn.data.session);
    await context.addCookies([
      {
        name: process.env.AUTH_SESSION_COOKIE_NAME || 'sd_session',
        value: session.cookieToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await page.goto('/users');
    await page.getByRole('heading', { name: 'Pengguna' }).waitFor();
    await page.getByText('Browser User').waitFor();
    await page.getByRole('button', { name: 'Aktifkan', exact: true }).click();
    await page.getByText('Browser User').locator('..').getByText('ACTIVE').waitFor();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');
    sheet.addRow(['nip', 'username', 'email', 'nama']);
    sheet.addRow([`IMP${suffix}`, `imp_${suffix}`, `imp-${suffix}@example.com`, 'Imported User']);
    sheet.addRow([`IMP${suffix}`, `imp_${suffix}`, `imp-${suffix}@example.com`, 'Duplicate User']);
    await page.locator('input[type=file]').setInputFiles({
      name: 'users.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    });
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await page
      .getByRole('status')
      .filter({ hasText: '1 pengguna diimpor. 1 baris gagal' })
      .waitFor();

    await page.getByRole('link', { name: 'Organisasi' }).click();
    await page.getByRole('heading', { name: 'Organisasi' }).waitFor();
    await page
      .getByRole('heading', { name: 'Kantor', exact: true })
      .locator('..')
      .getByLabel('code')
      .fill(`OFF${suffix}`);
    await page
      .getByRole('heading', { name: 'Kantor', exact: true })
      .locator('..')
      .getByLabel('name')
      .fill('Browser Office');
    await page
      .getByRole('heading', { name: 'Kantor', exact: true })
      .locator('..')
      .getByLabel('timezone')
      .fill('Asia/Jakarta');
    const officeResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/organization/offices' &&
        response.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await page
      .getByRole('heading', { name: 'Kantor', exact: true })
      .locator('..')
      .getByRole('button', { name: 'Tambah' })
      .click();
    const createdOffice = await officeResponse;
    assert.equal(createdOffice.status(), 201, await createdOffice.text());
    await page.getByText('Browser Office').waitFor();

    await page.getByRole('link', { name: 'Profil Saya' }).click();
    await page.getByLabel('Nama lengkap').fill('Updated Browser Admin');
    await page.getByRole('button', { name: 'Simpan profil' }).click();
    await page.getByRole('status').filter({ hasText: 'Profil tersimpan' }).waitFor();
  });

  if (!companyId || !adminEmployeeId || !registeredEmployeeId) {
    throw new Error('P07 browser fixtures require P05 employee/company fixtures.');
  }
  const p07PrimaryOffice = await prisma.office.findFirstOrThrow({
    where: { companyId, code: `OFF${suffix}` },
  });
  const p07SecondaryOffice = await prisma.office.create({
    data: {
      companyId,
      code: `P07B${suffix}`,
      name: 'P07 Secondary Office',
      timezone: 'Asia/Makassar',
    },
  });
  const p07Division = await prisma.division.create({
    data: { companyId, code: `P07D${suffix}`, name: 'P07 Browser Division' },
  });
  const [p07OfficeDivisionA, p07OfficeDivisionB] = await Promise.all([
    prisma.officeDivision.create({
      data: { officeId: p07PrimaryOffice.id, divisionId: p07Division.id },
    }),
    prisma.officeDivision.create({
      data: { officeId: p07SecondaryOffice.id, divisionId: p07Division.id },
    }),
  ]);
  await Promise.all([
    prisma.employeeAssignment.create({
      data: {
        employeeId: adminEmployeeId,
        officeDivisionId: p07OfficeDivisionA.id,
        isPrimary: true,
        active: true,
      },
    }),
    prisma.employeeAssignment.create({
      data: {
        employeeId: registeredEmployeeId,
        officeDivisionId: p07OfficeDivisionB.id,
        isPrimary: true,
        active: true,
      },
    }),
  ]);
  p07OwnResourceId = (
    await fixturePrisma.rlsPocResource.create({
      data: {
        ownerEmployeeId: adminEmployeeId,
        officeId: p07PrimaryOffice.id,
        label: 'P07 Admin Own Resource',
      },
    })
  ).id;
  p07CrossUserResourceId = (
    await fixturePrisma.rlsPocResource.create({
      data: {
        ownerEmployeeId: registeredEmployeeId,
        officeId: p07SecondaryOffice.id,
        label: 'P07 Other User Resource',
      },
    })
  ).id;
  p07CrossOfficeResourceId = (
    await fixturePrisma.rlsPocResource.create({
      data: {
        ownerEmployeeId: adminEmployeeId,
        officeId: p07SecondaryOffice.id,
        label: 'P07 Foreign Office Resource',
      },
    })
  ).id;

  const p08DocumentType = await fixturePrisma.documentType.create({
    data: { code: `WEB_DOC_${suffix}`, name: 'Browser Document Type' },
  });
  p08DocumentTypeId = p08DocumentType.id;
  const p08DocumentSubtype = await fixturePrisma.documentSubtype.create({
    data: {
      documentTypeId: p08DocumentType.id,
      code: `WEB_SUB_${suffix}`,
      name: 'Browser Document Subtype',
    },
  });

  await record('P06', async () => {
    await page.getByRole('link', { name: 'Group Policy' }).click();
    await page.getByRole('heading', { name: 'Group Policy' }).waitFor();
    await page.getByPlaceholder('Kode').fill(`WEB_GROUP_${suffix}`);
    await page.getByPlaceholder('Nama').fill('Browser Group');
    await page.getByRole('button', { name: 'Tambah' }).click();
    await page.getByRole('button', { name: /Browser Group/ }).waitFor();
    await page.getByRole('button', { name: /Browser Group/ }).click();
    const detail = page.locator('.panel').filter({
      has: page.getByRole('heading', { name: /Browser Group/ }),
    });
    await detail.waitFor();
    await detail.getByLabel('Cari karyawan berdasarkan nama atau NIP').fill(`ADMIN${suffix}`);
    try {
      await detail.getByRole('button', { name: /NIP ADMIN/ }).click({ timeout: 10_000 });
    } catch (error) {
      throw new Error(
        `P06 member search result missing: ${(await detail.innerText()).slice(0, 1200)}`,
        { cause: error },
      );
    }
    await detail.getByRole('button', { name: 'Tambah anggota' }).click();
    await detail.getByText(`NIP ADMIN${suffix}`).waitFor();
    await detail.getByRole('checkbox', { name: /User.View/ }).check();
    await detail.getByRole('checkbox', { name: /Group.View/ }).check();
    await detail.getByRole('radio', { name: 'Deny' }).check();
    await detail.getByRole('button', { name: 'Simpan 2 izin' }).click();
    await page.getByText('User.View: DENY').waitFor();
    await page.getByText('Group.View: DENY').waitFor();
    await page.getByText('User.Manage: ALLOW').waitFor();
  });

  await record('P07', async () => {
    if (!p07OwnResourceId || !p07CrossUserResourceId || !p07CrossOfficeResourceId) {
      throw new Error('P07 browser resource fixtures were not created.');
    }

    async function fetchProbe(targetPage: typeof page, resourceId: string) {
      return targetPage.evaluate(async (id) => {
        const response = await fetch(`/api/v1/rls-poc/resources/${id}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        return { status: response.status, body: await response.text() };
      }, resourceId);
    }

    const own = await fetchProbe(page, p07OwnResourceId);
    assert.equal(own.status, 200, own.body);
    assert.match(own.body, /P07 Admin Own Resource/);

    const crossUser = await fetchProbe(page, p07CrossUserResourceId);
    assert.equal(crossUser.status, 403, crossUser.body);
    assert.doesNotMatch(crossUser.body, /P07 Other User Resource/);

    const crossOffice = await fetchProbe(page, p07CrossOfficeResourceId);
    assert.equal(crossOffice.status, 403, crossOffice.body);
    assert.doesNotMatch(crossOffice.body, /P07 Foreign Office Resource/);
    assert.equal(await page.getByText('P07 Other User Resource').count(), 0);
    assert.equal(await page.getByText('P07 Foreign Office Resource').count(), 0);

    const limitedContext = await browser!.newContext({ baseURL: process.env.FRONTEND_ORIGIN });
    const limitedPage = await limitedContext.newPage();
    try {
      await limitedPage.goto('/login');
      await limitedPage.getByLabel('Email, username, atau NIP').fill(username);
      await limitedPage.getByLabel('Kata sandi').fill(password);
      await limitedPage.getByRole('button', { name: 'Masuk' }).click();
      await limitedPage.getByRole('heading', { name: /Selamat datang, Browser User/ }).waitFor();

      await limitedPage.goto('/users');
      await limitedPage.getByRole('heading', { name: '403 — Akses Ditolak' }).waitFor();
      assert.match(limitedPage.url(), /\/forbidden$/);

      const limitedOwn = await fetchProbe(limitedPage, p07CrossUserResourceId);
      assert.equal(limitedOwn.status, 200, limitedOwn.body);
      assert.match(limitedOwn.body, /P07 Other User Resource/);

      const limitedCrossUser = await fetchProbe(limitedPage, p07OwnResourceId);
      assert.equal(limitedCrossUser.status, 403, limitedCrossUser.body);
      assert.doesNotMatch(limitedCrossUser.body, /P07 Admin Own Resource/);
      assert.equal(await limitedPage.getByText('P07 Admin Own Resource').count(), 0);
    } finally {
      await limitedContext.close();
    }
  });

  await record('P08', async () => {
    await page.goto('/documents/new');
    await page.getByRole('heading', { name: 'Buat Dokumen' }).waitFor();
    await page.getByLabel('Jenis dokumen', { exact: true }).waitFor();
    await page.getByLabel('Jenis dokumen', { exact: true }).selectOption(p08DocumentType.id);
    await page.getByLabel('Subjenis dokumen', { exact: true }).selectOption(p08DocumentSubtype.id);
    const issuer = page.getByLabel('Kantor dan divisi penerbit');
    assert.ok((await issuer.locator('option').count()) > 1, 'P08 creator needs an issuer scope.');
    await issuer.selectOption({ index: 1 });
    await page.getByLabel('Judul dokumen').fill('Browser P08 Draft');
    await page
      .getByLabel('Deskripsi dokumen')
      .fill('Draft dibuat melalui browser integration test.');

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/documents') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Buat Draft' }).click();
    const created = await createResponse;
    assert.equal(created.status(), 201, await created.text());
    const createdBody = (await created.json()) as { id: string; revision: number; status: string };
    p08DocumentId = createdBody.id;
    assert.equal(createdBody.status, 'DRAFT');
    assert.equal(createdBody.revision, 1);
    await page.getByRole('heading', { name: 'Edit Draft' }).waitFor();
    await page.getByLabel('Judul dokumen').fill('Browser P08 Draft Updated');

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/documents/${createdBody.id}`) &&
        response.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Simpan perubahan' }).click();
    const updated = await updateResponse;
    assert.equal(updated.status(), 200, await updated.text());
    const updatedBody = (await updated.json()) as { title: string; revision: number };
    assert.equal(updatedBody.title, 'Browser P08 Draft Updated');
    assert.equal(updatedBody.revision, 2);

    await page.goto('/documents');
    await page.getByRole('heading', { name: 'Dokumen Saya' }).waitFor();
    await page.getByText('Browser P08 Draft Updated').waitFor();
    await page.getByText(createdBody.id).waitFor();
    console.log('P08-FE-T01 create/read/update Draft via browser: PASS');
  });

  await record('P09', async () => {
    assert.ok(p08DocumentId);
    const bytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    await page.goto(`/documents/${p08DocumentId}/edit`);
    await page.getByLabel('Pilih satu file').setInputFiles({
      name: 'browser-p09.pdf',
      mimeType: 'application/pdf',
      buffer: bytes,
    });
    const uploadResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/documents/${p08DocumentId}/files/upload`) &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Unggah file' }).click();
    const uploaded = await uploadResponse;
    assert.equal(uploaded.status(), 201, await uploaded.text());
    const metadata = (await uploaded.json()) as {
      id: string;
      sha256: string;
      processingStatus: string;
    };
    assert.equal(metadata.sha256, sha256);
    assert.equal(metadata.processingStatus, 'UPLOADED');
    assert.doesNotMatch(JSON.stringify(metadata), /pathname|blob\.vercel-storage\.com/i);
    await page.getByText('browser-p09.pdf').waitFor();
    await page.getByText(`SHA-256: ${sha256}`).waitFor();

    const stored = await fixturePrisma.documentFile.findUniqueOrThrow({
      where: { id: metadata.id },
      include: { storageObject: true, version: true },
    });
    assert.equal(stored.version.documentId, p08DocumentId);
    assert.equal(stored.storageObject.sha256, sha256);
    assert.equal(stored.storageObject.accessMode, 'PRIVATE');

    await page.getByLabel('Pilih satu file').setInputFiles({
      name: 'lampiran-p09.pdf',
      mimeType: 'application/pdf',
      buffer: bytes,
    });
    const attachmentResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/documents/${p08DocumentId}/files/upload`) &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Unggah file' }).click();
    const attachment = await attachmentResponse;
    assert.equal(attachment.status(), 201, await attachment.text());
    const attachmentBody = (await attachment.json()) as {
      id: string;
      fileRole: string;
      documentVersionId: string;
    };
    assert.equal(attachmentBody.fileRole, 'ATTACHMENT');
    assert.equal(attachmentBody.documentVersionId, stored.documentVersionId);
    assert.notEqual(attachmentBody.id, metadata.id);
    await page.getByText('lampiran-p09.pdf').waitFor();
    await page.getByLabel('Judul dokumen').fill('Browser P09 Draft with Files');
    const updateAfterUpload = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/documents/${p08DocumentId}`) &&
        response.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Simpan perubahan' }).click();
    const updatedAfterUpload = await updateAfterUpload;
    assert.equal(updatedAfterUpload.status(), 200, await updatedAfterUpload.text());
    assert.equal(((await updatedAfterUpload.json()) as { revision: number }).revision, 5);

    const downloadPath = `/api/v1/documents/${p08DocumentId}/files/${metadata.id}/download`;
    const probe = await page.evaluate(async (path) => {
      const authorized = await fetch(path, { credentials: 'include', cache: 'no-store' });
      const data = await authorized.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', data);
      const hash = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      const unauthorized = await fetch(path, { credentials: 'omit', cache: 'no-store' });
      return { status: authorized.status, hash, unauthorizedStatus: unauthorized.status };
    }, downloadPath);
    assert.equal(probe.status, 200);
    assert.equal(probe.hash, sha256);
    assert.ok([401, 403, 404].includes(probe.unauthorizedStatus));
    const rejected = await page.evaluate(async (documentId) => {
      const csrfResponse = await fetch('/api/v1/auth/csrf', { credentials: 'include' });
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const cases = [
        { name: 'wrong.exe', mime: 'application/pdf', bytes: '%PDF-1.4\n%%EOF' },
        { name: 'wrong.pdf', mime: 'application/msword', bytes: '%PDF-1.4\n%%EOF' },
        { name: 'wrong.pdf', mime: 'application/pdf', bytes: 'not really a pdf' },
      ];
      return Promise.all(
        cases.map(async ({ name, mime, bytes }) => {
          const form = new FormData();
          form.append('file', new File([bytes], name, { type: mime }));
          form.append('fileRole', 'ATTACHMENT');
          const response = await fetch(`/api/v1/documents/${documentId}/files/upload`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'X-CSRF-Token': csrfToken },
            body: form,
          });
          const body = (await response.json()) as { code?: string };
          return { status: response.status, code: body.code };
        }),
      );
    }, p08DocumentId);
    assert.deepEqual(
      rejected.map(({ status, code }) => ({ status, code })),
      [
        { status: 400, code: 'FILE_EXTENSION_UNSUPPORTED' },
        { status: 400, code: 'FILE_MIME_MISMATCH' },
        { status: 400, code: 'FILE_SIGNATURE_MISMATCH' },
      ],
    );

    const otherContext = await browser!.newContext({ baseURL: process.env.FRONTEND_ORIGIN });
    try {
      const otherPage = await otherContext.newPage();
      await otherPage.goto('/login');
      await otherPage.getByLabel('Email, username, atau NIP').fill(username);
      await otherPage.getByLabel('Kata sandi').fill(password);
      await otherPage.getByRole('button', { name: 'Masuk' }).click();
      await otherPage.getByRole('heading', { name: /Selamat datang, Browser User/ }).waitFor();
      const crossUser = await otherPage.evaluate(
        async (path) => (await fetch(path, { credentials: 'include', cache: 'no-store' })).status,
        downloadPath,
      );
      assert.ok(
        [403, 404].includes(crossUser),
        `Expected unauthorized download to return 403/404, received ${crossUser}`,
      );
    } finally {
      await otherContext.close();
    }
    const preview = await page.evaluate(
      async (path) => (await fetch(path, { credentials: 'include' })).status,
      `/api/v1/documents/${p08DocumentId}/files/${metadata.id}/preview`,
    );
    assert.equal(preview, 409);
    console.log('P09-FE-T01 private upload, metadata, hash, and unauthorized access: PASS');
  });

  await record('P04', async () => {
    const noCsrf = await page.evaluate(async () => {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      return response.status;
    });
    assert.equal(noCsrf, 403);
    const hostile = await context.newPage();
    await hostile.goto('data:text/html,<html><body>Hostile origin</body></html>');
    const blocked = await hostile.evaluate(async (url) => {
      try {
        await fetch(url, { credentials: 'include' });
        return false;
      } catch {
        return true;
      }
    }, `${apiUrl}/api/v1/auth/me`);
    assert.equal(blocked, true);
    await hostile.close();
  });

  await record('P03', async () => {
    await page.getByRole('button', { name: 'Keluar' }).click();
    await page.getByRole('heading', { name: 'Masuk ke akun Anda' }).waitFor();
    await page.getByLabel('Email, username, atau NIP').fill(username);
    await page.getByLabel('Kata sandi').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.getByRole('heading', { name: /Selamat datang, Browser User/ }).waitFor();
    const refresh = await page.evaluate(async () => {
      const csrf = await fetch('/api/v1/auth/csrf', { credentials: 'include' }).then((r) =>
        r.json(),
      );
      return fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrf.csrfToken },
      }).then((r) => r.status);
    });
    assert.equal(refresh, 200);
    await page.reload();
    await page.getByRole('heading', { name: /Selamat datang, Browser User/ }).waitFor();
    await page.getByRole('button', { name: 'Keluar' }).click();
    await page.getByRole('heading', { name: 'Masuk ke akun Anda' }).waitFor();
  });

  await context.close();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    if (companyId) {
      const prisma = prismaApp.get(PrismaService);
      const storage = prismaApp.get(PrivateFileStorage);
      const objects = await fixturePrisma.storageObject.findMany({
        where: { companyId },
        select: { id: true, provider: true, pathname: true },
      });
      await fixturePrisma.documentFile.deleteMany({
        where: { version: { document: { companyId } } },
      });
      await fixturePrisma.documentVersion.deleteMany({ where: { document: { companyId } } });
      await fixturePrisma.storageObject.deleteMany({ where: { companyId } });
      for (const object of objects) {
        await storage.remove(object);
      }
      await fixturePrisma.document.deleteMany({ where: { companyId } });
      if (p07OwnResourceId || p07CrossUserResourceId || p07CrossOfficeResourceId) {
        await fixturePrisma.rlsPocResource.deleteMany({
          where: {
            id: {
              in: [p07OwnResourceId, p07CrossUserResourceId, p07CrossOfficeResourceId].filter(
                (value): value is string => Boolean(value),
              ),
            },
          },
        });
      }
      await prisma.authSession.deleteMany({ where: { employee: { companyId } } });
      await prisma.groupPermission.deleteMany({ where: { group: { companyId } } });
      await prisma.employeeGroup.deleteMany({ where: { group: { companyId } } });
      await prisma.group.deleteMany({ where: { companyId } });
      await prisma.employeeAssignment.deleteMany({ where: { employee: { companyId } } });
      await prisma.officeDivision.deleteMany({ where: { office: { companyId } } });
      await prisma.office.deleteMany({ where: { companyId } });
      await prisma.division.deleteMany({ where: { companyId } });
      await prisma.jobTitle.deleteMany({ where: { companyId } });
      await prisma.employee.deleteMany({ where: { companyId } });
      await prisma.company.delete({ where: { id: companyId } });
    }
    if (p08DocumentTypeId) {
      await fixturePrisma.documentSubtype.deleteMany({
        where: { documentTypeId: p08DocumentTypeId },
      });
      await fixturePrisma.documentType.delete({ where: { id: p08DocumentTypeId } });
    }
    if (registeredAuthId || adminAuthId) {
      const auth = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      if (registeredAuthId) {
        await auth.auth.admin.deleteUser(registeredAuthId);
      }
      if (adminAuthId) {
        await auth.auth.admin.deleteUser(adminAuthId);
      }
    }
  } finally {
    await browser?.close();
    await vite?.close();
    await prismaApp.close();
    await fixturePrisma.$disconnect();
    for (const phase of ['P01', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09']) {
      const status = statuses[phase] === 'PASS' ? 'PASS' : 'FAIL';
      const artifactPath = `docs/evidence/${phase}/frontend.json`;
      await mkdir(`docs/evidence/${phase}`, { recursive: true });
      await writeFile(
        `docs/evidence/${phase}/frontend.json`,
        JSON.stringify(
          {
            phaseId: phase,
            testId: `${phase}-FE-T01`,
            status,
            command: 'npm run web:verify:browser',
            result:
              status === 'PASS'
                ? 'Chromium browser verification against actual NestJS API passed.'
                : 'Browser verification failed.',
            artifactPath,
            kind: 'Chromium browser + actual NestJS API + non-production database',
            executedAt: new Date().toISOString(),
          },
          null,
          2,
        ) + '\n',
      );
    }
  }
}
