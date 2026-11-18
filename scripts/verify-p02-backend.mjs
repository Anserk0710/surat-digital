import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const evidencePath = 'docs/evidence/P02/verification.json';
const clean = JSON.parse(
  readFileSync('docs/evidence/P02/clean-migration.json', 'utf8').replace(/^\uFEFF/, ''),
);
const verification = [
  { testId: 'P02-T01', status: clean.status, evidence: 'clean-migration.json' },
];

function run(testId, script, times = 1) {
  let status = 'PASS';
  for (let attempt = 0; attempt < times; attempt++) {
    const windows = process.platform === 'win32';
    const command = windows ? process.env.ComSpec || 'cmd.exe' : 'npm';
    const args = windows ? ['/d', '/s', '/c', 'npm', 'run', script] : ['run', script];
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.error || result.status !== 0) {
      status = 'FAIL';
      break;
    }
  }
  verification.push({ testId, status, command: `npm run ${script} × ${times}` });
  console.log(`${testId}: ${status}`);
  if (status !== 'PASS') {
    throw new Error(`${testId} failed.`);
  }
}

try {
  if (clean.status !== 'PASS') {
    throw new Error('P02-T01 clean migration has not passed.');
  }
  run('P02-T02', 'db:seed', 2);
  run('P02-T03', 'db:verify:runtime-role');
  run('P02-T04', 'prisma:generate');
  run('P02-T04-SMOKE', 'db:smoke');
  console.log('P02 backend verification: PASS');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  writeFileSync(
    evidencePath,
    JSON.stringify(
      {
        phaseId: 'P02',
        timestamp: new Date().toISOString(),
        overallStatus: verification.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL',
        verification,
      },
      null,
      2,
    ) + '\n',
  );
}
