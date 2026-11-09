# Deployment & Operations

## Surat Digital

**Versi:** 1.3

## 1. Environment

| Environment | Tujuan          | Data            |
|-------------|-----------------|-----------------|
| Local       | Pengembangan    | Dummy           |
| Development | Integrasi fitur | Dummy           |
| Staging/UAT | Pengujian user  | Data uji/masked |
| Production  | Operasional     | Data perusahaan |

Setiap environment harus memiliki database, storage, dan secret yang
terpisah.

## 2. Deployment target

### Frontend

- React.

- Build static production.

- Hosting cPanel perusahaan.

- Domain dan HTTPS.

- SPA fallback/rewrite perlu dikonfigurasi.

### Backend

- NestJS.

- Vercel.

- Environment variables server-side.

- API base URL terpisah per environment.

- CORS allowlist untuk domain frontend.

### Database

- Supabase PostgreSQL.

- Prisma ORM/Prisma Client sebagai akses database utama dari NestJS.

- Prisma Migrate sebagai jalur migration utama.

- Prisma Seed sebagai jalur seed utama.

- RLS aktif dan diuji dengan runtime role/context yang benar.

- Backup otomatis.

- Tidak melakukan perubahan schema manual yang tidak tercatat dalam migration Prisma.

### File Storage

- Vercel Blob.

- Gunakan private access pattern.

- Token hanya di backend.

- File metadata disimpan di PostgreSQL.

### Document Worker

Worker harus berjalan pada lingkungan yang cocok untuk:

- LibreOffice atau converter setara.

- Pemrosesan file besar.

- Temporary filesystem.

- Queue retry.

- Timeout lebih panjang dibanding request API biasa.

Worker tidak disarankan berjalan sebagai request panjang pada Vercel Functions. Deploy sebagai container/VM atau platform worker yang mendukung Docker, LibreOffice headless, Tesseract.js/OCR dependency, temporary filesystem, CPU/RAM yang memadai, dan proses background berkelanjutan. Provider final dipilih setelah proof-of-concept.

Queue direkomendasikan menggunakan Redis + BullMQ atau layanan queue yang setara. Queue hanya membawa job ID dan metadata minimum, bukan isi dokumen.

## 3. Environment variables

### Frontend

```env
VITE_API_BASE_URL=
VITE_APP_NAME=Surat Digital
```

### Backend

```env
NODE_ENV=
PORT=
APP_BASE_URL=
FRONTEND_ORIGIN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
QUEUE_CONNECTION_URL=
VERCEL_BLOB_READ_WRITE_TOKEN=
EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
LOG_LEVEL=
```

Jangan menyimpan nilai secret di repository, issue tracker, dokumentasi
publik, atau screenshot.

## 4. Release process

1.  Developer membuat branch.

2.  Pull request dibuat.

3.  CI menjalankan lint, unit test, dan build.

4.  Jalankan `npm ci` dan build semua workspace yang diperlukan.
5.  Validasi `prisma migrate status` dan uji migration pada development.

6.  Deploy staging.

7.  Jalankan integration/E2E tests.

8.  UAT jika release mengubah workflow.

9.  Backup sebelum migration production.

10. Deploy backend.

11. Terapkan migration dengan `prisma migrate deploy` menggunakan migration connection/role.

12. Deploy frontend.

13. Smoke test.

14. Monitor error dan audit.

15. Catat release di CHANGELOG.

Urutan deploy dapat disesuaikan dengan backward compatibility API dan
migration.


## 5. Prisma schema, migration, dan seed

### Source of truth

- `apps/api/prisma/schema.prisma`: model tabel aplikasi.
- `apps/api/prisma/migrations/`: migration Prisma Migrate.
- `apps/api/prisma/seed.ts`: seed data awal.
- `apps/api/prisma.config.ts`: konfigurasi Prisma CLI dan URL migration sesuai versi Prisma.

### Perintah lifecycle (jalankan dari package API atau melalui npm script)

```bash
# Membuat migration pada development setelah schema.prisma berubah
npm exec prisma -- migrate dev --name nama_perubahan

# Menerapkan migration yang sudah dibuat ke staging/production
npm exec prisma -- migrate deploy

# Melihat status migration
npm exec prisma -- migrate status

# Menjalankan seed sesuai konfigurasi Prisma
npm exec prisma -- db seed

# Generate Prisma Client
npm exec prisma -- generate
```

Nama npm scripts final dapat membungkus perintah tersebut, tetapi jangan mengubah package manager dari npm.

### Aturan

- Migration yang telah diterapkan pada environment bersama bersifat immutable.
- Jangan mengedit migration lama; buat migration baru.
- Review SQL yang dihasilkan sebelum merge.
- RLS policies, triggers, functions, dan PostgreSQL-specific objects dimasukkan sebagai SQL kustom di migration Prisma.
- Gunakan direct/session connection untuk migration sesuai konfigurasi Prisma/Supabase; gunakan pooled connection untuk runtime serverless.
- Pisahkan migration role dan runtime role.
- Seed data master melalui Prisma Seed, bersifat idempotent, dan tidak berisi password atau data produksi.
- Jangan menjalankan `prisma db push` sebagai pengganti migration terkontrol di staging/production.
- Perubahan destructive harus melalui migration bertahap dan backup.

## 6. Backup dan recovery

Backup:

- Database.

- Metadata file.

- File Blob.

- Konfigurasi master.

- Prisma migrations dan Prisma Seed.

Uji restore:

- Minimal berkala dan sebelum perubahan besar.

- Pastikan file dan metadata tetap terhubung.

- Pastikan hash dapat diverifikasi.

- Pastikan audit dan numbering konsisten.

RPO/RTO belum ditetapkan dan harus disepakati dengan perusahaan.

## 7. Monitoring

Pantau:

- API error rate.

- API latency.

- Auth failure.

- Permission denial.

- File upload/download failure.

- Conversion queue length.

- Conversion failure.

- Email delivery failure.

- Numbering/finalization failure.

- Database connection/pool.

- Storage usage.

- Backup result.

Jangan menulis password, PIN, token, atau isi dokumen rahasia ke log.

## 8. Incident response

Kategori:

- Data access incident.

- Authentication incident.

- File storage incident.

- Database incident.

- Workflow/numbering incident.

- Signature integrity incident.

- Service outage.

Langkah:

1.  Deteksi dan catat incident.

2.  Batasi dampak.

3.  Cabut session/token bila perlu.

4.  Simpan bukti audit/log.

5.  Pulihkan layanan.

6.  Validasi integritas data dan file.

7.  Komunikasikan sesuai prosedur perusahaan.

8.  Buat postmortem dan corrective action.

## 9. Retention dan archival

Rekomendasi awal:

- Dokumen resmi, nomor, approval, dan signature evidence dipertahankan
  sesuai kebijakan retensi perusahaan.

- Audit teknis dapat memiliki retensi terbatas, dengan rekomendasi awal
  dua tahun.

- Penghapusan data tidak boleh dilakukan secara langsung tanpa
  otorisasi, dasar, dan audit.

- Kebijakan legal/kontrak harus menjadi sumber keputusan final.

## 10. Go-live checklist

- [ ] Domain dan HTTPS aktif.

- [ ] CORS benar.

- [ ] Secret production terpasang.

- [ ] RLS aktif dan diuji.

- [ ] Service role tidak ada di frontend.

- [ ] Blob private access telah diuji.

- [ ] Email sender terverifikasi.

- [ ] `prisma migrate status` menunjukkan schema up-to-date.

- [ ] `prisma migrate deploy` berhasil.

- [ ] Prisma Seed selesai dan idempotent.

- [ ] Runtime DB role dan RLS context sudah diuji.

- [ ] Worker dan queue sehat; retry/dead-letter dipantau.

- [ ] Administrator pertama dibuat aman.

- [ ] Backup aktif.

- [ ] Restore pernah diuji.

- [ ] Monitoring aktif.

- [ ] Error reporting aktif.

- [ ] UAT disetujui.

- [ ] User guide tersedia.

- [ ] Rollback plan tersedia.


## 11. Document processing operations

- Monitor queue depth, oldest job age, processing duration, retry count, dan dead-letter count.
- Monitor worker CPU/RAM, temporary disk, LibreOffice crash, OCR timeout, dan conversion failure.
- Lakukan cleanup temporary files setelah setiap job, termasuk pada kegagalan.
- Jalankan malware scanning dan quarantine flow sesuai kebijakan keamanan.
- Simpan parser/converter version untuk reproduksibilitas.
- Reprocessing file harus memakai idempotency key baru yang mereferensikan file/hash sumber dan versi parser.
- Jangan menghapus source file ketika preview/extraction gagal.
- Lakukan reconciliation antara metadata database dan objek Vercel Blob.
- Jangan menyimpan teks dokumen lengkap atau konten sensitif pada log observability.


## 12. Operational hardening v1.2

### Auth/session

- Frontend hanya berkomunikasi dengan NestJS untuk auth.
- Cookie/domain/SameSite/CSRF/CORS dikonfigurasi berbeda per environment dan diuji sebelum go-live.
- Suspend employee memicu revoke session bila provider mendukung dan tetap diblokir oleh backend status check.

### Transactional outbox

Monitoring minimum: pending count, oldest pending age, publish failure rate, retry count, dan dead-letter/reconciliation result. Runbook harus menjelaskan cara replay aman tanpa duplicate side effect.

### Numbering/finalization

Monitoring minimum: document `FINALIZING` age, reserved-but-not-issued age, callback failures, hash mismatch, dan VOID events. Manual retry hanya melalui internal/admin operation yang berizin dan teraudit.

### Malware scanner

Scanner merupakan dependency wajib. Policy baseline fail-closed. Monitor scanner availability/latency, quarantine count, timeout/error, dan engine/signature update. Jangan bypass scanning hanya untuk mengurangi antrean tanpa change/security approval.

### Restore/SLO evidence

Restore drill mencatat backup timestamp, recovery start/end, data-loss window aktual, checklist verifikasi, dan sign-off. Baseline pilot menargetkan RPO ≤ 24 jam dan RTO ≤ 4 jam sampai SLA kontraktual menetapkan target lain.

## 15. Billing & External Signing operations — v1.3

Tambahkan monitoring/alert untuk:

- credit reconciliation mismatch;
- negative/invalid wallet projection;
- stuck ACTIVE credit reservation;
- monthly allocation job failure;
- expiry job failure;
- duplicate payment callback attempts;
- external signing completion/error rate;
- public verification abuse/rate-limit spikes;
- top-up confirmation failure.

Scheduled allocation/expiry job wajib idempotent dan menggunakan IANA timezone/period semantics yang terdokumentasi. Production runbook harus memiliki prosedur manual reconciliation dan admin correction yang tidak mengedit ledger history.

Secret payment provider, OTP provider, dan signing token material bersifat server-side. External-sign token tidak boleh dikirim ke observability platform dalam bentuk plaintext.
