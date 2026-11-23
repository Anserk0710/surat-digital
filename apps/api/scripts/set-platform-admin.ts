import 'dotenv/config';
import { createPrismaClient } from '../src/database/prisma-client.js';

const employeeId = process.env.PLATFORM_ADMIN_EMPLOYEE_ID;
const expectedAuthUserId = process.env.PLATFORM_ADMIN_AUTH_USER_ID;
const expectedDatabase = process.env.PLATFORM_ADMIN_EXPECTED_DATABASE_NAME;
const expectedHost = process.env.PLATFORM_ADMIN_EXPECTED_DATABASE_HOST;
const action = process.env.PLATFORM_ADMIN_ACTION;
const directUrl = process.env.DIRECT_URL;

if (
  process.env.PLATFORM_ADMIN_ACK !== 'YES' ||
  !directUrl ||
  !expectedDatabase ||
  !expectedHost ||
  !employeeId ||
  !expectedAuthUserId ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId) ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expectedAuthUserId) ||
  !['grant', 'revoke'].includes(action ?? '')
) {
  throw new Error(
    'DIRECT_URL, PLATFORM_ADMIN_ACK=YES, expected host/database, employee/auth UUIDs, and grant/revoke action are required.',
  );
}

if (new URL(directUrl).hostname !== expectedHost) {
  throw new Error('Refusing to modify an unexpected database host.');
}

const prisma = createPrismaClient(directUrl);
try {
  const database = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  if (database[0]?.name !== expectedDatabase) {
    throw new Error('Refusing to modify an unexpected database.');
  }
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.status !== 'ACTIVE' || employee.authUserId !== expectedAuthUserId) {
    throw new Error('The employee must be active and linked to the expected auth account.');
  }
  await prisma.employee.update({
    where: { id: employeeId },
    data: { isPlatformAdmin: action === 'grant' },
  });
  process.stdout.write(`Platform administrator ${action} completed for ${employeeId}.\n`);
} finally {
  await prisma.$disconnect();
}
