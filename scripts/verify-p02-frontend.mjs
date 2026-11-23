import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'dotenv';

const root = resolve(import.meta.dirname, '..');
const evidencePath = join(root, 'docs/evidence/P02/frontend.json');
const result = {
  phaseId: 'P02',
  testId: 'P02-FE-T01',
  command: 'npm run p02:frontend',
  result: 'Frontend verification failed.',
  artifactPath: 'docs/evidence/P02/frontend.json',
  status: 'FAIL',
  checks: [],
  executedAt: new Date().toISOString(),
};

function run(script, extra = []) {
  const windows = process.platform === 'win32';
  const command = windows ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = windows
    ? ['/d', '/s', '/c', 'npm', 'run', script, ...extra]
    : ['run', script, ...extra];
  const child = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (child.error || child.status !== 0) {
    throw new Error(`${script} failed.`);
  }
  result.checks.push(`${script}: PASS`);
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

try {
  run('api:contract:check');
  run('build', ['--workspace=@surat-digital/web']);
  const env = parse(readFileSync(join(root, 'apps/api/.env')));
  const secretNames = [
    'DATABASE_URL',
    'DIRECT_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'AUTH_CSRF_SECRET_BASE64',
  ];
  const assets = filesUnder(join(root, 'apps/web/dist'))
    .filter((path) => /\.(js|css|html)$/.test(path))
    .map((path) => readFileSync(path, 'utf8'));
  if (assets.length === 0) {
    throw new Error('No browser bundle found.');
  }
  for (const name of secretNames) {
    const value = env[name];
    if (value && value.length > 12 && assets.some((asset) => asset.includes(value))) {
      throw new Error(`${name} found in browser bundle.`);
    }
  }
  if (assets.some((asset) => asset.includes('@supabase/supabase-js'))) {
    throw new Error('Direct Supabase SDK reference found in browser bundle.');
  }
  result.checks.push('Server credentials and Supabase SDK absent from browser bundle: PASS');
  result.status = 'PASS';
  result.result = 'API contract, web build and server credential isolation verification passed.';
  console.log('P02-FE-T01: PASS');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  mkdirSync(join(root, 'docs/evidence/P02'), { recursive: true });
  writeFileSync(evidencePath, JSON.stringify(result, null, 2) + '\n');
}
