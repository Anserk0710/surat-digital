import fs from 'node:fs';
import path from 'node:path';

export const evidencePath = 'docs/evidence/P01/verification.json';
const requiredTests = ['P01-T01', 'P01-T02', 'P01-T03'];
const negativeEvidence = {
  Lint: 'Lint-negative CI run failed',
  Test: 'Test-negative CI run failed',
};

export function readEvidence(root) {
  const evidence = JSON.parse(fs.readFileSync(path.join(root, evidencePath), 'utf8'));
  if (
    evidence.phaseId !== 'P01' ||
    !Array.isArray(evidence.tests) ||
    requiredTests.some((id) => evidence.tests.filter((test) => test.testId === id).length !== 1)
  ) {
    throw new Error(`Invalid P01 evidence structure in ${evidencePath}.`);
  }
  for (const test of evidence.tests) {
    if (typeof test.evidence === 'string') {
      test.evidence = [test.evidence];
    }
    if (!Array.isArray(test.evidence)) {
      throw new Error(`Invalid evidence for ${test.testId}.`);
    }
  }
  return evidence;
}

export function writeEvidence(root, evidence) {
  evidence.status = requiredTests.every(
    (id) => evidence.tests.find((test) => test.testId === id).status === 'PASS',
  )
    ? 'PASS'
    : 'IN_PROGRESS';
  fs.writeFileSync(path.join(root, evidencePath), JSON.stringify(evidence, null, 2) + '\n');
}

export function recordFreshInstall(root, lockfileHash) {
  const evidence = readEvidence(root);
  const test = evidence.tests.find((item) => item.testId === 'P01-T01');
  test.status = 'PASS';
  test.evidence = [
    'npm run p01:verify:fresh-install: sandbox npm ci succeeded',
    `package-lock.json SHA-256 unchanged: ${lockfileHash}`,
  ];
  writeEvidence(root, evidence);
}

export function recordCiRun(evidence, run, jobs) {
  const quality = jobs.find((job) => job.name === 'Build, Lint & Test');
  if (!quality) {
    throw new Error(`Quality job missing from CI run ${run.id}.`);
  }

  if (run.event === 'push' && run.head_branch === 'main' && run.conclusion === 'success') {
    const requiredSteps = [
      'Install dependencies',
      'Verify lockfile unchanged',
      'Check formatting',
      'Lint',
      'Typecheck',
      'Test',
      'Build',
    ];
    if (
      quality.conclusion !== 'success' ||
      requiredSteps.some(
        (name) => quality.steps?.find((step) => step.name === name)?.conclusion !== 'success',
      )
    ) {
      throw new Error(`Required quality steps did not all pass in CI run ${run.id}.`);
    }
    const test = evidence.tests.find((item) => item.testId === 'P01-T02');
    test.status = 'PASS';
    test.evidence = [`CI passed for commit ${run.head_sha}: ${run.html_url}`];
    return true;
  }

  if (
    !['push', 'pull_request'].includes(run.event) ||
    run.head_branch !== 'test/p01-ci-lint-failure'
  ) {
    return false;
  }
  if (run.conclusion !== 'failure' || quality.conclusion !== 'failure') {
    return false;
  }
  const failedStep = ['Lint', 'Test'].find(
    (name) => quality.steps?.find((step) => step.name === name)?.conclusion === 'failure',
  );
  if (!failedStep) {
    return false;
  }
  const test = evidence.tests.find((item) => item.testId === 'P01-T03');
  const prefix = negativeEvidence[failedStep];
  test.evidence = [
    ...test.evidence.filter((item) => !item.startsWith(prefix)),
    `${prefix} for commit ${run.head_sha}: ${run.html_url}`,
  ];
  test.status = Object.values(negativeEvidence).every((item) =>
    test.evidence.some((entry) => entry.startsWith(item)),
  )
    ? 'PASS'
    : 'IN_PROGRESS';
  return true;
}
