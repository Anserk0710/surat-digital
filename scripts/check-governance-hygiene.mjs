import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
for (const app of ['api', 'web', 'document-worker']) {
  const file = `apps/${app}/.env.example`;
  const keys = new Set();
  for (const line of fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/)) {
    const entry = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!entry) {
      continue;
    }
    const [, key, rawValue] = entry;
    const value = rawValue.trim();
    if (keys.has(key)) {
      errors.push(`${file}: duplicate ${key}.`);
    }
    keys.add(key);
    if (/(?:_KEY|SECRET|TOKEN)/.test(key) && value) {
      errors.push(`${file}: ${key} must be empty.`);
    }
    if ((key.endsWith('_ACK') && value) || (key === 'ALLOW_LOCAL_DB_RESET' && value !== 'false')) {
      errors.push(`${file}: ${key} must require an explicit opt-in.`);
    }
  }
}
const decisions = path.join(root, 'docs/decisions');
const numbers = new Set();
for (const name of fs.readdirSync(decisions)) {
  const match = name.match(/^ADR-(\d{4})-.*\.md$/);
  if (!match) {
    continue;
  }
  const number = match[1];
  if (numbers.has(number)) {
    errors.push(`Duplicate ADR-${number}.`);
  }
  numbers.add(number);
  const title = fs.readFileSync(path.join(decisions, name), 'utf8').split(/\r?\n/)[0];
  if (!title.startsWith(`# ADR-${number} `)) {
    errors.push(`${name}: heading number mismatch.`);
  }
}
function checkLinks(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      checkLinks(file);
    } else if (entry.name.endsWith('.md')) {
      for (const match of fs
        .readFileSync(file, 'utf8')
        .matchAll(/\]\(([^)\s]*ADR-\d{4}[^)\s]*\.md)(?:#[^)]*)?\)/g)) {
        if (!fs.existsSync(path.resolve(directory, match[1]))) {
          errors.push(`${path.relative(root, file)}: missing ADR link ${match[1]}.`);
        }
      }
    }
  }
}
checkLinks(path.join(root, 'docs'));
for (const error of errors) {
  console.error(error);
}
console.log(`GOVERNANCE HYGIENE: ${errors.length ? 'FAIL' : 'PASS'}`);
process.exitCode = errors.length ? 1 : 0;
