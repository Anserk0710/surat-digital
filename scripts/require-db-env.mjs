import fs from 'node:fs';
import path from 'node:path';

// Load .env from apps/api/.env or root .env if exists
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

const requiredKeys = process.argv.slice(2);
const missing = [];

for (const key of requiredKeys) {
  if (!process.env[key] || process.env[key].trim() === '') {
    missing.push(key);
  }
}

if (missing.length > 0) {
  console.error('\n[Error] Missing required environment variable(s):');
  for (const m of missing) {
    console.error(`  - ${m}`);
  }
  console.error('\nPlease define them in apps/api/.env or system environment variables.\n');
  process.exit(1);
}
