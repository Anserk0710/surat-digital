import fs from 'node:fs';

const contract = JSON.parse(
  fs.readFileSync(new URL('../docs/governance/phase-gates.json', import.meta.url), 'utf8'),
);
const backendTests = (phase, count) =>
  Array.from({ length: count }, (_, i) => `${phase}-T${String(i + 1).padStart(2, '0')}`);
export const requiredPhaseTests = {
  P02: [...backendTests('P02', 4), 'P02-T04-SMOKE'],
  P03: backendTests('P03', 4),
  P04: backendTests('P04', 4),
  P05: backendTests('P05', 5),
  P06: backendTests('P06', 4),
  P07: [...backendTests('P07', 4), 'P07-FE-T01'],
  P08: [...backendTests('P08', 4), 'P08-FE-T01'],
  P09: [...backendTests('P09', 4), 'P09-FE-T01'],
};

// Each group links named tests to the command that actually exercised them.
export function phaseTestRecords(phaseId, groups) {
  return groups.flatMap(({ testIds, step }) =>
    testIds.map((testId) => ({
      phaseId,
      testId,
      status: step?.status ?? 'NOT_RUN',
      executedAt: step?.executedAt
        ? new Date(step.executedAt).toISOString()
        : new Date().toISOString(),
      command: step?.command ?? 'Not executed',
      result:
        step?.status === 'PASS'
          ? 'Verification command passed.'
          : 'Verification did not pass or was not executed.',
      artifactPath: `docs/evidence/${phaseId}/verification.json`,
    })),
  );
}

function isTimestamp(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

export function validateEvidence(evidence, { phaseId, artifactPath, frontend = false }) {
  const errors = [];
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return ['Evidence must be an object.'];
  }
  if (evidence.phaseId !== phaseId) {
    errors.push('phaseId does not match the requested phase.');
  }
  if (!isTimestamp(evidence.executedAt)) {
    errors.push('executedAt must be a valid UTC ISO timestamp.');
  }
  if (!frontend && evidence.overallStatus !== 'PASS') {
    errors.push('overallStatus must be PASS.');
  }
  const records = frontend ? [evidence] : evidence.verification;
  if (!Array.isArray(records) || records.length === 0) {
    return [...errors, 'verification must contain test records.'];
  }
  const seen = new Set();
  for (const [index, record] of records.entries()) {
    const prefix = `record ${index + 1}`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      errors.push(`${prefix}: must be an object.`);
      continue;
    }
    for (const field of contract.evidenceRequiredFields) {
      if (typeof record[field] !== 'string' || !record[field].trim()) {
        errors.push(`${prefix}: ${field} must be a non-empty string.`);
      }
    }
    if (record.phaseId !== phaseId) {
      errors.push(`${prefix}: phaseId mismatch.`);
    }
    if (typeof record.testId !== 'string' || !record.testId.startsWith(`${phaseId}-`)) {
      errors.push(`${prefix}: testId mismatch.`);
    }
    if (seen.has(record.testId)) {
      errors.push(`${prefix}: duplicate testId.`);
    }
    seen.add(record.testId);
    if (!contract.allowedTestStatuses.includes(record.status)) {
      errors.push(`${prefix}: unsupported status.`);
    } else if (record.status !== 'PASS') {
      errors.push(`${prefix}: test has not passed (${record.status}).`);
    }
    if (!isTimestamp(record.executedAt)) {
      errors.push(`${prefix}: invalid executedAt.`);
    }
    if (record.artifactPath !== artifactPath) {
      errors.push(`${prefix}: artifactPath mismatch.`);
    }
  }
  const required = frontend ? [`${phaseId}-FE-T01`] : requiredPhaseTests[phaseId];
  if (!required) {
    errors.push('Unknown phase.');
  }
  for (const testId of required ?? []) {
    if (!seen.has(testId)) {
      errors.push(`Missing required test ${testId}.`);
    }
  }
  return errors;
}
