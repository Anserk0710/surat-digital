import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const guard = path.join(root, 'scripts/assert-local-database.mjs');

interface GuardOptions {
  url: string;
  enabled?: string;
  database?: string;
}

function runGuard({ url, enabled = 'true', database = 'surat_digital_dev' }: GuardOptions) {
  return spawnSync(process.execPath, [guard], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      DIRECT_URL: url,
      ALLOW_LOCAL_DB_RESET: enabled,
      LOCAL_DB_RESET_DATABASE: database,
    },
  });
}

describe('C01 database reset safety guard', () => {
  const localUrls = [
    'postgresql://user:pass@localhost:5432/surat_digital_dev',
    'postgresql://user:pass@127.0.0.1:5432/surat_digital_dev',
    'postgresql://user:pass@[::1]:5432/surat_digital_dev',
  ];

  it.each(localUrls)('accepts authorized loopback database: %s', (url) => {
    expect(runGuard({ url }).status).toBe(0);
  });

  const unsafeUrls = [
    'postgresql://user:pass@notlocalhost.example:5432/surat_digital_dev',
    'postgresql://user:pass@db.production.example:5432/surat_digital_dev',
    'postgresql://user:localhost@remote.example:5432/surat_digital_dev',
    'postgresql://user:pass@localhost.example.com:5432/surat_digital_dev',
    'postgresql://user:pass@localhost:5432/production',
    'postgresql://user:pass@localhost:5432/surat_digital_dev?host=remote.example',
    'postgresql://user:pass@localhost:5432/surat_digital_dev?hostaddr=192.0.2.10',
    'https://localhost/surat_digital_dev',
  ];

  it.each(unsafeUrls)('rejects unsafe target: %s', (url) => {
    const result = runGuard({ url });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('RESET BLOCKED');
  });

  it('rejects missing explicit authorization', () => {
    const result = runGuard({
      url: localUrls[0]!,
      enabled: 'false',
    });

    expect(result.status).toBe(1);
  });

  it('rejects an unexpected database name', () => {
    const result = runGuard({
      url: localUrls[0]!,
      database: 'another_database',
    });

    expect(result.status).toBe(1);
  });
});
