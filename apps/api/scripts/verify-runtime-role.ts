import 'dotenv/config';

import { createPrismaClient } from '../src/database/prisma-client.js';

interface RuntimeRoleInfo {
  currentUser: string;
  isSuperuser: boolean;
  canCreateDatabase: boolean;
  canCreateRole: boolean;
  bypassRls: boolean;
  canCreateInPublic: boolean;
  canCreateDatabaseObjects: boolean;
}

interface ProbeRelation {
  relationName: string | null;
}

const prisma = createPrismaClient();

const expectedRuntimeRole = process.env.P02_RUNTIME_ROLE_NAME ?? 'surat_runtime';

const probeTable = '__p02_runtime_ddl_probe';

function isPermissionDenied(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  const normalized = message.toLowerCase();

  return normalized.includes('permission denied') || normalized.includes('42501');
}

async function verifyRoleAttributes(): Promise<void> {
  const rows = await prisma.$queryRaw<RuntimeRoleInfo[]>`
      SELECT
        current_user AS "currentUser",
        role.rolsuper AS "isSuperuser",
        role.rolcreatedb AS "canCreateDatabase",
        role.rolcreaterole AS "canCreateRole",
        role.rolbypassrls AS "bypassRls",
        has_schema_privilege(
          current_user,
          'public',
          'CREATE'
        ) AS "canCreateInPublic",
        has_database_privilege(
          current_user,
          current_database(),
          'CREATE'
        ) AS "canCreateDatabaseObjects"
      FROM pg_roles AS role
      WHERE role.rolname = current_user
    `;

  const role = rows[0];

  if (!role) {
    throw new Error('Unable to resolve PostgreSQL runtime role.');
  }

  if (role.currentUser !== expectedRuntimeRole) {
    throw new Error(
      [
        'Unexpected runtime role.',
        `Expected "${expectedRuntimeRole}",`,
        `found "${role.currentUser}".`,
      ].join(' '),
    );
  }

  const dangerousPrivileges = [
    role.isSuperuser,
    role.canCreateDatabase,
    role.canCreateRole,
    role.bypassRls,
    role.canCreateInPublic,
    role.canCreateDatabaseObjects,
  ];

  if (dangerousPrivileges.some(Boolean)) {
    throw new Error(`Runtime role has forbidden privileges: ${JSON.stringify(role)}`);
  }

  console.log('Runtime role attributes PASS.');
}

async function verifyDdlDenied(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `
        CREATE TABLE public.${probeTable} (
          id INTEGER PRIMARY KEY
        )
      `,
    );

    try {
      await prisma.$executeRawUnsafe(`DROP TABLE public.${probeTable}`);
    } catch {
      // Best-effort cleanup.
    }

    throw new Error('Runtime role unexpectedly created a table.');
  } catch (error) {
    if (!isPermissionDenied(error)) {
      throw error;
    }
  }

  const relations = await prisma.$queryRaw<ProbeRelation[]>`
      SELECT
        to_regclass(
          'public.__p02_runtime_ddl_probe'
        )::text AS "relationName"
    `;

  if (relations[0]?.relationName) {
    throw new Error('DDL probe table exists unexpectedly.');
  }

  console.log('Runtime DDL rejection PASS.');
}

async function main(): Promise<void> {
  await verifyRoleAttributes();
  await verifyDdlDenied();

  console.log('P02-T03 PASS: runtime role cannot perform schema migration.');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
