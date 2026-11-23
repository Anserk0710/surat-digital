import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requiredPhaseTests, validateEvidence } from './phase-evidence.mjs';

export function checkPhaseEvidence(root, phaseId, frontend = false) {
  const artifactPath = `docs/evidence/${phaseId}/${frontend ? 'frontend' : 'verification'}.json`;
  try {
    const evidence = JSON.parse(fs.readFileSync(new URL(artifactPath, root), 'utf8'));
    return validateEvidence(evidence, { phaseId, artifactPath, frontend });
  } catch {
    return ['Evidence file is missing or invalid JSON.'];
  }
}

// Importing this module never executes a command or writes evidence.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = new URL('../', import.meta.url);
  let failed = false;
  for (const phaseId of Object.keys(requiredPhaseTests)) {
    for (const frontend of [false, true]) {
      const errors = checkPhaseEvidence(root, phaseId, frontend);
      console.log(
        `${phaseId} ${frontend ? 'frontend' : 'backend'}: ${errors.length ? errors.join(' ') : 'PASS'}`,
      );
      failed ||= errors.length > 0;
    }
  }
  process.exitCode = failed ? 1 : 0;
}
