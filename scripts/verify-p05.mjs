import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integration = process.argv.includes('--integration');

const steps = [
  {
    id: 'P05-SCHEMA',
    command: ['run', 'prisma:validate'],
  },
  {
    id: 'P05-UNIT',
    command: [
      'exec',
      '--',
      'vitest',
      'run',
      'apps/api/src/organization/organization-validation.test.ts',
      'apps/api/src/organization/organization-permissions.test.ts',
    ],
  },
  {
    id: 'P05-CONTRACT',
    command: ['run', 'api:contract'],
  },
  {
    id: 'P05-LINT',
    command: ['run', 'lint'],
  },
  {
    id: 'P05-TYPECHECK',
    command: ['run', 'typecheck'],
  },
  {
    id: 'P05-TEST',
    command: ['run', 'test'],
  },
  {
    id: 'P05-BUILD',
    command: ['run', 'build'],
  },
];

if (integration) {
  steps.push({
    id: 'P05-T01-T04',
    command: ['run', '--workspace=@surat-digital/api', 'p05:verify'],
  });
}

const evidence = [];
let failure = false;

for (const step of steps) {
  console.log(`\n=== ${step.id} ===`);

  if (failure) {
    evidence.push({
      id: step.id,
      status: 'NOT_RUN',
    });

    continue;
  }

  const isWindows = process.platform === 'win32';
  const result = spawnSync(
    isWindows ? 'cmd.exe' : 'npm',
    isWindows ? ['/d', '/s', '/c', 'npm', ...step.command] : step.command,
    {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
    },
  );

  const passed = result.status === 0 && !result.error;

  evidence.push({
    id: step.id,
    status: passed ? 'PASS' : 'FAIL',
    command: `npm ${step.command.join(' ')}`,
    executedAt: new Date().toISOString(),
    exitCode: result.status,
  });

  if (!passed) {
    failure = true;
  }
}

const output = path.join(root, 'docs/evidence/P05/verification.json');

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  `${JSON.stringify(
    {
      phaseId: 'P05',
      date: new Date().toISOString(),
      integrationExecuted: integration,
      overallStatus: failure ? 'FAIL' : 'PASS',
      evidence,
    },
    null,
    2,
  )}\n`,
);

console.log(failure ? '\nP05 VERIFICATION FAILED' : '\nP05 VERIFICATION PASSED');

process.exit(failure ? 1 : 0);
