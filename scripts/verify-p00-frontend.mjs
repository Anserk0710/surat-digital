import fs from 'node:fs';

const srs = fs.readFileSync('docs/baseline/02_SRS.md', 'utf8');
const mapping = JSON.parse(fs.readFileSync('docs/traceability/frontend-screen-map.json', 'utf8'));
const ids = srs
  .split(/\r?\n/)
  .filter((line) => line.trim().startsWith('|'))
  .map((line) =>
    line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim()),
  )
  .filter((cells) => /^FR-[A-Z]+-\d+[A-Z]?$/.test(cells[0] ?? '') && cells[2] === 'Must')
  .map((cells) => cells[0]);
const missing = ids.filter((id) => {
  const domain = id.replace(/-\d+[A-Z]?$/, '');
  const target = mapping.domains[domain];
  return (
    !target?.screen || !target?.route || !target?.permission || !target?.states || !target?.uat
  );
});
const passed = ids.length > 0 && missing.length === 0;
fs.writeFileSync(
  'docs/evidence/P00/frontend.json',
  JSON.stringify(
    {
      testId: 'P00-FE-T01',
      status: passed ? 'PASS' : 'FAIL',
      baselineVersion: mapping.version,
      mustRequirements: ids.length,
      missing,
      artifactPath: 'docs/traceability/frontend-screen-map.json',
      executedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + '\n',
);

if (!passed) {
  console.error(`P00-FE-T01 FAIL: ${missing.join(', ') || 'no Must requirements found'}`);
  process.exitCode = 1;
} else {
  console.log(
    `P00-FE-T01 PASS: ${ids.length} Must requirements have screen/flow, permission, states, and UAT trace.`,
  );
}
