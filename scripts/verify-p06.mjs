import { phaseTestRecords } from './phase-evidence.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integration = process.argv.includes('--integration');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  {
    id: 'P06-SCHEMA',
    args: ['run', '--workspace=@surat-digital/api', 'prisma:validate'],
  },
  {
    id: 'P06-PRISMA-GENERATE',
    args: ['run', '--workspace=@surat-digital/api', 'prisma:generate'],
  },
  {
    id: 'P06-UNIT',
    args: [
      'exec',
      '--',
      'vitest',
      'run',
      'apps/api/src/policy/effective-permission.test.ts',
      'apps/api/src/policy/policy-guard.test.ts',
    ],
  },
  { id: 'P06-OPENAPI', args: ['run', 'api:contract'] },
  { id: 'P06-LINT', args: ['run', 'lint'] },
  { id: 'P06-TYPECHECK', args: ['run', 'typecheck'] },
  { id: 'P06-ALL-TESTS', args: ['run', 'test'] },
  { id: 'P06-BUILD', args: ['run', 'build'] },
];

if (integration) {
  steps.push({
    id: 'P06-T01-T04-INTEGRATION',
    args: ['run', '--workspace=@surat-digital/api', 'p06:verify:integration'],
  });
}

function run(args) {
  const command = process.platform === 'win32' ? 'cmd.exe' : npm;
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm', ...args] : args;

  return spawnSync(command, commandArgs, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
}

const evidence = [];
let failed = false;

for (const step of steps) {
  if (failed) {
    evidence.push({ id: step.id, status: 'NOT_RUN' });
    continue;
  }

  console.log(`\n=== ${step.id} ===`);

  const result = run(step.args);
  const passed = result.status === 0 && !result.error;

  evidence.push({
    id: step.id,
    status: passed ? 'PASS' : 'FAIL',
    command: `npm ${step.args.join(' ')}`,
    executedAt: new Date().toISOString(),
    exitCode: result.status,
  });

  failed = !passed;
}

const integrationPassed =
  integration &&
  evidence.some((item) => item.id === 'P06-T01-T04-INTEGRATION' && item.status === 'PASS');

const status = failed ? 'FAIL' : integrationPassed ? 'PASS' : 'INCOMPLETE';
const result = {
  phaseId: 'P06',
  executedAt: new Date().toISOString(),
  overallStatus: status,
  testVerification: {
    'P06-T01': integrationPassed ? 'PASS' : 'NOT_FULLY_VERIFIED',
    'P06-T02': integrationPassed ? 'PASS' : 'NOT_FULLY_VERIFIED',
    'P06-T03': integrationPassed ? 'PASS' : 'NOT_FULLY_VERIFIED',
    'P06-T04': integrationPassed ? 'PASS' : 'NOT_RUN',
  },
  verification: phaseTestRecords('P06', [
    {
      testIds: ['P06-T01', 'P06-T02', 'P06-T03', 'P06-T04'],
      step: evidence.find((item) => item.id === 'P06-T01-T04-INTEGRATION'),
    },
  ]),
  evidence,
};

const output = path.join(root, 'docs/evidence/P06/verification.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');

console.log(`\nP06 VERIFICATION: ${status}`);
process.exit(failed ? 1 : 0);
