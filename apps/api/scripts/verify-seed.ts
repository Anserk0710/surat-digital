import 'dotenv/config';
import { createPrismaClient } from '../src/database/prisma-client';
import { permissionCatalog } from '../src/database/permission-catalog';

const prisma = createPrismaClient();

async function main(): Promise<void> {
  const expectedCodes = permissionCatalog.map((permission) => permission.code).sort();

  const permissions = await prisma.permission.findMany({
    where: {
      code: {
        in: expectedCodes,
      },
    },

    select: {
      code: true,
    },

    orderBy: {
      code: 'asc',
    },
  });

  const actualCodes = permissions.map((permission) => permission.code);

  if (actualCodes.length !== expectedCodes.length) {
    throw new Error(
      [
        'Permission seed verification failed.',
        `Expected ${expectedCodes.length},`,
        `found ${actualCodes.length}.`,
      ].join(' '),
    );
  }

  if (actualCodes.some((code, index) => code !== expectedCodes[index])) {
    throw new Error('Permission seed verification failed: catalog mismatch.');
  }

  console.log(`Seed verification PASS: ${actualCodes.length} permissions found.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
