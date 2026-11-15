/**
 * migrate-create.mjs
 *
 * Workaround for Supabase hosted PostgreSQL: the database user does not have
 * permission to CREATE DATABASE, so `prisma migrate dev --create-only` fails
 * with P3014 (shadow database) or P3025 (same database detected).
 *
 * This script replicates the same outcome using `prisma migrate diff`:
 *   1. Reads --name <migration-name> from CLI args
 *   2. Generates a timestamp-prefixed migration folder
 *   3. Runs `prisma migrate diff --from-config-datasource --to-schema ...`
 *      to produce the SQL diff (no shadow database needed)
 *   4. Writes the SQL to prisma/migrations/<timestamp>_<name>/migration.sql
 *
 * Usage (via npm script):
 *   npm --workspace apps/api run db:migrate:create -- --name <migration-name>
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── Parse --name argument ─────────────────────────────────────────────────────
// npm --workspace does not forward `-- --name foo` args to the child script.
// Fallback: npm sets npm_config_<flag>=<value> when you pass --flag=value
// directly to `npm run`, e.g.: npm run db:migrate:create --name=my_migration
const args = process.argv.slice(2);
const nameIdx = args.indexOf('--name');
const rawName =
  (nameIdx !== -1 && args[nameIdx + 1]) ||
  process.env.npm_config_name ||
  process.env.MIGRATION_NAME;

if (!rawName) {
  console.error(
    'Error: migration name is required.\n\n' +
      'Usage options:\n' +
      '  npm --workspace apps/api run db:migrate:create --name=<migration-name>\n' +
      '  MIGRATION_NAME=<migration-name> npm --workspace apps/api run db:migrate:create',
  );
  process.exit(1);
}
const name = rawName.replace(/\s+/g, '_');

// ── Build timestamp (yyyyMMddHHmmss) ─────────────────────────────────────────
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestamp =
  now.getFullYear().toString() +
  pad(now.getMonth() + 1) +
  pad(now.getDate()) +
  pad(now.getHours()) +
  pad(now.getMinutes()) +
  pad(now.getSeconds());

const migrationDir = join(root, 'prisma', 'migrations', `${timestamp}_${name}`);
const migrationFile = join(migrationDir, 'migration.sql');

// ── Run prisma migrate diff ───────────────────────────────────────────────────
console.log(`Generating migration diff for: ${timestamp}_${name}`);

let sql;
try {
  sql = execSync(
    'npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --config prisma.config.ts --script',
    { cwd: root, encoding: 'utf-8' },
  );
} catch (err) {
  console.error('prisma migrate diff failed:\n', err.stderr ?? err.message);
  process.exit(1);
}

// Strip npm notice lines that npx may inject
sql = sql
  .split('\n')
  .filter((l) => !l.startsWith('npm notice'))
  .join('\n')
  .trimStart();

if (!sql.trim()) {
  console.log('No schema changes detected. Migration file not created.');
  process.exit(0);
}

// ── Write migration file ──────────────────────────────────────────────────────
mkdirSync(migrationDir, { recursive: true });
writeFileSync(migrationFile, sql, 'utf-8');

console.log(`\nMigration created at:\n  ${migrationFile}`);
console.log('\nReview the SQL, then apply with:');
console.log('  npm --workspace apps/api run db:migrate:deploy');
