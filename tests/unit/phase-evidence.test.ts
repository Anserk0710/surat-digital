import { describe, expect, it } from 'vitest';
// @ts-expect-error The verification tooling is native ESM JavaScript.
import { validateEvidence, phaseTestRecords } from '../../scripts/phase-evidence.mjs';

const context = { phaseId: 'P09', artifactPath: 'docs/evidence/P09/verification.json' };
const createEvidence = () => ({
  phaseId: 'P09',
  executedAt: '2026-11-21T09:00:00.000Z',
  overallStatus: 'PASS',
  verification: phaseTestRecords('P09', [
    {
      testIds: ['P09-T01', 'P09-T02', 'P09-T03', 'P09-T04', 'P09-FE-T01'],
      step: {
        status: 'PASS',
        command: 'npm run p09:verify:integration',
        executedAt: '2026-11-21T09:00:00.000Z',
      },
    },
  ]),
});

describe('phase evidence enforcement', () => {
  it('accepts complete passing evidence', () =>
    expect(validateEvidence(createEvidence(), context)).toEqual([]));
  it('rejects PASS without test records', () =>
    expect(
      validateEvidence({ ...createEvidence(), verification: [] }, context).length,
    ).toBeGreaterThan(0));
  it('rejects a missing required test', () => {
    const evidence = createEvidence();
    evidence.verification.pop();
    expect(validateEvidence(evidence, context)).toContain('Missing required test P09-FE-T01.');
  });
  it.each(['phaseId', 'testId', 'status', 'executedAt', 'command', 'result', 'artifactPath'])(
    'rejects missing %s',
    (field) => {
      const evidence = createEvidence();
      delete evidence.verification[0][field];
      expect(validateEvidence(evidence, context).length).toBeGreaterThan(0);
    },
  );
  it.each(['FAIL', 'BLOCKED', 'NOT_RUN', 'NOT_FULLY_VERIFIED'])(
    'rejects %s under a PASS summary',
    (status) => {
      const evidence = createEvidence();
      evidence.verification[0].status = status;
      expect(validateEvidence(evidence, context).length).toBeGreaterThan(0);
    },
  );
  it.each(['phaseId', 'artifactPath', 'executedAt'])('rejects invalid %s', (field) => {
    const evidence = createEvidence();
    evidence.verification[0][field] = field === 'executedAt' ? '2026-02-30T00:00:00.000Z' : 'wrong';
    expect(validateEvidence(evidence, context).length).toBeGreaterThan(0);
  });
  it('rejects duplicate test identifiers', () => {
    const evidence = createEvidence();
    evidence.verification.push(evidence.verification[0]);
    expect(validateEvidence(evidence, context).join(' ')).toContain('duplicate testId');
  });
  it('does not turn an unexecuted command into passing evidence', () => {
    expect(phaseTestRecords('P09', [{ testIds: ['P09-T01'] }])[0].status).toBe('NOT_RUN');
  });
  it('validates frontend evidence with the same contract', () => {
    const evidence = createEvidence().verification.at(-1);
    const frontend = { ...evidence, artifactPath: 'docs/evidence/P09/frontend.json' };
    expect(
      validateEvidence(frontend, {
        ...context,
        artifactPath: frontend.artifactPath,
        frontend: true,
      }),
    ).toEqual([]);
    expect(
      validateEvidence(
        { ...frontend, command: '' },
        { ...context, artifactPath: frontend.artifactPath, frontend: true },
      ).length,
    ).toBeGreaterThan(0);
  });
});
