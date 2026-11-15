/**
 * migrate-mark-applied.mjs
 *
 * Marks a migration as applied in _prisma_migrations WITHOUT running the SQL.
 * Use this after manually applying the migration SQL in Supabase SQL Editor.
 *
 * Usage:
 *   npm --workspace apps/api run db:migrate:mark-applied --name=<migration_folder_name>
 *
 * Example:
 *   npm --workspace apps/api run db:migrate:mark-applied --name=20261112115231_p03_auth_sessions
 */

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;

const args = process.argv.slice(2);
const nameIdx = args.indexOf('--name');
const migrationName =
  (nameIdx !== -1 && args[nameIdx + 1]) ||
  process.env.npm_config_name ||
  process.env.MIGRATION_NAME;

if (!migrationName) {
  console.error(
    'Error: migration name is required.\n\n' +
      'Usage:\n' +
      '  npm --workspace apps/api run db:migrate:mark-applied --name=<migration_folder_name>\n',
  );
  process.exit(1);
}

console.log(`Marking migration as applied: ${migrationName}`);
try {
  execSync(`npx prisma migrate resolve --applied ${migrationName} --config prisma.config.ts`, {
    cwd: root,
    encoding: 'utf-8',
    stdio: 'inherit',
  });
} catch (err) {
  console.error('Failed to mark migration as applied:', err.message);
  process.exit(1);
}
