import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(currentDirectory, '../..');

function readPackage(relativePath: string): { scripts: Record<string, string> } {
  return JSON.parse(fs.readFileSync(path.join(rootDirectory, relativePath), 'utf8')) as {
    scripts: Record<string, string>;
  };
}

describe('quality gate script paths', () => {
  it('runs database verification commands from the API workspace', () => {
    const rootPackage = readPackage('package.json');
    const apiPackage = readPackage('apps/api/package.json');

    expect(rootPackage.scripts['db:smoke']).toBe('npm run --workspace=@surat-digital/api db:smoke');
    expect(rootPackage.scripts['db:verify:seed']).toBe(
      'npm run --workspace=@surat-digital/api db:verify:seed',
    );
    expect(rootPackage.scripts['db:verify:runtime-role']).toBe(
      'npm run --workspace=@surat-digital/api db:verify:runtime-role',
    );

    expect(apiPackage.scripts['db:verify:seed']).toBe('tsx scripts/verify-seed.ts');
    expect(apiPackage.scripts['db:verify:runtime-role']).toBe('tsx scripts/verify-runtime-role.ts');
  });

  it('keeps every referenced quality gate and P03 verifier available', () => {
    const apiPackage = readPackage('apps/api/package.json');
    const requiredFiles = [
      'scripts/check-toolchain.mjs',
      'scripts/p01-verify-fresh-install.mjs',
      'apps/api/scripts/verify-seed.ts',
      'apps/api/scripts/verify-runtime-role.ts',
      'apps/api/scripts/verify-p03-auth-gateway.ts',
    ];

    expect(apiPackage.scripts['p03:verify']).toBe('tsx scripts/verify-p03-auth-gateway.ts');

    for (const relativePath of requiredFiles) {
      expect(fs.existsSync(path.join(rootDirectory, relativePath)), relativePath).toBe(true);
    }
  });
});
