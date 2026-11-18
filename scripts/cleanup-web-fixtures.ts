import { config } from 'dotenv';
config({ path: 'apps/api/.env' });
import { createClient } from '@supabase/supabase-js';

if (process.env.WEB_NONPROD_ACK !== 'YES' || process.env.NODE_ENV === 'production') {
  throw new Error('Non-production acknowledgement required.');
}
const { createPrismaClient } = await import('../apps/api/src/database/prisma-client.js');
const prisma = createPrismaClient();

try {
  const db = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  if (db[0]?.name !== process.env.WEB_EXPECTED_DATABASE_NAME) {
    throw new Error('Unexpected database.');
  }
  const fixtures = (
    await prisma.company.findMany({
      where: { name: 'Browser Verification', code: { startsWith: 'WEB_' } },
      select: { id: true, code: true, createdAt: true },
    })
  ).filter(
    (company) =>
      /^WEB_[0-9a-f]{10}$/.test(company.code) &&
      company.createdAt >= new Date('2026-11-17T00:00:00Z'),
  );
  const provider = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const company of fixtures) {
    const employees = await prisma.employee.findMany({
      where: { companyId: company.id },
      select: { authUserId: true },
    });
    await prisma.authSession.deleteMany({ where: { employee: { companyId: company.id } } });
    await prisma.groupPermission.deleteMany({ where: { group: { companyId: company.id } } });
    await prisma.employeeGroup.deleteMany({ where: { group: { companyId: company.id } } });
    await prisma.group.deleteMany({ where: { companyId: company.id } });
    await prisma.employeeAssignment.deleteMany({ where: { employee: { companyId: company.id } } });
    await prisma.officeDivision.deleteMany({ where: { office: { companyId: company.id } } });
    await prisma.office.deleteMany({ where: { companyId: company.id } });
    await prisma.division.deleteMany({ where: { companyId: company.id } });
    await prisma.jobTitle.deleteMany({ where: { companyId: company.id } });
    await prisma.employee.deleteMany({ where: { companyId: company.id } });
    await prisma.company.delete({ where: { id: company.id } });
    for (const employee of employees) {
      if (employee.authUserId) {
        await provider.auth.admin.deleteUser(employee.authUserId);
      }
    }
  }
  console.log(`Removed ${fixtures.length} browser test companies.`);
} finally {
  await prisma.$disconnect();
}
