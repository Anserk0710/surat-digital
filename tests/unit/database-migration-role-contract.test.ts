import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(currentDirectory, '../..');

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(rootDirectory, relativePath), 'utf8');
}

describe('database migration role contract', () => {
  it('requires a dedicated migration URL without hardcoded credentials', () => {
    const config = readText('apps/api/prisma.config.ts');

    expect(config).toContain("requiredEnvironmentVariable('DIRECT_URL')");
    expect(config).toContain('P02_MIGRATION_ROLE_NAME');
    expect(config).not.toContain('postgresql://');
  });

  it('runs migration-role preflight before Prisma migration commands', () => {
    const packageJson = JSON.parse(readText('apps/api/package.json')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['db:verify:migration-role']).toBe(
      'tsx scripts/verify-migration-role.ts',
    );

    for (const script of [
      'db:migrate:create',
      'db:migrate:dev',
      'db:migrate:deploy',
      'db:migrate:status',
      'db:migrate:diff',
    ]) {
      expect(packageJson.scripts[script]).toMatch(/^npm run db:verify:migration-role && /);
    }
  });

  it('documents and provisions surat_migrator as relation owner', () => {
    const envExample = readText('apps/api/.env.example');
    const bootstrap = readText('infra/database/bootstrap-roles.psql');
    const ownershipHandoff = readText('infra/database/handoff-migration-ownership.sql');
    const verifier = readText('apps/api/scripts/verify-migration-role.ts');

    expect(envExample).toContain('P02_MIGRATION_ROLE_NAME=surat_migrator');
    expect(envExample).toContain('postgresql://surat_migrator.');
    expect(envExample).toContain('uselibpqcompat=true&sslmode=require');
    expect(bootstrap).toContain('\\ir handoff-migration-ownership.sql');
    expect(ownershipHandoff).toContain("'ALTER TABLE %I.%I OWNER TO %I'");
    expect(verifier).toContain("'surat_migrator'");
    expect(verifier).toContain('Migration role verification PASS.');
  });
});
