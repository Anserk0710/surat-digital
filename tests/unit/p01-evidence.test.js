import { describe, expect, it } from 'vitest';
import { recordCiRun } from '../../scripts/p01-evidence.mjs';

function freshEvidence() {
  return {
    phaseId: 'P01',
    status: 'IN_PROGRESS',
    tests: ['P01-T01', 'P01-T02', 'P01-T03'].map((testId) => ({
      testId,
      status: 'NOT_RUN',
      evidence: [],
    })),
  };
}

const requiredSteps = [
  'Install dependencies',
  'Verify lockfile unchanged',
  'Check formatting',
  'Lint',
  'Typecheck',
  'Test',
  'Build',
];

function qualityJob(failedStep) {
  return {
    name: 'Build, Lint & Test',
    conclusion: failedStep ? 'failure' : 'success',
    steps: requiredSteps.map((name) => ({
      name,
      conclusion:
        name === failedStep
          ? 'failure'
          : failedStep && requiredSteps.indexOf(name) > requiredSteps.indexOf(failedStep)
            ? 'skipped'
            : 'success',
    })),
  };
}

function run(overrides = {}) {
  return {
    id: 42,
    event: 'push',
    head_branch: 'main',
    head_sha: 'a'.repeat(40),
    conclusion: 'success',
    html_url: 'https://github.com/example/repo/actions/runs/42',
    ...overrides,
  };
}

describe('P01 CI evidence', () => {
  it('records successful main CI only when every required quality step passed', () => {
    const evidence = freshEvidence();
    expect(recordCiRun(evidence, run(), [qualityJob()])).toBe(true);
    expect(evidence.tests[1]).toMatchObject({
      status: 'PASS',
      evidence: [expect.stringContaining('a'.repeat(40))],
    });
    expect(() => recordCiRun(freshEvidence(), run(), [qualityJob('Test')])).toThrow(
      'Required quality steps',
    );
  });

  it('requires separate lint and test failures before P01-T03 passes', () => {
    const evidence = freshEvidence();
    const negativeRun = run({ head_branch: 'test/p01-ci-lint-failure', conclusion: 'failure' });
    expect(recordCiRun(evidence, negativeRun, [qualityJob('Lint')])).toBe(true);
    expect(evidence.tests[2].status).toBe('IN_PROGRESS');
    expect(evidence.tests[2].evidence).toHaveLength(1);

    expect(recordCiRun(evidence, run({ ...negativeRun, id: 43 }), [qualityJob('Test')])).toBe(true);
    expect(evidence.tests[2].status).toBe('PASS');
    expect(evidence.tests[2].evidence).toHaveLength(2);
  });

  it('ignores unrelated failed runs', () => {
    const evidence = freshEvidence();
    expect(recordCiRun(evidence, run({ conclusion: 'failure' }), [qualityJob('Lint')])).toBe(false);
    expect(evidence.tests[1].status).toBe('NOT_RUN');
  });
});
