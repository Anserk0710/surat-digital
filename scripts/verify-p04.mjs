import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integration = process.argv.includes('--integration');
const npmCommand = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';

const tests = [
  {
    testId: 'P04-T01',
    description: 'Rate limiting and brute-force protection',
    args: ['exec', '--', 'vitest', 'run', 'apps/api/src/security/auth-rate-limit.service.test.ts'],
  },
  {
    testId: 'P04-T02',
    description: 'Suspension and session invalidation',
    args: [
      'exec',
      '--',
      'vitest',
      'run',
      'apps/api/src/auth/employee-session-policy.service.test.ts',
    ],
  },
  {
    testId: 'P04-T03',
    description: 'CORS, Origin and CSRF protection',
    args: [
      'exec',
      '--',
      'vitest',
      'run',
      'apps/api/src/security/csrf.middleware.test.ts',
      'apps/api/src/security/trusted-origin.middleware.test.ts',
    ],
  },
  {
    testId: 'P04-T04',
    description: 'Structured auth logging and secret redaction',
    args: ['exec', '--', 'vitest', 'run', 'apps/api/src/security/auth-audit.service.test.ts'],
  },
];

function execute(args) {
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm', ...args] : args;

  return spawnSync(npmCommand, commandArgs, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
}

const evidence = [];
let failed = false;

for (const test of tests) {
  console.log(`\n=== ${test.testId}: ${test.description} ===`);

  if (failed) {
    evidence.push({
      phaseId: 'P04',
      testId: test.testId,
      status: 'NOT_RUN',
      executedAt: new Date().toISOString(),
      command: `npm ${test.args.join(' ')}`,
      result: 'Skipped after preceding failure.',
      artifactPath: 'docs/evidence/P04/verification.json',
    });

    continue;
  }

  const run = execute(test.args);
  const passed = run.status === 0 && !run.error;

  evidence.push({
    phaseId: 'P04',
    testId: test.testId,
    status: passed ? 'PASS' : 'FAIL',
    executedAt: new Date().toISOString(),
    command: `npm ${test.args.join(' ')}`,
    result: passed ? 'Verification passed.' : 'Verification failed.',
    artifactPath: 'docs/evidence/P04/verification.json',
  });

  failed = !passed;
}

if (integration && !failed) {
  if (process.env.P04_NONPROD_ACK !== 'YES') {
    console.error('P04_NONPROD_ACK=YES is required.');
    failed = true;
  } else {
    const commands = [
      ['run', '--workspace=@surat-digital/api', 'p04:verify:integration'],
      ['run', '--workspace=@surat-digital/api', 'p04:verify:http'],
    ];

    for (const args of commands) {
      const result = execute(args);

      if (result.status !== 0 || result.error) {
        failed = true;
        break;
      }
    }
  }
}

const outputPath = path.join(root, 'docs/evidence/P04/verification.json');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      phaseId: 'P04',
      executedAt: new Date().toISOString(),
      integrationRequested: integration,
      overallStatus: failed ? 'FAIL' : 'PASS',
      verification: evidence,
    },
    null,
    2,
  )}\n`,
);

console.log(failed ? '\nP04 VERIFICATION FAILED' : '\nP04 VERIFICATION PASSED');

process.exit(failed ? 1 : 0);
