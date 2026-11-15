import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvironment(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Environment milik proses selalu lebih diprioritaskan.
    if (process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
}

function reject(reason) {
  console.error(`[Database Safety] RESET BLOCKED: ${reason}`);
  process.exit(1);
}

// API workspace merupakan sumber konfigurasi Prisma CLI.
loadEnvironment(path.join(workspaceRoot, 'apps/api/.env'));
loadEnvironment(path.join(workspaceRoot, '.env'));

if (process.env.ALLOW_LOCAL_DB_RESET !== 'true') {
  reject('ALLOW_LOCAL_DB_RESET=true is required.');
}

const directUrl = process.env.DIRECT_URL;
const expectedDatabase = process.env.LOCAL_DB_RESET_DATABASE?.trim();

if (!directUrl) {
  reject('DIRECT_URL is required.');
}

if (!expectedDatabase) {
  reject('LOCAL_DB_RESET_DATABASE is required.');
}

let url;

try {
  url = new URL(directUrl);
} catch {
  reject('DIRECT_URL is invalid.');
}

if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
  reject('Only PostgreSQL URLs are allowed.');
}

const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

if (!allowedHosts.has(url.hostname.toLowerCase())) {
  reject('Target hostname is not a local loopback address.');
}

// Hindari alternatif connection target lewat query parameter.
for (const key of ['host', 'hostaddr', 'service']) {
  if (url.searchParams.has(key)) {
    reject(`Connection override "${key}" is prohibited.`);
  }
}

let databaseName;

try {
  databaseName = decodeURIComponent(url.pathname.slice(1));
} catch {
  reject('Invalid database name.');
}

if (databaseName !== expectedDatabase) {
  reject('Target database name does not match the authorized database.');
}

console.log(`[Database Safety] Authorized local database "${databaseName}" on "${url.hostname}".`);
