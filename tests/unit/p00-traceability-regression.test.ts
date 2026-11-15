import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const validator = path.join(root, 'scripts/p00-validate.mjs');

interface RequirementMapping {
  owner?: string;
  phases?: string[];
  tests?: string[];
  traceGap?: {
    reason: string;
    decisionId: string;
  };
}

function verifyFixture(mapping: RequirementMapping) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'p00-regression-'));

  function write(relativePath: string, content: string) {
    const target = path.join(directory, relativePath);

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  try {
    write(
      'docs/baseline/02_SRS.md',
      '| ID | Description | Priority |\n' +
        '| --- | --- | --- |\n' +
        '| FR-TEST-001 | Test requirement | Must |\n',
    );

    write(
      'docs/baseline/13_Decision_Log_and_Open_Items.md',
      '| D-001 | Recorded exception decision |\n',
    );

    write('docs/baseline/04_Development_Roadmap.md', 'P00 P01 P00-T01 P00-T02 P00-T03');

    write(
      'docs/baseline/19_Requirements_Traceability_Matrix.md',
      '| Requirement | Rule | API | DB | Test | Phase |\n',
    );

    write(
      'docs/governance/requirement-overrides.json',
      JSON.stringify({
        domainMappings: {},
        requirements: {
          'FR-TEST-001': mapping,
        },
      }),
    );

    write('docs/governance/phase-gates.json', JSON.stringify({}));

    write('docs/governance/baseline.json', JSON.stringify({ baselineVersion: 'test' }));

    const execution = spawnSync(process.execPath, [validator], {
      cwd: directory,
      encoding: 'utf8',
    });

    const evidence = JSON.parse(
      fs.readFileSync(path.join(directory, 'docs/evidence/P00/verification.json'), 'utf8'),
    ) as {
      verification: Array<{
        testId: string;
        status: string;
      }>;
    };

    const p00t01 = evidence.verification.find((item) => item.testId === 'P00-T01');

    return {
      status: p00t01?.status,
      exitCode: execution.status,
    };
  } finally {
    fs.rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}

describe('C02 P00-T01 traceability regression', () => {
  it('fails when a Must requirement has no owner', () => {
    expect(
      verifyFixture({
        phases: ['P01'],
      }).status,
    ).toBe('FAIL');
  });

  it('fails when a Must requirement has no trace or explanation', () => {
    expect(
      verifyFixture({
        owner: 'Backend',
        phases: [],
        tests: [],
      }).status,
    ).toBe('FAIL');
  });

  it('fails when exception decision is not recorded', () => {
    expect(
      verifyFixture({
        owner: 'Backend',
        traceGap: {
          reason: 'Requirement needs explicit implementation planning.',
          decisionId: 'D-999',
        },
      }).status,
    ).toBe('FAIL');
  });

  it('passes P00-T01 with a valid phase trace', () => {
    expect(
      verifyFixture({
        owner: 'Backend',
        phases: ['P01'],
      }).status,
    ).toBe('PASS');
  });

  it('passes P00-T01 with a documented exception', () => {
    expect(
      verifyFixture({
        owner: 'Backend',
        traceGap: {
          reason: 'Implementation trace is pending an approved design decision.',
          decisionId: 'D-001',
        },
      }).status,
    ).toBe('PASS');
  });
});
