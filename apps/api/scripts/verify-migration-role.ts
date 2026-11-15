import 'dotenv/config';

import pg from 'pg';

import { normalizePostgresConnectionString } from '../src/database/postgres-connection-string.js';

interface MigrationRoleInfo {
  currentUser: string;
  isSuperuser: boolean;
  canCreateDatabase: boolean;
  canCreateRole: boolean;
  bypassRls: boolean;
  canCreateInPublic: boolean;
}

interface UnownedRelation {
  relationName: string;
  relationOwner: string;
}

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const connectionString = requiredEnvironmentVariable('DIRECT_URL');
const expectedMigrationRole = process.env.P02_MIGRATION_ROLE_NAME?.trim() || 'surat_migrator';
const connectionUrl = new URL(connectionString);
const configuredRole = decodeURIComponent(connectionUrl.username).split('.')[0];

if (configuredRole !== expectedMigrationRole) {
  throw new Error(
    `DIRECT_URL must use PostgreSQL role "${expectedMigrationRole}", found "${configuredRole}".`,
  );
}

const pool = new pg.Pool({
  connectionString: normalizePostgresConnectionString(connectionString),
});

try {
  const roleResult = await pool.query<MigrationRoleInfo>(`
    SELECT
      current_user AS "currentUser",
      role.rolsuper AS "isSuperuser",
      role.rolcreatedb AS "canCreateDatabase",
      role.rolcreaterole AS "canCreateRole",
      role.rolbypassrls AS "bypassRls",
      has_schema_privilege(current_user, 'public', 'CREATE') AS "canCreateInPublic"
    FROM pg_roles AS role
    WHERE role.rolname = current_user
  `);

  const role = roleResult.rows[0];

  if (!role) {
    throw new Error('Unable to resolve PostgreSQL migration role.');
  }

  if (role.currentUser !== expectedMigrationRole) {
    throw new Error(
      `DIRECT_URL must connect as "${expectedMigrationRole}", found "${role.currentUser}".`,
    );
  }

  if (
    role.isSuperuser ||
    role.canCreateDatabase ||
    role.canCreateRole ||
    role.bypassRls ||
    !role.canCreateInPublic
  ) {
    throw new Error(`Migration role has unexpected privileges: ${JSON.stringify(role)}`);
  }

  const ownershipResult = await pool.query<UnownedRelation>(`
    SELECT
      class.relname AS "relationName",
      pg_get_userbyid(class.relowner) AS "relationOwner"
    FROM pg_class AS class
    JOIN pg_namespace AS namespace
      ON namespace.oid = class.relnamespace
    LEFT JOIN pg_depend AS dependency
      ON dependency.objid = class.oid
      AND dependency.deptype = 'e'
    WHERE namespace.nspname = 'public'
      AND class.relkind IN ('r', 'p', 'S')
      AND dependency.objid IS NULL
      AND class.relowner <> (SELECT oid FROM pg_roles WHERE rolname = current_user)
    ORDER BY class.relname
    LIMIT 10
  `);

  if (ownershipResult.rows.length > 0) {
    throw new Error(
      `Migration role does not own application relations: ${JSON.stringify(ownershipResult.rows)}`,
    );
  }

  console.log('Migration role verification PASS.');
} finally {
  await pool.end();
}
