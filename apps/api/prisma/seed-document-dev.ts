import 'dotenv/config';

import { createPrismaClient } from '../src/database/prisma-client.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('P08 development seed is forbidden in production.');
}
if (process.env.P08_DEV_SEED_ACK !== 'YES') {
  throw new Error('P08_DEV_SEED_ACK=YES is required.');
}

const connectionString = process.env.DIRECT_URL;
const expectedDatabase = process.env.P08_EXPECTED_DATABASE_NAME;
if (!connectionString || !expectedDatabase) {
  throw new Error('P08 development seed configuration is incomplete.');
}

const prisma = createPrismaClient(connectionString);
const fixtures = [
  {
    code: 'P08DEV_INTERNAL',
    name: 'Surat Internal (Development)',
    subtype: { code: 'P08DEV_INTERNAL_GENERAL', name: 'Umum (Development)' },
  },
  {
    code: 'P08DEV_SK',
    name: 'Surat Keputusan / SK (Development)',
    subtype: { code: 'P08DEV_SK_GENERAL', name: 'Umum (Development)' },
  },
  {
    code: 'P08DEV_SUBMISSION',
    name: 'Dokumen Pengajuan (Development)',
    subtype: { code: 'P08DEV_SUBMISSION_GENERAL', name: 'Umum (Development)' },
  },
] as const;

try {
  const database = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  if (database[0]?.name !== expectedDatabase) {
    throw new Error('Unexpected P08 development database.');
  }

  for (const fixture of fixtures) {
    const type = await prisma.documentType.upsert({
      where: { code: fixture.code },
      create: {
        code: fixture.code,
        name: fixture.name,
        description: 'Development-only P08 document type.',
        active: true,
      },
      update: { name: fixture.name, active: true },
    });

    await prisma.documentSubtype.upsert({
      where: {
        documentTypeId_code: {
          documentTypeId: type.id,
          code: fixture.subtype.code,
        },
      },
      create: {
        documentTypeId: type.id,
        code: fixture.subtype.code,
        name: fixture.subtype.name,
        description: 'Development-only P08 subtype.',
        active: true,
      },
      update: { name: fixture.subtype.name, active: true },
    });
  }

  console.log('P08 development document master seed completed.');
} finally {
  await prisma.$disconnect();
}
