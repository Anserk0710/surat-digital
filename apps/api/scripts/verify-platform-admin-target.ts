import 'dotenv/config';
import { createPrismaClient } from '../src/database/prisma-client.js';

const directUrl = process.env.DIRECT_URL;
const employeeId = process.env.PLATFORM_ADMIN_EMPLOYEE_ID;
const expectedAuthUserId = process.env.PLATFORM_ADMIN_AUTH_USER_ID;
const expectedHost = process.env.PLATFORM_ADMIN_EXPECTED_DATABASE_HOST;
const expectedDatabase = process.env.PLATFORM_ADMIN_EXPECTED_DATABASE_NAME;

if (!directUrl || !employeeId || !expectedAuthUserId || !expectedHost || !expectedDatabase) {
  throw new Error('Database target and employee/auth IDs are required.');
}
if (new URL(directUrl).hostname !== expectedHost) {
  throw new Error('Unexpected database host.');
}

const prisma = createPrismaClient(directUrl);
try {
  const database = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  if (database[0]?.name !== expectedDatabase) {
    throw new Error('Unexpected database name.');
  }
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      authUserId: string | null;
      status: string;
      companyActive: boolean;
      isPlatformAdmin: boolean;
    }>
  >`
    SELECT e.id, e.auth_user_id AS "authUserId", e.status::text AS status,
           c.active AS "companyActive", e.is_platform_admin AS "isPlatformAdmin"
    FROM public.employees e
    JOIN public.companies c ON c.id = e.company_id
    WHERE e.id = ${employeeId}::uuid
  `;
  const employee = rows[0];
  if (
    !employee ||
    employee.authUserId !== expectedAuthUserId ||
    employee.status !== 'ACTIVE' ||
    !employee.companyActive ||
    !employee.isPlatformAdmin
  ) {
    throw new Error('Employee/auth IDs do not match an active account in an active company.');
  }
  const auditTable = await prisma.$queryRaw<
    Array<{
      rls: boolean;
      canSelect: boolean;
      canInsert: boolean;
      canUpdate: boolean;
      canDelete: boolean;
    }>
  >`
    SELECT c.relrowsecurity AS rls,
      has_table_privilege('surat_runtime', c.oid, 'SELECT') AS "canSelect",
      has_table_privilege('surat_runtime', c.oid, 'INSERT') AS "canInsert",
      has_table_privilege('surat_runtime', c.oid, 'UPDATE') AS "canUpdate",
      has_table_privilege('surat_runtime', c.oid, 'DELETE') AS "canDelete"
    FROM pg_class c
    WHERE c.oid = to_regclass('public.organization_changes')
  `;
  const audit = auditTable[0];
  if (!audit?.rls || !audit.canSelect || !audit.canInsert || audit.canUpdate || audit.canDelete) {
    throw new Error(
      `Organization change history table permissions are invalid: ${JSON.stringify(audit ?? null)}`,
    );
  }
  process.stdout.write('Platform administrator target verification PASS.\n');
} finally {
  await prisma.$disconnect();
}
