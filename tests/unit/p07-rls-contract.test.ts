import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readP07Migration(): string {
  const migrationsPath = path.join(root, 'apps/api/prisma/migrations');
  const matches = fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /(?:^|_)rls_runtime_poc$/.test(entry.name));

  expect(matches).toHaveLength(1);
  return read(`apps/api/prisma/migrations/${matches[0]!.name}/migration.sql`);
}

describe('P07 Prisma RLS runtime contract', () => {
  it('uses transaction-local identity context on one Prisma transaction client', () => {
    const source = read('apps/api/src/rls/rls-context.service.ts');

    expect(source).toContain('this.prisma.$transaction');
    expect(source).toContain('return operation(tx, context)');

    for (const [setting, value] of [
      ['request.jwt.claim.sub', 'authUserId'],
      ['app.employee_id', 'employeeId'],
      ['app.company_id', 'companyId'],
      ['app.office_id', 'officeId'],
    ] as const) {
      expect(source).toMatch(
        new RegExp(
          `set_config\\(\\s*'${setting.replaceAll('.', '\\.')}\\s*'\\s*,\\s*\\$\\{context\\.${value}\\}\\s*,\\s*true\\s*\\)`,
        ),
      );
    }

    expect(source).not.toMatch(/SET\s+(SESSION\s+)?(?:app\.|request\.jwt)/i);
  });

  it('enables RLS for the P07 probe and targets the runtime role', () => {
    const migration = readP07Migration();

    expect(migration).toContain('ALTER TABLE public.rls_poc_resources');

    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');

    expect(migration).toMatch(/CREATE POLICY rls_poc_resource_select/i);

    expect(migration).toMatch(/TO surat_runtime/i);

    expect(migration).toMatch(/current_setting\(\s*'app\.employee_id'\s*,\s*true\s*\)/);

    expect(migration).toMatch(/current_setting\(\s*'app\.office_id'\s*,\s*true\s*\)/);

    expect(migration).toMatch(/current_setting\(\s*'request\.jwt\.claim\.sub'\s*,\s*true\s*\)/);

    expect(migration).toMatch(/FROM\s+PUBLIC,\s*anon,\s*authenticated/i);
  });

  it('keeps the P07 probe read-only for application runtime', () => {
    const migration = readP07Migration();

    expect(migration).toMatch(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE[\s\S]*FROM surat_runtime/i);

    expect(migration).toMatch(/GRANT SELECT[\s\S]*TO surat_runtime/i);
  });
});
