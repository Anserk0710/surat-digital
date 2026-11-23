import { phaseTestRecords } from './phase-evidence.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const windows = process.platform === 'win32';
const command = windows ? process.env.ComSpec || 'cmd.exe' : 'npm';
const args = windows
  ? ['/d', '/s', '/c', 'npm', 'run', '--workspace=@surat-digital/api', 'p03:verify']
  : ['run', '--workspace=@surat-digital/api', 'p03:verify'];
const run = spawnSync(command, args, { encoding: 'utf8' });
process.stdout.write(run.stdout ?? '');
process.stderr.write(run.stderr ?? '');
const tests = ['P03-T01', 'P03-T02', 'P03-T03', 'P03-T04'].map((testId) => ({
  testId,
  executedAt: new Date().toISOString(),
  status: new RegExp(`${testId}: PASS`).test(run.stdout ?? '') ? 'PASS' : 'FAIL',
  command: 'npm run --workspace=@surat-digital/api p03:verify',
}));
const passed = !run.error && run.status === 0 && tests.every((test) => test.status === 'PASS');
mkdirSync('docs/evidence/P03', { recursive: true });
writeFileSync(
  'docs/evidence/P03/verification.json',
  JSON.stringify(
    {
      phaseId: 'P03',
      executedAt: new Date().toISOString(),
      overallStatus: passed ? 'PASS' : 'FAIL',
      verification: tests.flatMap((step) =>
        phaseTestRecords('P03', [{ testIds: [step.testId], step }]),
      ),
    },
    null,
    2,
  ) + '\n',
);
if (!passed) {
  console.error('P03 verification failed.');
  process.exitCode = 1;
}
