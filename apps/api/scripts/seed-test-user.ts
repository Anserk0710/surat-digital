/**
 * seed-test-user.ts
 *
 * Membuat 1 user test yang siap digunakan untuk login.
 * Jalankan dengan: tsx scripts/seed-test-user.ts
 *
 * Prasyarat:
 *   - DIRECT_URL         → koneksi langsung PostgreSQL (prisma)
 *   - SUPABASE_URL       → URL project Supabase
 *   - SUPABASE_SERVICE_ROLE_KEY → service role key (bukan anon key)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createPrismaClient } from '../src/database/prisma-client.js';

// ─────────────────────────────────────────────
// Konfigurasi user test — ubah sesuka hati
// ─────────────────────────────────────────────
const TEST_USER = {
  companyCode: 'CIM',
  companyName: 'PT CIM (Test)',
  employeeNumber: 'EMP-001',
  username: 'admin.test',
  email: 'admin.test@cim.local',
  fullName: 'Admin Test',
  password: 'Admin@12345!',
} as const;
// ─────────────────────────────────────────────

function requiredEnv(name: string): string {
  const val = process.env[name];
  if (!val?.trim()) {
    throw new Error(`ENV ${name} wajib diisi.`);
  }
  return val.trim();
}

const directUrl = requiredEnv('DIRECT_URL');
const supabaseUrl = requiredEnv('SUPABASE_URL');
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

const prisma = createPrismaClient(directUrl);

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function main() {
  console.log('🌱  Seed Test User');
  console.log('══════════════════════════════════════════');

  // 1. Buat / ambil user Supabase Auth
  console.log(`\n[1/4] Menyiapkan Supabase Auth user: ${TEST_USER.email}`);

  // Cek apakah user sudah ada lewat listUsers (filter email)
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });

  let authUserId: string;
  const existing = listData?.users?.find((u) => u.email === TEST_USER.email);

  if (existing) {
    console.log(`      ✔ User sudah ada (id: ${existing.id}). Update password...`);

    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: TEST_USER.password,
      email_confirm: true,
    });

    if (error) {
      throw new Error(`Gagal update Supabase user: ${error.message}`);
    }

    authUserId = existing.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(`Gagal buat Supabase user: ${error?.message}`);
    }

    authUserId = data.user.id;
    console.log(`      ✔ Supabase Auth user dibuat (id: ${authUserId})`);
  }

  // 2. Buat / ambil Company
  console.log(`\n[2/4] Menyiapkan Company: ${TEST_USER.companyCode}`);

  const company = await prisma.company.upsert({
    where: { code: TEST_USER.companyCode },
    update: { name: TEST_USER.companyName, active: true },
    create: { code: TEST_USER.companyCode, name: TEST_USER.companyName, active: true },
  });

  console.log(`      ✔ Company: ${company.name} (id: ${company.id})`);

  // 3. Buat / update Employee
  console.log(`\n[3/4] Menyiapkan Employee: ${TEST_USER.username}`);

  const usernameNormalized = TEST_USER.username.normalize('NFKC').trim().toLowerCase();
  const emailNormalized = TEST_USER.email.normalize('NFKC').trim().toLowerCase();

  // Cek apakah employee sudah ada
  const existingEmployee = await prisma.employee.findFirst({
    where: {
      companyId: company.id,
      emailNormalized,
    },
  });

  let employeeId: string;

  if (existingEmployee) {
    console.log(
      `      ✔ Employee sudah ada (id: ${existingEmployee.id}). Memastikan ACTIVE & authUserId...`,
    );

    const updated = await prisma.employee.update({
      where: { id: existingEmployee.id },
      data: {
        authUserId,
        status: 'ACTIVE',
        username: TEST_USER.username,
        usernameNormalized,
        fullName: TEST_USER.fullName,
      },
    });

    employeeId = updated.id;
  } else {
    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        authUserId,
        employeeNumber: TEST_USER.employeeNumber,
        username: TEST_USER.username,
        usernameNormalized,
        email: TEST_USER.email,
        emailNormalized,
        fullName: TEST_USER.fullName,
        status: 'ACTIVE',
      },
    });

    employeeId = employee.id;
    console.log(`      ✔ Employee dibuat (id: ${employeeId})`);
  }

  // 4. Ringkasan
  console.log('\n[4/4] ✅  Seed selesai!\n');
  console.log('══════════════════════════════════════════');
  console.log('  Credential untuk Test Login');
  console.log('══════════════════════════════════════════');
  console.log(`  Company        : ${TEST_USER.companyName} (${TEST_USER.companyCode})`);
  console.log(`  Employee ID    : ${employeeId}`);
  console.log(`  Employee Number: ${TEST_USER.employeeNumber}`);
  console.log(`  Username       : ${TEST_USER.username}`);
  console.log(`  Email          : ${TEST_USER.email}`);
  console.log(`  Password       : ${TEST_USER.password}`);
  console.log('══════════════════════════════════════════');
  console.log('\n  Login bisa menggunakan salah satu identifier:');
  console.log(`    • Username  → "${TEST_USER.username}"`);
  console.log(`    • Email     → "${TEST_USER.email}"`);
  console.log(`    • NIP/No.   → "${TEST_USER.employeeNumber}"`);
  console.log('');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
