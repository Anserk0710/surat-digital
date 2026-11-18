import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';

const evidencePath = 'docs/evidence/P01/frontend-smoke.json';
const result = {
  test: 'P01-FE-T01',
  status: 'FAIL',
  mode: 'No backend required',
  timestamp: new Date().toISOString(),
};
let server;
let browser;

try {
  process.env.VITE_API_BASE_URL = '';
  server = await createServer({
    configFile: 'apps/web/vite.config.ts',
    root: 'apps/web',
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  const baseURL = server.resolvedUrls?.local?.[0];
  if (!baseURL) {
    throw new Error('Vite did not provide a local URL.');
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined,
  });
  const page = await browser.newPage({ baseURL });
  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/login');
  await page.getByRole('heading', { name: 'Masuk ke akun Anda' }).waitFor();
  mkdirSync('docs/evidence/P01', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/P01/login.png', fullPage: true });
  await page.goto('/register');
  await page.getByRole('heading', { name: 'Registrasi karyawan' }).waitFor();
  await page.screenshot({ path: 'docs/evidence/P01/register.png', fullPage: true });
  result.status = 'PASS';
  console.log('P01-FE-T01 isolated route smoke: PASS');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
  mkdirSync('docs/evidence/P01', { recursive: true });
  writeFileSync(evidencePath, JSON.stringify(result, null, 2) + '\n');
}
