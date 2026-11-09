import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface RootPackage {
  packageManager: string;
  workspaces: string[];
}

interface Baseline {
  baselineStatus: string;
  approval: {
    status: string;
  };
}

interface Verification {
  testId: string;
  status: string;
}

interface P00Evidence {
  verification: Verification[];
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(currentDirectory, '../..');

function readJson<T>(relativePath: string): T {
  const absolutePath = path.join(rootDirectory, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as T;
}

describe('repository bootstrap', () => {
  it('uses the expected npm workspaces', () => {
    const packageJson = readJson<RootPackage>('package.json');
    expect(packageJson.workspaces).toEqual([
      'apps/web',
      'apps/api',
      'apps/document-worker',
      'packages/*',
    ]);
  });

  it('pins npm as the official package manager', () => {
    const packageJson = readJson<RootPackage>('package.json');
    expect(packageJson.packageManager).toBe('npm@12.2.2');
    expect(fs.existsSync(path.join(rootDirectory, 'package-lock.json'))).toBe(true);
  });

  it('requires P00 to remain passed', () => {
    const evidence = readJson<P00Evidence>('docs/evidence/P00/verification.json');
    const result = Object.fromEntries(
      evidence.verification.map((test) => [test.testId, test.status]),
    );
    expect(result).toMatchObject({
      'P00-T01': 'PASS',
      'P00-T02': 'PASS',
      'P00-T03': 'PASS',
    });
  });

  it('requires the baseline to be frozen and approved', () => {
    const baseline = readJson<Baseline>('docs/governance/baseline.json');
    expect(baseline.baselineStatus).toBe('FROZEN');
    expect(baseline.approval.status).toBe('APPROVED');
  });
});
