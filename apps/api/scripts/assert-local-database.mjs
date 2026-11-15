import 'dotenv/config';

const directUrl = process.env.DIRECT_URL;

if (!directUrl) {
  console.error('DIRECT_URL is required.');

  process.exit(1);
}

if (process.env.ALLOW_LOCAL_DB_RESET !== 'true') {
  console.error(
    ['Local database reset blocked.', 'Set ALLOW_LOCAL_DB_RESET=true explicitly.'].join(' '),
  );

  process.exit(1);
}

const url = new URL(directUrl);

const allowedHosts = new Set(['localhost', '127.0.0.1', '::1']);

if (!allowedHosts.has(url.hostname)) {
  console.error(
    ['Database reset blocked.', `Host "${url.hostname}" is not a local database.`].join(' '),
  );

  process.exit(1);
}

console.log(`Local reset authorized for ${url.hostname}.`);
