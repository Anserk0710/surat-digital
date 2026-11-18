import 'dotenv/config';

import { createPrismaClient } from '../src/database/prisma-client.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Development seed is forbidden in production.');
}

if (process.env.P05_DEV_SEED_ACK !== 'YES') {
  throw new Error('P05_DEV_SEED_ACK=YES is required.');
}

const directUrl = process.env.DIRECT_URL;

if (!directUrl) {
  throw new Error('DIRECT_URL is required.');
}

const prisma = createPrismaClient(directUrl);

const companyCode = process.env.P05_DEV_COMPANY_CODE || 'CIM';
const companyName = process.env.P05_DEV_COMPANY_NAME || 'PT CIM (Development)';
const adminEmployeeId = process.env.P05_DEV_ADMIN_EMPLOYEE_ID?.trim();

const offices = [
  {
    code: 'PUSAT',
    name: 'Kantor Pusat',
    timezone: 'Asia/Makassar',
  },
  {
    code: 'CABANG_JKT',
    name: 'Kantor Cabang Jakarta',
    timezone: 'Asia/Jakarta',
  },
] as const;

const divisions = [
  ['DIREKSI', 'Direksi'],
  ['SEKRETARIAT', 'Sekretariat'],
  ['KEUANGAN', 'Keuangan'],
  ['SDM', 'Sumber Daya Manusia'],
  ['UMUM', 'Bagian Umum'],
  ['HUKUM', 'Hukum'],
  ['TI', 'Teknologi Informasi'],
  ['OPERASIONAL', 'Operasional'],
  ['PENGADAAN', 'Pengadaan'],
  ['PENGAWASAN', 'Pengawasan'],
] as const;

async function main(): Promise<void> {
  const expectedDb = process.env.P05_EXPECTED_DATABASE_NAME;

  if (!expectedDb) {
    throw new Error('P05_EXPECTED_DATABASE_NAME is required.');
  }

  const database = await prisma.$queryRaw<Array<{ name: string }>>`
  SELECT current_database() AS name
`;

  if (database[0]?.name !== expectedDb) {
    throw new Error('Refusing to seed an unexpected database.');
  }
  const company = await prisma.company.upsert({
    where: { code: companyCode },
    create: {
      code: companyCode,
      name: companyName,
      active: true,
    },
    update: { name: companyName },
  });

  for (const input of offices) {
    await prisma.office.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: input.code,
        },
      },
      create: {
        companyId: company.id,
        ...input,
      },
      update: {
        name: input.name,
        timezone: input.timezone,
      },
    });
  }

  for (const [code, name] of divisions) {
    await prisma.division.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code,
        },
      },
      create: {
        companyId: company.id,
        code,
        name,
      },
      update: { name },
    });
  }

  const headquarters = await prisma.office.findUniqueOrThrow({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'PUSAT',
      },
    },
  });

  const jakarta = await prisma.office.findUniqueOrThrow({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'CABANG_JKT',
      },
    },
  });

  const divisionRows = await prisma.division.findMany({
    where: {
      companyId: company.id,
      code: {
        in: divisions.map(([code]) => code),
      },
    },
  });

  for (const division of divisionRows) {
    await prisma.officeDivision.upsert({
      where: {
        officeId_divisionId: {
          officeId: headquarters.id,
          divisionId: division.id,
        },
      },
      create: {
        officeId: headquarters.id,
        divisionId: division.id,
      },
      update: {},
    });
  }

  const finance = divisionRows.find((item) => item.code === 'KEUANGAN');

  if (!finance) {
    throw new Error('Finance division seed is missing.');
  }

  await prisma.officeDivision.upsert({
    where: {
      officeId_divisionId: {
        officeId: jakarta.id,
        divisionId: finance.id,
      },
    },
    create: {
      officeId: jakarta.id,
      divisionId: finance.id,
    },
    update: {},
  });

  const jobTitle = await prisma.jobTitle.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'STAFF',
      },
    },
    create: {
      companyId: company.id,
      code: 'STAFF',
      name: 'Staff',
    },
    update: { name: 'Staff' },
  });

  if (adminEmployeeId) {
    const employee = await prisma.employee.findFirst({
      where: {
        id: adminEmployeeId,
        companyId: company.id,
      },
    });

    if (!employee) {
      throw new Error('P05_DEV_ADMIN_EMPLOYEE_ID does not belong to the development company.');
    }

    const itDivision = divisionRows.find((item) => item.code === 'TI');

    if (!itDivision) {
      throw new Error('IT division seed is missing.');
    }

    const officeDivision = await prisma.officeDivision.findUniqueOrThrow({
      where: {
        officeId_divisionId: {
          officeId: headquarters.id,
          divisionId: itDivision.id,
        },
      },
    });

    await prisma.employeeAssignment.updateMany({
      where: {
        employeeId: employee.id,
        active: true,
        isPrimary: true,
      },
      data: { isPrimary: false },
    });

    const assignment = await prisma.employeeAssignment.findFirst({
      where: {
        employeeId: employee.id,
        officeDivisionId: officeDivision.id,
      },
    });

    if (assignment) {
      await prisma.employeeAssignment.update({
        where: { id: assignment.id },
        data: {
          jobTitleId: jobTitle.id,
          isPrimary: true,
          active: true,
        },
      });
    } else {
      await prisma.employeeAssignment.create({
        data: {
          employeeId: employee.id,
          officeDivisionId: officeDivision.id,
          jobTitleId: jobTitle.id,
          isPrimary: true,
        },
      });
    }

    const group = await prisma.group.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: 'DEV_ORG_ADMIN',
        },
      },
      create: {
        companyId: company.id,
        code: 'DEV_ORG_ADMIN',
        name: 'Development Organization Admin',
        active: true,
      },
      update: { active: true },
    });

    const permissionCodes = ['System.Configure', 'User.View', 'User.Manage'];

    const permissions = await prisma.permission.findMany({
      where: {
        code: { in: permissionCodes },
        active: true,
      },
    });

    if (permissions.length !== permissionCodes.length) {
      throw new Error('Run the P02 permission catalog seed first.');
    }

    for (const permission of permissions) {
      await prisma.groupPermission.upsert({
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
        update: {
          effect: 'ALLOW',
          active: true,
        },
      });
    }

    await prisma.employeeGroup.upsert({
      where: {
        employeeId_groupId: {
          employeeId: employee.id,
          groupId: group.id,
        },
      },
      create: {
        employeeId: employee.id,
        groupId: group.id,
        active: true,
      },
      update: { active: true },
    });
  }

  console.log(
    JSON.stringify({
      event: 'p05.organization_seed_completed',
      companyCode,
      offices: offices.length,
      seededDivisions: divisions.length,
      developmentAdminConfigured: Boolean(adminEmployeeId),
    }),
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
