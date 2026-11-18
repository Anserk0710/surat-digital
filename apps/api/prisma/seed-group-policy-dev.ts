import 'dotenv/config';

import { createPrismaClient } from '../src/database/prisma-client.js';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed is forbidden in production.');
  }

  if (process.env.P06_DEV_SEED_ACK !== 'YES') {
    throw new Error('P06_DEV_SEED_ACK=YES is required.');
  }

  const employeeId = process.env.P06_DEV_ADMIN_EMPLOYEE_ID;
  const expectedDatabase = process.env.P06_EXPECTED_DATABASE_NAME;
  const connectionString = process.env.DIRECT_URL;

  if (!employeeId || !expectedDatabase || !connectionString) {
    throw new Error('P06 seed configuration is incomplete.');
  }

  const prisma = createPrismaClient(connectionString);

  try {
    const database = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT current_database() AS name
    `;

    if (database[0]?.name !== expectedDatabase) {
      throw new Error('Unexpected database target.');
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        status: 'ACTIVE',
        company: { active: true },
      },
      select: { id: true, companyId: true },
    });

    if (!employee) {
      throw new Error('Development admin employee not found.');
    }

    const group = await prisma.group.findUnique({
      where: {
        companyId_code: {
          companyId: employee.companyId,
          code: 'DEV_ORG_ADMIN',
        },
      },
    });

    if (!group?.active) {
      throw new Error('DEV_ORG_ADMIN group is missing or inactive.');
    }

    const membership = await prisma.employeeGroup.findUnique({
      where: {
        employeeId_groupId: {
          employeeId: employee.id,
          groupId: group.id,
        },
      },
    });

    if (!membership?.active) {
      throw new Error('Employee must already belong to DEV_ORG_ADMIN.');
    }

    const codes = ['Group.View', 'Group.Manage'];
    const permissions = await prisma.permission.findMany({
      where: { code: { in: codes }, active: true },
    });

    if (permissions.length !== codes.length) {
      throw new Error('Run the P02 permission catalog seed first.');
    }

    await prisma.$transaction(
      permissions.map((permission) =>
        prisma.groupPermission.upsert({
          where: {
            groupId_permissionId: {
              groupId: group.id,
              permissionId: permission.id,
            },
          },
          create: {
            groupId: group.id,
            permissionId: permission.id,
            effect: 'ALLOW',
            active: true,
          },
          update: { effect: 'ALLOW', active: true },
        }),
      ),
    );

    console.log(
      JSON.stringify({
        event: 'p06.dev_admin_seed_completed',
        companyId: employee.companyId,
        permissions: codes,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
