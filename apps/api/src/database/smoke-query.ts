import 'dotenv/config';

import { createPrismaClient } from './prisma-client.js';

interface DatabaseContext {
  currentUser: string;
  currentDatabase: string;
}

const prisma = createPrismaClient();

async function main(): Promise<void> {
  const databaseContext = await prisma.$queryRaw<DatabaseContext[]>`
      SELECT
        current_user AS "currentUser",
        current_database() AS "currentDatabase"
    `;

  const context = databaseContext[0];

  if (!context) {
    throw new Error('Database context query returned no result.');
  }

  const permission = await prisma.permission.findUnique({
    where: {
      code: 'System.Configure',
    },

    select: {
      code: true,
      active: true,
    },
  });

  if (!permission) {
    throw new Error('Smoke query failed: seeded permission not found.');
  }

  console.warn('Prisma smoke query PASS');
  console.warn(`Database: ${context.currentDatabase}`);
  console.warn(`Role: ${context.currentUser}`);
  console.warn(`Permission: ${permission.code}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
