# API Specification

## NestJS REST API — Surat Digital

**Versi:** 1.3 — OpenAPI-first contract baseline  
**Base path:** `/api/v1`

> Endpoint di bawah adalah baseline kontrak v1.3. **OpenAPI yang dihasilkan NestJS menjadi source of truth executable** untuk DTO, parameter, pagination, response, dan error schema. TypeScript client/types frontend digenerate dari OpenAPI dan tidak dipelihara ganda secara manual.

## 1. Konvensi API

- JSON untuk request/response.

- UUID untuk resource ID.

- ISO 8601 UTC untuk timestamp.

- Pagination berbasis `page`/`limit` atau cursor.

- Validasi request menggunakan DTO/schema.

- Semua endpoint privat memerlukan session/token yang dikelola melalui NestJS auth gateway. Browser tidak memanggil Supabase Auth langsung.

- Backend menentukan employee dari token, bukan mempercayai employee ID
  dari client.

- Gunakan idempotency key untuk tindakan yang berisiko duplikasi.

Response sukses contoh:

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-11-05T10:00:00Z"
  }
}
```

Response error contoh:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_ACTIONABLE",
    "message": "Dokumen tidak dapat diproses oleh pengguna ini.",
    "requestId": "uuid"
  }
}
```

## 2. Authentication

| Method | Endpoint                | Fungsi                         |
|--------|-------------------------|--------------------------------|
| POST   | `/auth/login`           | Login email/username/NIP       |
| POST   | `/auth/logout`          | Logout/revoke session          |
| POST   | `/auth/refresh`         | Refresh session jika digunakan |
| GET    | `/auth/me`              | Profil dan permission efektif  |
| POST   | `/auth/register`        | Registrasi mandiri             |
| POST   | `/auth/forgot-password` | Proses reset password          |

Untuk login Username/NIP, backend melakukan lookup aman ke akun yang
terkait. Jangan mengembalikan informasi apakah NIP/email tertentu
terdaftar.

## 3. User dan organisasi

| Method | Endpoint                         | Fungsi                            |
|--------|----------------------------------|-----------------------------------|
| GET    | `/users`                         | Daftar pengguna sesuai permission |
| POST   | `/users/import`                  | Import Excel                      |
| POST   | `/users`                         | Buat pengguna                     |
| GET    | `/users/:id`                     | Detail pengguna                   |
| PATCH  | `/users/:id`                     | Update pengguna                   |
| POST   | `/users/:id/activate`            | Aktivasi                          |
| POST   | `/users/:id/suspend`             | Suspend                           |
| GET    | `/organization/offices`          | Daftar kantor                     |
| GET    | `/organization/divisions`        | Daftar divisi                     |
| GET    | `/organization/office-divisions` | Relasi divisi-kantor              |
| GET    | `/organization/job-titles`       | Daftar jabatan                    |

## 4. Group Policy

| Method | Endpoint                          | Fungsi                     |
|--------|-----------------------------------|----------------------------|
| GET    | `/groups`                         | Daftar group               |
| POST   | `/groups`                         | Membuat group              |
| GET    | `/groups/:id`                     | Detail group               |
| PATCH  | `/groups/:id`                     | Update group               |
| POST   | `/groups/:id/members`             | Tambah anggota             |
| DELETE | `/groups/:id/members/:employeeId` | Nonaktifkan membership     |
| PUT    | `/groups/:id/permissions`         | Atur permission Allow/Deny |
| GET    | `/permissions`                    | Katalog permission         |

Penghapusan membership sebaiknya berupa revoke/nonaktifkan, bukan
menghapus jejak historis.

## 5. Document creation

| Method | Endpoint                              | Fungsi                         |
|--------|---------------------------------------|--------------------------------|
| GET    | `/document-types`                     | Jenis dokumen                  |
| GET    | `/document-subtypes`                  | Subjenis                       |
| POST   | `/documents`                          | Membuat draft                  |
| GET    | `/documents`                          | Daftar dokumen sesuai akses    |
| GET    | `/documents/:id`                      | Detail dokumen                 |
| PATCH  | `/documents/:id`                      | Update draft                   |
| POST   | `/documents/:id/versions`             | Membuat versi draft baru       |
| POST   | `/documents/:id/files/upload`         | Upload satu file               |
| GET    | `/documents/:id/files/:fileId/processing` | Status validasi/ekstraksi/konversi |
| POST   | `/documents/:id/files/:fileId/retry-processing` | Retry job gagal sesuai izin dan batas retry |
| POST   | `/documents/:id/files/:fileId/review` | Review/konfirmasi file         |
| DELETE | `/documents/:id/files/:fileId`        | Hapus file draft sesuai aturan |
| POST   | `/documents/:id/participants`         | Atur Knowing dan Approver      |
| POST   | `/documents/:id/submit`               | Atomic Creator Sign + Lock + Submit; request membawa metode/proof signature dan idempotency key |

### Submit request (konseptual)

```json
{
  "signatureMethod": "INTERNAL",
  "pin": "input-only-not-logged",
  "expectedVersionId": "uuid"
}
```

Backend memvalidasi seluruh file/participant, membentuk canonical manifest, mengunci version/files/participants, membuat Creator signature, melakukan state transition, menulis audit/outbox, lalu commit sebagai satu transaksi bisnis. PIN/proof tidak pernah disimpan dalam audit/log.

### Upload request (konseptual)

```json
{
  "fileName": "surat-keputusan.docx",
  "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "fileRole": "MAIN"
}
```

Upload response harus memberikan metadata, `fileId`, dan status awal processing, bukan mengekspos token storage.

Status processing dapat berupa `UPLOADED`, `VALIDATING`, `QUEUED`, `PROCESSING`, `PREVIEW_READY`, `FAILED`, atau `DEAD_LETTER`. Endpoint status mengembalikan ringkasan error yang aman, bukan stack trace atau isi dokumen. Retry menggunakan idempotency key dan tidak boleh membuat hasil ganda.

Worker callback adalah endpoint internal, bukan endpoint publik untuk browser. Callback wajib menggunakan autentikasi service-to-service, signature/secret rotatable, request timestamp/nonce bila sesuai, dan idempotency check.

## 6. Workflow

| Method | Endpoint                           | Fungsi                              |
|--------|------------------------------------|-------------------------------------|
| GET    | `/tasks`                           | Semua task milik pengguna           |
| GET    | `/tasks/knowing`                   | Task Mengetahui                     |
| GET    | `/tasks/approvals`                 | Task approval                       |
| POST   | `/documents/:id/knowing/confirm`   | Konfirmasi membaca dan tanda tangan |
| POST   | `/documents/:id/approvals/approve` | Approve dan sign                    |
| POST   | `/documents/:id/approvals/reject`  | Reject permanen                     |
| POST   | `/documents/:id/withdraw`          | Withdraw oleh Creator               |
| GET    | `/documents/:id/workflow`          | Timeline dan participant status     |
| POST   | `/documents/:id/workflow/recover`  | Ganti participant BLOCKED; permission `Workflow.Repair`, reason wajib |

### Knowing confirmation (konseptual)

```json
{
  "signatureMethod": "INTERNAL",
  "pin": "input-only-not-logged"
}
```

PIN tidak boleh masuk application log, tracing, error report, atau
analytics.

### Approval (konseptual)

```json
{
  "decision": "APPROVE",
  "signatureMethod": "VISUAL",
  "visualSignaturePayload": "secure-upload-reference"
}
```

Untuk penolakan:

```json
{
  "reason": "Dokumen belum dilengkapi dengan dasar pengajuan."
}
```

## 7. Signature profile

| Method | Endpoint                | Fungsi                  |
|--------|-------------------------|-------------------------|
| GET    | `/signature/profile`    | Status registrasi       |
| POST   | `/signature/register`   | Registrasi TTE internal |
| POST   | `/signature/activate`   | Aktivasi                |
| POST   | `/signature/change-pin` | Ubah PIN                |
| POST   | `/signature/revoke`     | Cabut registrasi        |

Tanda tangan visual dibuat ketika tindakan signature dilakukan dan diupload sebagai evidence. PIN internal diverifikasi hanya di operasi yang membutuhkan signature (`submit`, `knowing/confirm`, `approvals/approve`) atau menggunakan short-lived purpose-bound proof bila implementasi membutuhkan preflight; jangan menyediakan boolean PIN oracle reusable.

## 8. Numbering dan finalization

| Method | Endpoint                         | Fungsi                              |
|--------|----------------------------------|-------------------------------------|
| GET    | `/numbering/config`              | Lihat konfigurasi                   |
| PATCH  | `/numbering/config`              | Update master penomoran             |
| POST   | `/internal/documents/:id/finalization/retry` | Retry finalisasi untuk operator/internal service berizin; bukan action browser normal |
| GET    | `/documents/:id/official-number` | Nomor resmi                         |
| GET    | `/verify/:token`                 | Verifikasi metadata dokumen         |

Nomor resmi di-reserve otomatis dalam transaksi approval terakhir/finalization start **sebelum** final PDF dirender. Client tidak boleh mengirim nomor resmi pilihannya sendiri. Endpoint internal retry selalu memakai reservation yang sama; permanent failure dapat menandai reservation `VOID` tanpa reuse. `/verify/:token` menggunakan token purpose-bound yang disimpan sebagai hash dan tidak memberikan akses file privat.

## 9. Template dan Form Builder

| Method | Endpoint                  | Fungsi                 |
|--------|---------------------------|------------------------|
| GET    | `/templates`              | Daftar template        |
| POST   | `/templates`              | Membuat template       |
| POST   | `/templates/:id/versions` | Membuat versi template |
| POST   | `/templates/:id/publish`  | Publish                |
| GET    | `/forms`                  | Daftar form            |
| POST   | `/forms`                  | Membuat form           |
| POST   | `/forms/:id/versions`     | Membuat versi form     |
| POST   | `/forms/:id/publish`      | Publish                |
| POST   | `/forms/:id/submissions`  | Mengirim jawaban form  |

## 10. Archive, notifications, audit

| Method | Endpoint                  | Fungsi                         |
|--------|---------------------------|--------------------------------|
| GET    | `/archive`                | Daftar arsip sesuai akses      |
| GET    | `/archive/search`         | Pencarian                      |
| GET    | `/documents/:id/download` | Download setelah authorization |
| POST   | `/archive/export`         | Export arsip sesuai permission |
| GET    | `/notifications`          | Daftar notifikasi              |
| PATCH  | `/notifications/:id/read` | Tandai dibaca                  |
| PATCH  | `/notifications/read-all` | Tandai semua dibaca            |
| GET    | `/audit-logs`             | Audit Log                      |
| POST   | `/audit-logs/export`      | Export audit                   |

## 10A. Contract standar list/search/action

OpenAPI wajib mendefinisikan untuk setiap endpoint: authorization requirement, request DTO, response DTO, possible error codes, idempotency semantics, dan rate-limit category.

Baseline list endpoint menggunakan `cursor` bila volume dapat tumbuh; `page/limit` dapat dipakai untuk master data kecil. Semua filter/sort di-allowlist. `GET /documents` minimal mendukung status, type, creator, issuer, date range, sort, dan cursor/limit dengan batas server-side.

Action kritis (`submit`, `knowing/confirm`, `approve`, `reject`, `withdraw`, recovery, internal retry) menerima `Idempotency-Key`. Server menyimpan/mengecek key pada scope actor+operation+resource agar retry jaringan tidak menggandakan side effect.

## 11. Error code yang disarankan

| Code                         | HTTP | Makna                                          |
|------------------------------|-----:|------------------------------------------------|
| `UNAUTHENTICATED`            |  401 | Belum login/token tidak valid                  |
| `FORBIDDEN`                  |  403 | Tidak memiliki izin                            |
| `RESOURCE_NOT_FOUND`         |  404 | Resource tidak ditemukan/ tidak boleh diungkap |
| `VALIDATION_ERROR`           |  400 | Input tidak valid                              |
| `INVALID_STATE_TRANSITION`   |  409 | Perpindahan status tidak valid                 |
| `DOCUMENT_LOCKED`            |  409 | Dokumen sudah terkunci                         |
| `NOT_ACTIVE_APPROVER`        |  403 | Bukan approver aktif                           |
| `ACKNOWLEDGMENT_INCOMPLETE`  |  409 | Knowing belum selesai                          |
| `SELF_APPROVAL_FORBIDDEN`    |  403 | Creator tidak boleh approve                    |
| `SIGNATURE_PROFILE_REQUIRED` |  409 | Registrasi TTE internal belum aktif            |
| `INVALID_SIGNATURE_PIN`      |  401 | PIN salah                                      |
| `NUMBERING_CONFLICT`         |  409 | Konflik penomoran                              |
| `FILE_CONVERSION_FAILED`     |  422 | Konversi file gagal                            |
| `FILE_PROCESSING_PENDING`     |  409 | File masih diproses dan belum dapat direview   |
| `FILE_VALIDATION_FAILED`      |  422 | File tidak valid/format tidak sesuai            |
| `FILE_PROCESSING_FAILED`      |  422 | Ekstraksi/OCR gagal                             |
| `RATE_LIMITED`               |  429 | Terlalu banyak request                         |

## 12. API security checklist

- DTO validation.

- JWT validation.

- Permission guard.

- Document involvement guard.

- State transition validation.

- Rate limiting.

- Idempotency untuk submit/signature actions, approval, recovery, worker callback, numbering/finalization retry, dan notification dispatch.

- No secret in frontend.

- No PIN in logs.

- Audit event untuk tindakan sensitif.

- Pagination dan query limits.

- Download melalui authorization.


## 13. Internal callback dan outbox contract

Worker callback dan outbox consumer bukan browser API. Keduanya menggunakan service-to-service authentication, timestamp/nonce atau replay protection yang sesuai, `jobId`/idempotency key, expected state/version, dan payload hash. Callback yang sama dapat dikirim ulang dan harus menghasilkan outcome idempotent.

## 14. External Signing, Verification, dan Billing API — v1.3

Semua path final tetap mengikuti OpenAPI generated contract. Nama di bawah adalah baseline resource design.

### Internal external-signing management

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/documents/:id/external-signing-requests` | Buat signer request + reserve credit |
| GET | `/documents/:id/external-signing-requests` | List signer request/status |
| POST | `/external-signing-requests/:id/resend` | Resend invitation, 0 credit tambahan |
| POST | `/external-signing-requests/:id/revoke` | Revoke dan release reservation bila belum completed |

Create request wajib memakai idempotency key dan gagal `CREDIT_INSUFFICIENT` bila reservation baru tidak dapat dibuat.

### Public external signer

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/public/external-sign/:token` | Resolve capability dan metadata review minimal |
| POST | `/public/external-sign/:token/challenge` | Kirim/mulai OTP challenge bila policy membutuhkan |
| POST | `/public/external-sign/:token/verify` | Verify challenge dan menghasilkan short-lived action proof bila dipakai |
| POST | `/public/external-sign/:token/sign` | Atomic signature + consume reservation + audit |

Public API menggunakan generic errors untuk token invalid/expired/revoked sesuai kebutuhan security dan tidak mengembalikan internal IDs yang tidak perlu.

### Public verification

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/verify/:token` | Allowlisted document verification metadata; 0 credit per scan |

### Billing/credits

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/billing/plans` | Plan catalog aktif |
| GET | `/billing/subscription` | Subscription/trial aktif |
| GET | `/billing/credits` | Available, reserved, expiry summary |
| GET | `/billing/credits/ledger` | Paginated credit history |
| GET | `/billing/credits/lots` | Credit lots/expiry visibility |
| POST | `/billing/top-ups` | Membuat top-up/payment intent atau request sesuai adapter |
| POST | `/billing/admin/grants` | Permissioned manual grant dengan reason |
| POST | `/billing/admin/reversals` | Permissioned correction/reversal dengan reason |

Internal/provider-only callback untuk payment confirmation harus memverifikasi provider signature, idempotency, amount/currency, dan payment state sebelum membuat top-up lot.

### Error codes tambahan

- `CREDIT_INSUFFICIENT`
- `CREDIT_RESERVATION_CONFLICT`
- `CREDIT_ALREADY_CONSUMED`
- `SUBSCRIPTION_INACTIVE`
- `EXTERNAL_SIGN_TOKEN_INVALID`
- `EXTERNAL_SIGN_TOKEN_EXPIRED`
- `EXTERNAL_SIGN_REQUEST_REVOKED`
- `EXTERNAL_SIGN_REQUEST_COMPLETED`

Tidak semua public token failure perlu dibedakan pada response body; internal telemetry boleh menyimpan reason yang sudah diredact.
