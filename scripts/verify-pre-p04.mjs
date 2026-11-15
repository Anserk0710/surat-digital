import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? process.env.ComSpec || 'cmd.exe' : 'npm';

function execute(title, args) {
  console.log('\n====================================');
  console.log(`VERIFY: ${title}`);
  console.log('====================================\n');

  const npmArgs = isWindows ? ['/d', '/s', '/c', 'npm', ...args] : args;

  const result = spawnSync(npmCommand, npmArgs, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nFAILED: ${title}`);
    process.exit(result.status ?? 1);
  }

  console.log(`\nPASSED: ${title}`);
}

const regressionTests = [
  'tests/unit/database-reset-guard.test.ts',
  'tests/unit/p00-traceability-regression.test.ts',
  'tests/unit/openapi-contract.test.ts',
  'apps/api/src/auth/auth.service.test.ts',
  'apps/api/src/auth/auth-refresh-lease.test.ts',
  'apps/api/src/security/trusted-origin.middleware.test.ts',
  'apps/web/src/auth/auth-api.test.ts',
];

execute('Generated API contract', ['run', 'api:contract']);

execute('P00 baseline validation', ['run', 'p00:validate']);

execute('Pre-P04 regression tests', ['exec', '--', 'vitest', 'run', ...regressionTests]);

execute('All existing unit tests', ['run', 'test']);

execute('ESLint', ['run', 'lint']);

execute('Prettier', ['run', 'format:check']);

execute('TypeScript typecheck', ['run', 'typecheck']);

execute('Production build', ['run', 'build']);

execute('OpenAPI contract drift check', ['run', 'api:contract:check']);

if (process.argv.includes('--integration')) {
  if (process.env.PRE_P04_NONPROD_ACK !== 'YES') {
    console.error('Integration verification requires PRE_P04_NONPROD_ACK=YES.');

    process.exit(1);
  }

  execute('P03 authentication integration', [
    'run',
    '--workspace=@surat-digital/api',
    'p03:verify',
  ]);
}

console.log('\n====================================');
console.log('PRE-P04 VERIFICATION PASSED');
console.log('====================================');
