# Project Documentation & Folder Structure

## Surat Digital

**Versi:** 1.3  
**Package manager:** npm

## 1. Rekomendasi repository

Gunakan monorepo berbasis npm workspaces. Frontend, API, worker, shared packages, Prisma schema/migrations, dan dokumentasi berada dalam satu repository, tetapi deployment dilakukan secara terpisah.

- `apps/web`: React, dibangun dan diunggah ke cPanel.
- `apps/api`: NestJS API, dideploy ke Vercel.
- `apps/document-worker`: worker/container pemrosesan dokumen.
- `packages/*`: shared types, validation, dan API contracts.
- `apps/api/prisma`: Prisma schema, migrations, dan seed.
- `supabase`: konfigurasi Supabase dan pgTAP/RLS tests; bukan jalur utama migration schema aplikasi.
- `docs`: dokumentasi produk dan teknis.

Gunakan npm. Jangan menggunakan pnpm atau yarn untuk repository ini.

## 2. Struktur folder

```text
surat-digital/
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── .gitignore
├── .editorconfig
├── .nvmrc
├── package.json
├── package-lock.json
│
├── apps/
│   ├── web/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   ├── document/
│   │   │   │   ├── workflow/
│   │   │   │   ├── signature/
│   │   │   │   └── admin/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   ├── styles/
│   │   │   └── types/
│   │   ├── tests/
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   │       ├── migration_lock.toml
│   │   │       └── <timestamp>_<migration_name>/
│   │   │           └── migration.sql
│   │   ├── prisma.config.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── pipes/
│   │   │   │   └── utils/
│   │   │   ├── database/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   ├── prisma.service.ts
│   │   │   │   └── rls-context/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── organization/
│   │   │   │   ├── access-control/
│   │   │   │   ├── documents/
│   │   │   │   ├── document-files/
│   │   │   │   ├── document-processing/
│   │   │   │   ├── templates/
│   │   │   │   ├── form-builder/
│   │   │   │   ├── workflow/
│   │   │   │   ├── signatures/
│   │   │   │   ├── numbering/
│   │   │   │   ├── notifications/
│   │   │   │   ├── archive/
│   │   │   │   ├── audit/
│   │   │   │   └── system/
│   │   │   ├── integrations/
│   │   │   │   ├── supabase-auth/
│   │   │   │   ├── vercel-blob/
│   │   │   │   ├── queue/
│   │   │   │   └── email/
│   │   │   └── config/
│   │   ├── test/
│   │   ├── vercel.json
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── document-worker/
│       ├── src/
│       │   ├── worker.ts
│       │   ├── jobs/
│       │   ├── parsers/
│       │   ├── converters/
│       │   ├── ocr/
│       │   ├── scanners/
│       │   ├── callbacks/
│       │   └── config/
│       ├── tests/
│       ├── Dockerfile
│       ├── .env.example
│       └── package.json
│
├── packages/
│   ├── shared-types/
│   ├── api-contracts/
│   ├── validation/
│   └── eslint-config/
│
├── supabase/
│   ├── config.toml
│   └── tests/
│       ├── rls/
│       ├── constraints/
│       └── numbering/
│
├── docs/
│   ├── product/
│   ├── design/
│   ├── architecture/
│   ├── database/
│   ├── document-processing/
│   ├── api/
│   ├── testing/
│   ├── deployment/
│   ├── operations/
│   └── decisions/
│
├── infra/
│   ├── cpanel/
│   ├── vercel/
│   ├── worker/
│   ├── queue/
│   ├── monitoring/
│   └── backup/
│
├── scripts/
│   ├── import-employees/
│   ├── seed-admin/
│   ├── verify-storage/
│   └── release/
│
└── tests/
    ├── e2e/
    ├── security/
    ├── performance/
    └── uat/
```

Catatan: `prisma.config.ts` berada satu kali di root package API (`apps/api/prisma.config.ts`). Jika tooling atau versi Prisma yang dipilih membutuhkan lokasi berbeda, struktur disesuaikan tanpa mengubah prinsip bahwa Prisma Migrate mengelola migration.

### Struktur tambahan v1.3 yang wajib

```text
apps/api/src/
  auth/                 # Auth gateway/BFF ke Supabase Auth
  document-integrity/   # Canonical manifest + hashing
  workflow-recovery/    # Audited participant replacement
  outbox/               # Transactional outbox publisher/reconciliation
  internal/             # Worker callbacks/admin-internal commands

packages/
  api-client/            # Generated dari OpenAPI; jangan diedit manual
  api-contracts/         # Hanya shared primitives bila tidak berasal dari OpenAPI

docs/
  traceability/          # RTM/report coverage bila dipisah dari file utama
```

Generated API client/types berasal dari OpenAPI agar frontend/backend tidak memelihara DTO yang sama secara manual.

## 3. npm workspace

Root `package.json` menggunakan `workspaces` untuk package yang memang dikelola bersama. Commit `package-lock.json` dan gunakan `npm ci` pada CI/deployment build.

Contoh scripts root yang dapat disesuaikan:

```json
{
  "private": true,
  "workspaces": [
    "apps/web",
    "apps/api",
    "apps/document-worker",
    "packages/*"
  ],
  "scripts": {
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "build": "npm run build --workspaces --if-present"
  }
}
```

## 4. Tanggung jawab folder

### Frontend (`apps/web`)

- Presentasi dan interaksi pengguna.
- Memanggil NestJS API untuk data aplikasi.
- Tidak melakukan query langsung ke tabel aplikasi menggunakan Supabase Data API.
- Tidak menyimpan database URL, service role key, Blob token, atau secret.
- Menampilkan status processing, preview, dan review file.

### Backend (`apps/api`)

- Validasi token Supabase Auth.
- Resolve employee aktif dan Group Policy.
- Backend authorization dan state machine.
- Prisma Client sebagai jalur utama akses tabel aplikasi.
- Transaksi database dan RLS context.
- Upload/download Vercel Blob melalui server.
- Dispatch processing job dan menerima callback worker.
- Signature, numbering, audit, dan notification.

### Prisma (`apps/api/prisma`)

- `schema.prisma`: model tabel aplikasi.
- `migrations/`: migration yang dibuat/dijalankan dengan Prisma Migrate.
- SQL kustom di migration Prisma untuk RLS policies, triggers, functions, partial indexes, dan fitur PostgreSQL yang belum direpresentasikan langsung oleh Prisma Schema.
- `seed.ts`: data awal yang dikelola Prisma Seed.
- Jangan memodifikasi migration yang sudah diterapkan di environment bersama.

### Document Worker (`apps/document-worker`)

- Validasi ulang file sebelum parsing.
- Ekstraksi PDF, DOC/DOCX, XLS/XLSX.
- OCR fallback PDF scan.
- Konversi Office ke PDF.
- Pembuatan preview.
- Hash dan pemeriksaan integritas.
- Callback hasil ke internal endpoint NestJS.
- Tidak menyediakan endpoint publik tanpa autentikasi internal.

### Supabase

- Menyediakan PostgreSQL dan Supabase Auth.
- Menyimpan konfigurasi lokal Supabase.
- `supabase/tests` dapat berisi pgTAP/RLS tests.
- Bukan folder utama migration schema aplikasi; migration utama berada di Prisma.

## 5. Database naming standards

- Tabel: plural `snake_case`.
- Kolom: `snake_case`.
- Primary key: UUID.
- Foreign key: `<entity>_id`.
- Timestamp: `timestamptz`.
- Prisma model dapat menggunakan PascalCase dan `@@map`/`@map` untuk memetakan nama tabel/kolom PostgreSQL.
- `auth.users` dikelola Supabase Auth; `employees.auth_user_id` menyimpan referensi UUID dan tidak diperlakukan sebagai model aplikasi yang dimigrasikan Prisma.

## 6. Environment files

Sediakan `.env.example` tanpa nilai rahasia.

### Frontend

```env
VITE_API_BASE_URL=
VITE_APP_NAME=Surat Digital
```

Frontend tidak memerlukan Supabase URL/key untuk login pada desain v1.2 karena seluruh auth flow melewati NestJS.

### Backend API

```env
NODE_ENV=
PORT=
APP_BASE_URL=
FRONTEND_ORIGIN=
DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VERCEL_BLOB_READ_WRITE_TOKEN=
QUEUE_CONNECTION_URL=
EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
LOG_LEVEL=
```

`DATABASE_URL` adalah koneksi runtime aplikasi (umumnya transaction pooler Supabase untuk serverless). `DIRECT_URL` adalah koneksi direct/session yang dipakai Prisma CLI/Migrate sesuai konfigurasi Prisma yang dipilih. Keduanya disimpan di server environment, bukan frontend.

`SUPABASE_SERVICE_ROLE_KEY` hanya dipasang jika ada kebutuhan administratif Supabase Auth yang sah; jangan gunakan sebagai database connection Prisma dan jangan pernah expose ke browser.

### Document Worker

```env
NODE_ENV=
QUEUE_CONNECTION_URL=
VERCEL_BLOB_READ_WRITE_TOKEN=
INTERNAL_API_BASE_URL=
INTERNAL_WORKER_TOKEN=
MALWARE_SCANNER_PROVIDER=
MALWARE_SCANNER_ENDPOINT=
MALWARE_SCANNER_TOKEN=
LOG_LEVEL=
```

Worker hanya menerima secret yang diperlukan. Jangan mencatat isi dokumen, token, atau PIN ke log.

## 7. Dokumentasi wajib per module

Setiap module minimal memiliki:

- `README.md`: tujuan dan batas modul.
- `API.md`: endpoint dan DTO.
- `BUSINESS_RULES.md`: aturan bisnis.
- `TESTS.md`: skenario test.
- `ADR` jika ada keputusan arsitektur khusus.

## 8. Architecture Decision Records

Buat ADR untuk keputusan seperti:

- Supabase PostgreSQL + Prisma ORM.
- Prisma Migrate dan Prisma Seed.
- Runtime DB role dan RLS context.
- Vercel Blob private access.
- Document processing worker dan queue.
- Transactional outbox dan reconciliation.
- Canonical Document Manifest dan signature binding.
- Atomic Creator Sign+Submit.
- Number reservation sebelum final PDF.
- Workflow Knowing sebelum Approval.
- Workflow Recovery dan runtime permission re-check.
- NestJS Auth Gateway/BFF dan session storage/CSRF strategy.
- OpenAPI sebagai API source of truth.
- Sequential approval.
- Numbering strategy.
- Internal signature design.

## 9. Aturan secret dan file

- Jangan commit `.env`.
- Jangan commit private key/token.
- Jangan menyimpan dokumen produksi di repository.
- Gunakan private storage untuk file perusahaan.
- Jangan mengandalkan URL file yang sulit ditebak sebagai authorization.
- Jangan mengubah migration yang sudah diterapkan.
- Backup dan restore harus terdokumentasi.

## Credit Billing & External Signing modules — v1.3

Backend direkomendasikan memiliki module terpisah: `external-signing`, `billing`, dan `credits`. Jangan mencampur ledger arithmetic ke controller document. Domain document meminta operasi credit melalui service/transaction boundary yang eksplisit.

Frontend direkomendasikan memisahkan internal billing UI dari public external-sign/public verify route. Public bundle tidak boleh bergantung pada internal admin navigation atau mengekspos internal API client state yang tidak diperlukan.
