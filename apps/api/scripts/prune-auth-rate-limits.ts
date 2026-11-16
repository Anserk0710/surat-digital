import 'dotenv/config';

import { createPrismaClient } from '../src/database/prisma-client.js';

async function main(): Promise<void> {
  const prisma = createPrismaClient();

  try {
    let deletedTotal = 0;

    for (;;) {
      // Bounded batch avoids a large long-running DELETE.
      const deleted = await prisma.$executeRaw`
        DELETE FROM public."auth_rate_limit_buckets"
        WHERE "id" IN (
          SELECT "id"
          FROM public."auth_rate_limit_buckets"
          WHERE "expires_at" < NOW()
          LIMIT 1000
        )
      `;

      deletedTotal += deleted;

      if (deleted < 1000) {
        break;
      }
    }

    console.log(
      JSON.stringify({
        event: 'auth.rate_limit_cleanup',
        deletedCount: deletedTotal,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
