import 'dotenv/config';
import { createPrismaClient } from '../src/database/prisma-client';
import { permissionCatalog } from '../src/database/permission-catalog';

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  throw new Error('DIRECT_URL is required for Prisma Seed.');
}

const prisma = createPrismaClient(connectionString);

async function main(): Promise<void> {
  await prisma.$transaction(
    permissionCatalog.map((permission) =>
      prisma.permission.upsert({
        where: {
          code: permission.code,
        },

        update: {
          name: permission.name,
          description: permission.description,
          active: true,
        },

        create: {
          code: permission.code,
          name: permission.name,
          description: permission.description,
          active: true,
        },
      }),
    ),
  );

  console.log(`Seed completed: ${permissionCatalog.length} permissions synchronized.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
