# Dokumentasi Proyek — Surat Digital

**Nama kerja:** Digital Document Management System (DDMS)  
**Versi dokumentasi:** 1.4  
**Status:** Baseline spesifikasi v1.4; v1.3 commercial model dipertahankan dan roadmap diperdalam menjadi executable phase guide  
**Bahasa:** Indonesia  
**Package manager:** npm

## 1. Tujuan paket dokumentasi

Paket ini menjadi acuan untuk merancang, membangun, menguji, mengoperasikan, dan mengembangkan aplikasi Surat Digital. Dokumentasi ini merekam keputusan bisnis yang telah disepakati dan spesifikasi teknis yang menjadi target implementasi.

Dokumentasi bukan bukti bahwa seluruh fitur telah dibangun atau bahwa konfigurasi telah diterapkan di production. Bagian yang masih memerlukan proof-of-concept, persetujuan, atau keputusan lanjutan ditandai secara eksplisit.

## 2. Dokumen di dalam paket

| File | Isi |
|---|---|
| `01_PRD.md` | Visi, masalah, tujuan, pengguna, ruang lingkup, dan metrik keberhasilan |
| `02_SRS.md` | Kebutuhan fungsional dan nonfungsional |
| `03_UI_UX_Specification.md` | Navigasi, halaman, komponen, interaksi, dan responsivitas |
| `04_Development_Roadmap.md` | Roadmap per phase, goals, deliverables, tests, dan exit criteria |
| `05_Project_Documentation_and_Folder_Structure.md` | Tata kelola proyek, standar repository, npm, dan struktur folder |
| `06_System_Architecture.md` | Arsitektur React, NestJS, Prisma, Supabase, Vercel Blob, queue, dan worker |
| `07_Database_Design_and_ERD.md` | ERD konseptual, 45 tabel target, manifest integrity, outbox, workflow recovery, Prisma, migration, seed, dan RLS |
| `08_Workflow_and_Business_Rules.md` | Workflow, status, approval, knowing, signature, numbering, withdraw, dan reject |
| `09_Access_Control_and_Security.md` | Group Policy, permission, backend authorization, RLS, file security, dan audit |
| `10_API_Specification.md` | Kontrak REST NestJS, OpenAPI, auth gateway, idempotency, dan internal endpoints |
| `11_Test_Strategy_and_Acceptance_Criteria.md` | Strategi pengujian dan kriteria penerimaan |
| `12_Deployment_and_Operations.md` | Environment, deployment, Prisma migration, worker, backup, dan monitoring |
| `13_Decision_Log_and_Open_Items.md` | Keputusan, asumsi, dan hal yang masih harus dipastikan |
| `14_Glossary.md` | Istilah bisnis dan teknis |
| `15_Initial_Implementation_Backlog.md` | Epic, user story, dan acceptance criteria awal |
| `16_Risk_Register.md` | Risiko awal dan mitigasinya |
| `17_Business_Model_and_Service_Operations.md` | Model subscription, support, maintenance, dan exit |
| `18_Document_Processing_and_Extraction.md` | Pipeline upload, malware scan, ekstraksi, OCR, konversi, preview, worker, dan keamanan file |
| `19_Requirements_Traceability_Matrix.md` | Traceability PRD/SRS → API → database → test → backlog |
| `20_Credit_Billing_and_Pricing.md` | Credit economy, pricing baseline, reservation/consumption, rollover, top-up, dan trial |
| `INDEX.md` | Indeks seluruh dokumen |

## 3. Ringkasan produk

Surat Digital adalah aplikasi web responsif untuk mengelola dokumen internal perusahaan dari pembuatan sampai penerbitan dan pengarsipan. Ruang lingkup awal:

1. Surat Internal.
2. Surat Keputusan (SK).
3. Dokumen Pengajuan (Form).

Sistem dirancang untuk satu perusahaan dengan tiga kantor (termasuk kantor pusat dan cabang), sepuluh divisi, dan perkiraan 100 pengguna.

## 4. Arsitektur target

- **Frontend:** React, di-host pada cPanel perusahaan.
- **Backend API:** NestJS, direncanakan di Vercel.
- **Database:** Supabase PostgreSQL.
- **ORM dan database access utama:** Prisma ORM melalui Prisma Client di NestJS.
- **Schema dan migration:** `schema.prisma` dan Prisma Migrate.
- **Seed:** Prisma Seed.
- **Authentication:** NestJS bertindak sebagai auth gateway/BFF ke Supabase Auth. Browser tidak berkomunikasi langsung dengan Supabase Auth; identitas karyawan dipetakan melalui `employees.auth_user_id`.
- **Authorization:** Group Policy dan permission diperiksa di backend; RLS PostgreSQL menjadi lapisan tambahan dengan konfigurasi role/context yang benar.
- **File storage:** Vercel Blob dengan pola akses private/terautentikasi.
- **Document processing:** worker/container terpisah untuk mandatory malware scanning, ekstraksi teks, OCR fallback, konversi Office ke PDF, preview, dan pembuatan PDF final.
- **Document integrity:** signature mengikat `document_manifest_hash` dari canonical document manifest; Creator Sign + Lock + Submit merupakan satu transaksi bisnis.
- **Reliability:** transactional outbox digunakan untuk dispatch job/event yang harus konsisten dengan commit database.
- **Commercial usage:** Document Credits dicatat melalui ledger/lot/reservation; QR scan gratis secara komersial dan External Signing mengonsumsi credit hanya setelah successful business event.
- **Package manager:** npm; gunakan `package-lock.json`, bukan pnpm/yarn lockfile.

NestJS tidak menggunakan Supabase JS Client sebagai ORM atau jalur query utama ke tabel aplikasi. Supabase SDK dapat digunakan terbatas untuk kebutuhan Supabase Auth atau operasi administratif yang memang diperlukan.

## 5. Prinsip database yang wajib konsisten

1. Supabase menyediakan PostgreSQL yang di-host.
2. NestJS mengakses tabel aplikasi menggunakan Prisma Client.
3. `schema.prisma` menjadi model schema yang dikelola Prisma.
4. Prisma Migrate menjadi alur migration utama.
5. Prisma Seed menjadi alur seed utama.
6. `DATABASE_URL` dan `DIRECT_URL` disimpan sebagai environment variables server-side; URL runtime dan migration dipisahkan sesuai mode koneksi Supabase.
7. Supabase Auth mengelola kredensial pengguna. Tabel `auth.users` dikelola Supabase, bukan dimigrasikan sebagai tabel aplikasi Prisma.
8. RLS tidak otomatis aktif sebagai proteksi bagi query Prisma. Role database runtime, transaction-local identity context, dan policy harus dirancang serta diuji.
9. `offices.timezone` menggunakan nama zona IANA untuk menentukan periode numbering.
10. Transactional outbox harus digunakan untuk event/job yang tidak boleh hilang setelah commit database.
11. Secret database, Supabase service role, dan Vercel Blob token tidak boleh berada di frontend.

## 6. Prinsip pemrosesan dokumen

- File asli tetap disimpan di Vercel Blob.
- Sistem memvalidasi ekstensi, MIME type, signature file, ukuran, dan hash.
- Malware scanning/quarantine wajib dilakukan sebelum parser/converter memproses file.
- Ekstraksi teks dilakukan sesuai format.
- PDF digital dibaca dengan parser PDF; PDF scan dapat menggunakan OCR fallback.
- DOCX, DOC, XLSX, dan XLS diproses dengan parser/converter yang sesuai.
- Office file dikonversi menjadi PDF representasi untuk preview dan proses tanda tangan.
- Pengguna wajib memeriksa hasil preview sebelum mengonfirmasi file.
- Ekstraksi teks tidak berarti sistem memahami atau menyimpulkan isi dokumen dengan AI.
- OCR dan konversi berat berjalan di worker terpisah, bukan menahan request API utama.

## 7. Cara menggunakan dokumentasi

1. Jadikan PRD dan SRS sebagai acuan kebutuhan produk.
2. Jadikan Workflow dan Business Rules sebagai acuan proses.
3. Jadikan Database Design sebagai acuan Prisma schema dan migrasi.
4. Jadikan System Architecture dan Document Processing sebagai acuan integrasi teknis.
5. Jadikan UI/UX Specification sebagai acuan implementasi React.
6. Jadikan Roadmap dan Backlog sebagai dasar milestone; setiap phase implementasi ditimebox 8 atau 12 jam fokus engineering.
7. Jadikan Credit Billing & Pricing sebagai kontrak monetisasi; perubahan credit economy harus diperbarui lintas API/data/test.
8. Gunakan Requirements Traceability Matrix untuk memastikan requirement memiliki API/data/test/backlog coverage.
9. Perbarui Decision Log setiap ada keputusan baru.
10. Jangan mengubah aturan bisnis yang disepakati hanya melalui perubahan kode; perubahan harus disetujui dan dicatat.

## 8. Prinsip migration dan versioning

- Semua perubahan schema aplikasi dikelola melalui Prisma Migrate.
- Migration yang telah diterapkan pada environment bersama/production bersifat immutable.
- PostgreSQL-specific objects yang tidak terwakili penuh di Prisma Schema (misalnya RLS policy, trigger, function, partial index tertentu) ditambahkan sebagai SQL kustom di folder migration Prisma dan tetap dijalankan melalui Prisma Migrate.
- Seed master data dijalankan melalui Prisma Seed dan harus idempotent.
- Jangan menjadikan Supabase CLI migration folder sebagai jalur utama migration schema aplikasi.

## 9. Riwayat versi

| Versi | Status | Catatan |
|---|---|---|
| 1.0 | Draft baseline | Hasil diskusi kebutuhan dan rancangan awal |
| 1.1 | Revisi spesifikasi | Supabase + Prisma, npm, RLS yang kompatibel dengan Prisma, dan Document Processing/OCR/Worker |
| 1.2 | Architecture & Integrity Hardening | Auth gateway, atomic Creator Sign+Submit, document manifest hash, numbering-before-final-PDF, outbox, mandatory malware scan, workflow recovery, OpenAPI, measurable NFR, traceability, dan roadmap 8/12 jam |
| 1.3 | Credit Billing & External Signing Commercialization | Document Credits, QR Verification sebagai Must, External Signing, credit ledger/reservation, rollover/top-up/trial, pricing baseline, dan roadmap commercial extension |
| 1.4 | Phase Execution Roadmap | Roadmap P00–P59 tetap 8/12 jam tetapi setiap phase memiliki Goal, Dependencies, Pekerjaan/Scope, Deliverables, Test/Verification, dan Exit Criteria |

## 10. Catatan penting

- ERD dan model Prisma dalam paket ini merupakan rancangan target; belum berarti database telah diterapkan.
- RLS dan backend authorization wajib diuji terpisah dan bersama-sama.
- Penggunaan role database `BYPASSRLS` akan melewati RLS. Jangan menyatakan RLS melindungi query Prisma jika runtime role memang bypass RLS.
- Tanda tangan elektronik internal bukan otomatis tanda tangan elektronik tersertifikasi PSrE.
- Legalitas tanda tangan, retensi, dan perjanjian layanan harus ditinjau pihak yang berwenang sebelum go-live.

## 11. Prinsip komersial v1.3

- Billing metric utama adalah Document Credits, bukan internal user.
- External signer gratis dan tidak membutuhkan subscription sendiri.
- QR scan tidak memotong credit.
- Credit charge harus mengikuti successful business event dan transactional/idempotent accounting.
- Pricing baseline berada di `20_Credit_Billing_and_Pricing.md` dan dapat direvisi setelah unit economics/pilot; perubahan harga tidak boleh mengubah historical ledger.
