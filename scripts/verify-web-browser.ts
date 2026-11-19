import { config } from 'dotenv';
config({ path: 'apps/api/.env' });
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
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
const prismaApp = await createApplication();
const fixturePrisma = createPrismaClient(process.env.DIRECT_URL);
let vite: Awaited<ReturnType<typeof createServer>> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let companyId: string | undefined;
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
        response.url().endsWith('/api/v1/organization/offices') &&
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
    await detail.getByPlaceholder('ID karyawan').fill(adminEmployeeId!);
    await detail.getByRole('button', { name: 'Tambah' }).click();
    await detail.getByText(adminEmployeeId!).waitFor();
    await detail.locator('select[name=permissionCode]').selectOption('User.View');
    await detail.locator('select[name=effect]').selectOption('DENY');
    await detail.getByRole('button', { name: 'Simpan izin' }).click();
    await page.getByText('User.View: DENY').waitFor();
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
    for (const phase of ['P01', 'P03', 'P04', 'P05', 'P06', 'P07']) {
      await mkdir(`docs/evidence/${phase}`, { recursive: true });
      await writeFile(
        `docs/evidence/${phase}/frontend.json`,
        JSON.stringify(
          {
            test: `${phase}-FE-T01`,
            status: statuses[phase] ?? 'FAIL',
            kind: 'Chromium browser + actual NestJS API + non-production database',
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ) + '\n',
      );
    }
  }
}
