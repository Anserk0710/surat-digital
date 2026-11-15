import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(currentDirectory, '../..');
const migrationPath = path.join(
  rootDirectory,
  'apps/api/prisma/migrations/20261115170000_p03_revoke_data_api_table_privileges/migration.sql',
);

describe('Supabase Data API table privilege hardening', () => {
  it('revokes public API roles from every current application table', () => {
    const migration = fs.readFileSync(migrationPath, 'utf8');
    const tables = [
      'companies',
      'offices',
      'divisions',
      'office_divisions',
      'job_titles',
      'employees',
      'employee_assignments',
      'groups',
      'permissions',
      'employee_groups',
      'group_permissions',
      'auth_sessions',
    ];

    expect(migration).toMatch(/REVOKE ALL ON TABLE/i);
    expect(migration).toMatch(/FROM anon, authenticated/i);

    for (const table of tables) {
      expect(migration).toContain(`public."${table}"`);
    }
  });
});
