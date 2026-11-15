import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const rootDirectory = path.resolve(currentDirectory, '../..');

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(rootDirectory, relativePath), 'utf8');
}

describe('P03 browser auth gateway contract', () => {
  it('does not install Supabase SDK in web workspace', () => {
    const packageJson = JSON.parse(readText('apps/web/package.json')) as {
      dependencies?: Record<string, string>;

      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.['@supabase/supabase-js']).toBeUndefined();

    expect(packageJson.devDependencies?.['@supabase/supabase-js']).toBeUndefined();
  });

  it('does not expose Supabase credentials in web env contract', () => {
    const envExample = readText('apps/web/.env.example');

    expect(envExample).not.toMatch(/SUPABASE_/i);
  });

  it('uses the NestJS auth gateway from browser code', () => {
    const source = readText('apps/web/src/auth/auth-api.ts');

    expect(source).toContain('/api/auth/login');

    expect(source).toContain('/api/auth/refresh');

    expect(source).toContain('/api/auth/logout');

    expect(source).toContain('/api/auth/me');

    expect(source).not.toContain('@supabase/supabase-js');
  });
});
