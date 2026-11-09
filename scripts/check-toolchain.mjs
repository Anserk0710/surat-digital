const EXPECTED_NODE = '26.13.0';
const EXPECTED_NPM = '12.2.2';

const actualNode = process.versions.node;

const userAgent = process.env.npm_config_user_agent ?? '';

const actualNpm = userAgent.match(/(?:^|\s)npm\/([^\s]+)/)?.[1] ?? null;

const errors = [];

if (actualNode !== EXPECTED_NODE) {
  errors.push(`Node.js ${EXPECTED_NODE} required, found ${actualNode}.`);
}

if (actualNpm && actualNpm !== EXPECTED_NPM) {
  errors.push(`npm ${EXPECTED_NPM} required, found ${actualNpm}.`);
}

if (errors.length > 0) {
  console.error('\nToolchain mismatch:');

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  console.error('\nUse the versions pinned in .nvmrc and package.json.');

  process.exit(1);
}

console.log(`Toolchain OK: Node ${actualNode}${actualNpm ? `, npm ${actualNpm}` : ''}`);
