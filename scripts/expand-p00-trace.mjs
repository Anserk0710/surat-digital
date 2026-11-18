import fs from 'node:fs';
import prettier from 'prettier';

const srs = fs.readFileSync('docs/baseline/02_SRS.md', 'utf8');
const roadmap = fs.readFileSync('docs/baseline/04_Development_Roadmap.md', 'utf8');
const path = 'docs/governance/requirement-overrides.json';
const trace = JSON.parse(fs.readFileSync(path, 'utf8'));
const nfr = {
  '001': ['Frontend/UX', ['P01', 'P45'], ['P01-FE-T01', 'P45-FE-T01']],
  '002': ['Backend/Security', ['P04', 'P40'], ['P04-T03']],
  '003': ['Backend/Auth', ['P03', 'P04'], ['P03-T01', 'P03-T03', 'P04-T02']],
  '004': ['Backend/IAM', ['P06', 'P07'], ['P06-T01', 'P07-T01']],
  '005': ['Backend/Storage', ['P10', 'P12'], ['P10-T01']],
  '006': ['Backend/Document', ['P13', 'P26'], ['P13-T01']],
  '007': ['Backend/Audit', ['P32'], ['P32-T01']],
  '008': ['DevOps', ['P43', 'P48'], ['P43-T01']],
  '009': ['DevOps', ['P42'], ['P42-T01']],
  '010': ['Architecture', ['P01', 'P02'], ['P01-T02', 'P02-FE-T01']],
  '011': ['Backend/Performance', ['P41'], ['P41-T01']],
  '012': ['Frontend/UX', ['P01', 'P45'], ['P45-FE-T01']],
  '013': ['Backend/Audit', ['P32', 'P42'], ['P32-T01']],
  '014': ['DevOps', ['P42'], ['P42-T03']],
  '015': ['Backend/Worker', ['P33', 'P34'], ['P34-T01']],
  '016': ['DevOps', ['P43'], ['P43-T01']],
  '017': ['Backend/Billing', ['P54', 'P58'], ['P58-T01']],
  '018': ['Backend/Billing', ['P58'], ['P58-T04']],
  '019': ['Backend/External Signing', ['P50', 'P51'], ['P50-T01']],
  '020': ['Backend/Verification', ['P28', 'P51'], ['P28-T01']],
};

const ids = [...srs.matchAll(/^\|\s*((?:FR|NFR)-[A-Z0-9-]+)\s*\|/gm)].map((match) => match[1]);
for (const id of ids) {
  if (trace.requirements[id]) {
    continue;
  }
  let owner;
  let phases;
  let tests;
  if (id.startsWith('NFR-')) {
    [owner, phases, tests] = nfr[id.slice(4)] ?? [];
  } else {
    const domain = id.split('-')[1];
    const rule = trace.domainMappings[domain];
    owner = rule?.owner;
    phases = rule?.phases;
    tests = rule?.tests?.filter((test) => !test.endsWith('-PLANNED'));
    if (tests?.length === 0 && phases?.length > 0) {
      tests = [`${phases[0]}-T01`, `${phases[0]}-FE-T01`];
    }
  }
  if (!owner || !phases?.length || !tests?.length) {
    throw new Error(`Initial trace missing for ${id}.`);
  }
  for (const reference of [...phases, ...tests]) {
    if (!roadmap.includes(reference)) {
      throw new Error(`${id}: ${reference} does not occur in the roadmap.`);
    }
  }
  trace.requirements[id] = {
    owner,
    phases,
    tests,
    reviewed: false,
    notes:
      'P00 initial owner and roadmap trace; verify detailed test coverage in the owning phase.',
  };
}

trace.requirements = Object.fromEntries(
  Object.entries(trace.requirements).sort(([a], [b]) => a.localeCompare(b)),
);
fs.writeFileSync(path, await prettier.format(JSON.stringify(trace), { parser: 'json' }));
console.log(
  `Initial requirement traces: ${ids.length}; explicit mappings: ${Object.keys(trace.requirements).length}.`,
);
