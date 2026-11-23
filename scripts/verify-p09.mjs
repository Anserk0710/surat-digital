import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integration = process.argv.includes('--integration');
const artifactPath = 'docs/evidence/P09/verification.json';
const steps = [
  { id: 'P09-SCHEMA', args: ['run', '--workspace=@surat-digital/api', 'prisma:validate'] },
  { id: 'P09-PRISMA-GENERATE', args: ['run', '--workspace=@surat-digital/api', 'prisma:generate'] },
  {
    id: 'P09-UNIT',
    args: [
      'exec',
      '--',
      'vitest',
      'run',
      'tests/unit/p09-file-validation.test.ts',
      'tests/unit/p09-download-authorization.test.ts',
    ],
  },
  { id: 'P09-CONTRACT', args: ['run', 'api:contract'] },
  { id: 'P09-LINT', args: ['run', 'lint'] },
  { id: 'P09-TYPECHECK', args: ['run', 'typecheck'] },
  { id: 'P09-ALL-TESTS', args: ['run', 'test'] },
  { id: 'P09-BUILD', args: ['run', 'build'] },
];
if (integration) {
  steps.push(
    {
      id: 'P09-T01-T04-INTEGRATION',
      args: ['run', '--workspace=@surat-digital/api', 'p09:verify:integration'],
    },
    { id: 'P09-FE-T01-BROWSER', args: ['run', 'web:verify:browser'] },
  );
}

const execution = [];
let failed = false;
for (const step of steps) {
  const command = `npm ${step.args.join(' ')}`;
  if (failed) {
    execution.push({ id: step.id, status: 'NOT_RUN', command });
    continue;
  }
  console.log(`\n=== ${step.id} ===`);
  const windows = process.platform === 'win32';
  const result = spawnSync(
    windows ? 'cmd.exe' : 'npm',
    windows ? ['/d', '/s', '/c', 'npm', ...step.args] : step.args,
    { cwd: root, env: process.env, stdio: 'inherit' },
  );
  const passed = result.status === 0 && !result.error;
  execution.push({
    id: step.id,
    status: passed ? 'PASS' : 'FAIL',
    command,
    executedAt: new Date().toISOString(),
    exitCode: result.status,
  });
  failed = !passed;
}
const backendPassed =
  integration &&
  execution.some((entry) => entry.id === 'P09-T01-T04-INTEGRATION' && entry.status === 'PASS');
const frontendPassed =
  integration &&
  execution.some((entry) => entry.id === 'P09-FE-T01-BROWSER' && entry.status === 'PASS');
const verification = ['P09-T01', 'P09-T02', 'P09-T03', 'P09-T04', 'P09-FE-T01'].map((testId) => {
  const frontend = testId === 'P09-FE-T01';
  const passed = frontend ? frontendPassed : backendPassed;
  return {
    phaseId: 'P09',
    testId,
    status: passed ? 'PASS' : 'NOT_RUN',
    executedAt: new Date().toISOString(),
    command: frontend
      ? 'npm run web:verify:browser'
      : 'npm run --workspace=@surat-digital/api p09:verify:integration',
    result: passed
      ? `${frontend ? 'Browser' : 'Backend'} P09 integration verification passed.`
      : 'Integration verification was not completed.',
    artifactPath,
  };
});
const overallStatus = failed ? 'FAIL' : backendPassed && frontendPassed ? 'PASS' : 'INCOMPLETE';
fs.mkdirSync(path.dirname(path.join(root, artifactPath)), { recursive: true });
fs.writeFileSync(
  path.join(root, artifactPath),
  JSON.stringify(
    {
      phaseId: 'P09',
      executedAt: new Date().toISOString(),
      integrationExecuted: integration,
      overallStatus,
      verification,
      execution,
    },
    null,
    2,
  ) + '\n',
);
console.log(`\nP09 VERIFICATION: ${overallStatus}`);
process.exit(failed ? 1 : 0);
