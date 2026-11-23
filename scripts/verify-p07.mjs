import { phaseTestRecords } from './phase-evidence.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integration = process.argv.includes('--integration');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const steps = [
  { id: 'P07-SCHEMA', args: ['run', '--workspace=@surat-digital/api', 'prisma:validate'] },
  { id: 'P07-PRISMA-GENERATE', args: ['run', '--workspace=@surat-digital/api', 'prisma:generate'] },
  { id: 'P07-UNIT', args: ['exec', '--', 'vitest', 'run', 'tests/unit/p07-rls-contract.test.ts'] },
  { id: 'P07-CONTRACT', args: ['run', 'api:contract'] },
  { id: 'P07-LINT', args: ['run', 'lint'] },
  { id: 'P07-TYPECHECK', args: ['run', 'typecheck'] },
  { id: 'P07-ALL-TESTS', args: ['run', 'test'] },
  { id: 'P07-BUILD', args: ['run', 'build'] },
];

if (integration) {
  steps.push(
    {
      id: 'P07-T01-T04-INTEGRATION',
      args: ['run', '--workspace=@surat-digital/api', 'p07:verify:integration'],
    },
    { id: 'P07-FE-T01-BROWSER', args: ['run', 'web:verify:browser'] },
  );
}

function run(args) {
  const command = process.platform === 'win32' ? 'cmd.exe' : npm;
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm', ...args] : args;
  return spawnSync(command, commandArgs, { cwd: root, env: process.env, stdio: 'inherit' });
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

const backendPassed =
  integration &&
  evidence.some((item) => item.id === 'P07-T01-T04-INTEGRATION' && item.status === 'PASS');
const frontendPassed =
  integration &&
  evidence.some((item) => item.id === 'P07-FE-T01-BROWSER' && item.status === 'PASS');
const status = failed ? 'FAIL' : backendPassed && frontendPassed ? 'PASS' : 'INCOMPLETE';
const result = {
  phaseId: 'P07',
  executedAt: new Date().toISOString(),
  integrationExecuted: integration,
  overallStatus: status,
  testVerification: {
    'P07-T01': backendPassed ? 'PASS' : 'NOT_FULLY_VERIFIED',
    'P07-T02': backendPassed ? 'PASS' : 'NOT_FULLY_VERIFIED',
    'P07-T03': backendPassed ? 'PASS' : 'NOT_FULLY_VERIFIED',
    'P07-T04': backendPassed ? 'PASS' : 'NOT_FULLY_VERIFIED',
    'P07-FE-T01': frontendPassed ? 'PASS' : 'NOT_FULLY_VERIFIED',
  },
  verification: phaseTestRecords('P07', [
    {
      testIds: ['P07-T01', 'P07-T02', 'P07-T03', 'P07-T04'],
      step: evidence.find((item) => item.id === 'P07-T01-T04-INTEGRATION'),
    },
    { testIds: ['P07-FE-T01'], step: evidence.find((item) => item.id === 'P07-FE-T01-BROWSER') },
  ]),
  evidence,
};
const output = path.join(root, 'docs/evidence/P07/verification.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(`\nP07 VERIFICATION: ${status}`);
process.exit(failed ? 1 : 0);
