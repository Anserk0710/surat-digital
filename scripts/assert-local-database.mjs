import fs from 'node:fs';
import path from 'node:path';

const envPaths = [
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key] && val) {
          process.env[key] = val;
        }
      }
    }
  }
}

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const isLocal =
  dbUrl.includes('localhost') ||
  dbUrl.includes('127.0.0.1') ||
  dbUrl.includes('host.docker.internal');

if (!isLocal) {
  console.error('\n[Safety Check] db:reset:local cannot be run against non-local database!');
  console.error(
    `Current target database appears to be remote: ${dbUrl.replace(/:[^:@]+@/, ':***@')}\n`,
  );
  process.exit(1);
}
