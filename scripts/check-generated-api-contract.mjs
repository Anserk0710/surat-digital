import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const generatedArtifacts = [
  'packages/api-contracts/openapi.json',
  'packages/api-client/src/generated/openapi.ts',
];

const missingArtifacts = generatedArtifacts.filter(
  (artifact) => !fs.existsSync(path.join(root, artifact)),
);

if (missingArtifacts.length > 0) {
  console.error('Generated OpenAPI contract artifacts are missing:');
  console.error(missingArtifacts.join('\n'));
  console.error('Run npm run api:contract and commit the generated artifacts.');
  process.exit(1);
}

const before = new Map(
  generatedArtifacts.map((artifact) => [artifact, fs.readFileSync(path.join(root, artifact))]),
);

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? process.env.ComSpec || 'cmd.exe' : 'npm';
const npmArgs = isWindows
  ? ['/d', '/s', '/c', 'npm', 'run', 'api:contract']
  : ['run', 'api:contract'];

const generation = spawnSync(npmCommand, npmArgs, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

if (generation.error) {
  console.error(generation.error.message);
  process.exit(1);
}

if (generation.status !== 0) {
  process.exit(generation.status ?? 1);
}

const changedArtifacts = generatedArtifacts.filter((artifact) => {
  const absolutePath = path.join(root, artifact);

  return (
    !fs.existsSync(absolutePath) || !before.get(artifact).equals(fs.readFileSync(absolutePath))
  );
});

if (changedArtifacts.length > 0) {
  console.error('Generated OpenAPI contract is not synchronized with source.');
  console.error(changedArtifacts.join('\n'));
  process.exit(1);
}

console.log('Generated API contract is synchronized.');
