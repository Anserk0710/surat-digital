import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const lockfileName = 'package-lock.json';
const sourceLockfile = path.join(root, lockfileName);
const ignoredTopLevel = new Set([
  '.git',
  '.idea',
  '.vscode',
  'node_modules',
  'coverage',
  'dist',
  '.tmp',
]);

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function shouldCopy(source) {
  const relative = path.relative(root, source);
  if (!relative) {
    return true;
  }
  const [topLevel] = relative.split(path.sep);
  return !ignoredTopLevel.has(topLevel);
}

if (!fs.existsSync(sourceLockfile)) {
  console.error(
    'package-lock.json not found. ' + 'Run npm install with the pinned npm version first.',
  );
  process.exit(1);
}

const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'surat-digital-p01-'));
const tempRoot = path.join(tempParent, 'repo');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'cmd.exe' : 'npm';
const npmArgs = isWindows ? ['/d', '/s', '/c', 'npm', 'ci'] : ['ci'];

try {
  fs.cpSync(root, tempRoot, {
    recursive: true,
    filter: shouldCopy,
  });
  const tempLockfile = path.join(tempRoot, lockfileName);
  const beforeHash = sha256(tempLockfile);
  console.log(`Fresh-install sandbox: ${tempRoot}`);
  const install = spawnSync(npmCommand, npmArgs, {
    cwd: tempRoot,
    env: {
      ...process.env,
      CI: 'true',
    },
    stdio: 'inherit',
  });
  if (install.error) {
    throw install.error;
  }
  if (install.status !== 0) {
    throw new Error(`npm ci failed with exit code ${install.status ?? 'unknown'}.`);
  }
  const afterHash = sha256(tempLockfile);
  if (beforeHash !== afterHash) {
    throw new Error('npm ci changed package-lock.json. ' + 'Repository is not reproducible.');
  }
  console.log('P01-T01 local verification PASS: ' + 'npm ci succeeded and lockfile was unchanged.');
} catch (error) {
  console.error(`P01-T01 local verification FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tempParent, {
    recursive: true,
    force: true,
  });
}
