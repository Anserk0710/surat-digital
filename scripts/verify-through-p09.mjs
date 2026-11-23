import fs from 'node:fs';
import { checkPhaseEvidence } from './validate-phase-evidence.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = 'docs/evidence/GATE-P09/verification.json';
const steps = [
  ['GOVERNANCE-HYGIENE', 'governance:check'],
  ['P02-CLEAN-MIGRATION', 'p02:verify:clean-migration'],
  ['P02-BACKEND', 'p02:verify:backend'],
  ['P02-FRONTEND', 'p02:frontend'],
  ['P03', 'p03:verify'],
  ...['P04', 'P05', 'P06', 'P07', 'P08', 'P09'].map((phase) => [
    phase,
    `${phase.toLowerCase()}:verify:integration`,
  ]),
];
const verification = [];
let failed = false;
function record(testId, status, command, result) {
  verification.push({
    phaseId: 'GATE-P09',
    testId,
    status,
    executedAt: new Date().toISOString(),
    command,
    result,
    artifactPath,
  });
  if (status === 'FAIL') {
    failed = true;
  }
}
for (const [id, script] of steps) {
  const command = `npm run ${script}`;
  if (failed) {
    record(id, 'NOT_RUN', command, 'Skipped after preceding failure.');
    continue;
  }
  console.log(`\nRunning ${id}`);
  const windows = process.platform === 'win32';
  const result = spawnSync(
    windows ? 'cmd.exe' : 'npm',
    windows ? ['/d', '/s', '/c', 'npm', 'run', script] : ['run', script],
    { cwd: root, env: process.env, stdio: 'inherit' },
  );
  const passed = result.status === 0 && !result.error;
  record(
    id,
    passed ? 'PASS' : 'FAIL',
    command,
    passed
      ? 'Verification command passed.'
      : `Verification failed with exit code ${result.status}.`,
  );
}
function checkEvidence(phase, frontend) {
  const file = `docs/evidence/${phase}/${frontend ? 'frontend' : 'verification'}.json`;
  const errors = checkPhaseEvidence(new URL('../', import.meta.url), phase, frontend);
  const passed = errors.length === 0;
  record(
    `${phase}-${frontend ? 'FRONTEND-' : ''}EVIDENCE`,
    passed ? 'PASS' : 'FAIL',
    `read ${file}`,
    passed ? `${phase} evidence passed.` : `${phase} evidence failed: ${errors.join(' ')}`,
  );
}
const phases = ['P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09'];
if (!failed) {
  for (const phase of phases) {
    checkEvidence(phase, false);
  }
}
if (!failed) {
  for (const phase of phases) {
    checkEvidence(phase, true);
  }
}
const decisionFile = 'docs/baseline/13_Decision_Log_and_Open_Items.md';
const decisions = fs.existsSync(path.join(root, decisionFile))
  ? fs.readFileSync(path.join(root, decisionFile), 'utf8')
  : '';
for (const id of ['O-003', 'O-006', 'O-008', 'O-015', 'O-016']) {
  const row = decisions.split(/\r?\n/).find((line) => line.includes(`| ${id} |`));
  const passed = Boolean(row) && /\|\s*(Decided|Closed)\s*\|/i.test(row);
  record(
    `DECISION-${id}`,
    passed ? 'PASS' : 'FAIL',
    `check decision ${id}`,
    passed ? `${id} is Decided/Closed.` : `${id} is still unresolved.`,
  );
}
const overallStatus = failed ? 'NO_GO' : 'GO_P10';
fs.mkdirSync(path.dirname(path.join(root, artifactPath)), { recursive: true });
fs.writeFileSync(
  path.join(root, artifactPath),
  JSON.stringify(
    {
      phaseId: 'GATE-P09',
      executedAt: new Date().toISOString(),
      overallStatus,
      nextPhase: failed ? null : 'P10',
      verification,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `\n================================\nROADMAP GATE: ${overallStatus}\n================================\n`,
);
process.exit(failed ? 1 : 0);
