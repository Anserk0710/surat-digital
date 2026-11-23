# API Specification

## NestJS REST API — Surat Digital

**Versi:** 1.6 — OpenAPI-first contract terpadu Backend & Frontend  
**Base path:** `/api/v1`

> Endpoint di bawah adalah baseline kontrak v1.3. **OpenAPI yang dihasilkan NestJS menjadi source of truth executable** untuk DTO, parameter, pagination, response, dan error schema. TypeScript client/types frontend digenerate dari OpenAPI dan tidak dipelihara ganda secara manual.

## 0. Integrasi `apps/web` — v1.6

React memanggil NestJS `/api/v1` dengan `credentials: include` dan header CSRF untuk mutation sesuai kontrak P04. TypeScript client/types digenerate dari OpenAPI dalam CI; status 401 memicu pemulihan sesi/login, 403 menampilkan akses ditolak, dan state mutation tidak dioptimistiskan jika server menolak. Permission dari `/auth/me` hanya mengatur affordance UI, tidak menggantikan guard server.

Dalam P05 (registrasi/aktivasi/import/profil), P29 (ringkasan dashboard), serta P25/P32 (konfigurasi/audit), lengkapi OpenAPI dan implementasi API yang diperlukan layar terkait jika belum tersedia. Cantumkan DTO, permission, pagination, error schema, dan negative tests. Dokumentasi endpoint konseptual bukan bukti endpoint telah diimplementasikan; UI yang memakai mock belum memenuhi exit criteria integrasi. Gap backend dan frontend dicatat pada P yang sama dalam backlog/evidence; P03–P06 historis tidak dianggap sudah memiliki UI tanpa bukti.

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
| POST   | `/users/register`       | Registrasi mandiri P05         |

Reset password merupakan kontrak fase lanjutan; belum ada endpoint executable dalam P00–P06.

Untuk login Username/NIP, backend melakukan lookup aman ke akun yang
terkait. Jangan mengembalikan informasi apakah NIP/email tertentu
terdaftar.

### P04 — Authentication Hardening Contract

**Version:** P04

#### CSRF Bootstrap

`GET /api/v1/auth/csrf`

Response `200 OK`:

```json
{
  "csrfToken": "<opaque-csrf-token>"
}
```

Server juga menerbitkan signed CSRF cookie melalui `Set-Cookie`. Cookie bersifat `HttpOnly` dan tidak boleh dibaca secara langsung oleh JavaScript.

Semua mutation endpoint `/api/v1/*` wajib menyertakan header:

```http
X-CSRF-Token: <opaque-csrf-token>
```

Cookie harus dikirim dengan `credentials: include`.

#### Authentication Rate Limiting

Rate limiting menggunakan fixed-window PostgreSQL counters dengan identifier yang di-HMAC.

- Login: 30 request per IP dan 5 request per pasangan IP + identifier dalam 15 menit.
- Refresh: 60 request per IP dan 20 request per session cookie dalam 15 menit.
- Logout: 60 request per IP dalam 15 menit.
- `/me`: 120 request per IP dalam 15 menit.
- `/csrf`: 60 request per IP dalam 15 menit.

Response ketika limit terlampaui: `429 Too Many Requests`.

```json
{
  "code": "AUTH_RATE_LIMITED",
  "message": "Too many requests."
}
```

Header `Retry-After` wajib tersedia.

#### Authentication Errors

Invalid login credentials (`401 Unauthorized`):

```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid credentials."
}
```

Invalid application session (`401 Unauthorized`):

```json
{
  "code": "AUTHENTICATION_REQUIRED",
  "message": "Authentication required."
}
```

Concurrent refresh (`409 Conflict`):

```json
{
  "code": "REFRESH_IN_PROGRESS",
  "message": "Session refresh in progress."
}
```

Untrusted Origin: `403 Forbidden`, code `ORIGIN_NOT_ALLOWED`.

Invalid CSRF token: `403 Forbidden`, code `CSRF_INVALID`.

#### Session Revocation and Employee Suspension

- Session validity is determined by the NestJS backend and PostgreSQL.
- Only employees with status `ACTIVE` and an active company may use an application session.
- Suspension and revoke-all invalidate application sessions immediately.
- Access tokens and refresh tokens belonging to Supabase Auth are never included in browser API responses.
- Application session refresh preserves the original absolute expiration time.
- Suspend/activate pengguna tersedia melalui `PATCH /users/:id/status` dengan `User.Manage`; sesi aktif dicabut saat status tidak lagi `ACTIVE`.

#### Security Logging

Authentication logs contain an allowlisted event name, outcome, HTTP status, and timestamp.

Raw credentials, access tokens, refresh tokens, session cookies, PIN values, and request bodies must never be recorded.

## 3. User dan organisasi

| Method | Endpoint                         | Fungsi dan izin                    |
|--------|----------------------------------|------------------------------------|
| POST   | `/users/register`                | Registrasi publik; status `PENDING` |
| GET    | `/users`                         | Daftar pengguna; `User.View`/`User.Manage` |
| GET    | `/users/me/profile`              | Profil sendiri; sesi aktif          |
| PATCH  | `/users/me/profile`              | Ubah nama profil sendiri            |
| PATCH  | `/users/:id/status`              | Aktivasi/suspend; `User.Manage`     |
| POST   | `/users/import`                  | Import `.xlsx`; `User.Manage`       |
| GET    | `/organization/offices`          | Daftar kantor                      |
| GET    | `/organization/divisions`        | Daftar divisi                      |
| GET    | `/organization/office-divisions` | Relasi divisi-kantor               |
| GET    | `/organization/job-titles`       | Daftar jabatan                     |

Import membatasi file `.xlsx` sampai 2 MB dan 1000 baris data. Respons memuat jumlah `created` dan daftar `errors` per nomor baris. Aktivasi pengguna hasil import mengirim undangan Supabase Auth. Kontrak request/response executable ada di `packages/api-contracts/openapi.json`.

### P05 — Organization Master API

**Base URL:** `/api/v1/organization`

Semua endpoint menggunakan application session cookie dan memerlukan authorization. Mutation juga memerlukan trusted Origin dan signed CSRF token sesuai kontrak P04.

#### Company

| Method | Endpoint         | Permission                      |
|--------|------------------|---------------------------------|
| GET    | `/companies`     | Admin platform, System.Configure, atau User.View |
| POST   | `/companies`     | Admin platform saja; membuat perusahaan dan mengundang admin pertama |
| GET    | `/companies/:id` | Admin platform, System.Configure, atau User.View |
| PATCH  | `/companies/:id` | Admin platform atau System.Configure |
| DELETE | `/companies/:id` | Admin platform saja |

Admin platform ditetapkan melalui operasi database tepercaya, bukan oleh admin perusahaan. `POST /companies` menerima `code`, `name`, `adminEmail`, dan `adminName`; undangan email serta akun admin pertama dibuat bersama perusahaan. Admin perusahaan hanya dapat membaca dan mengubah perusahaannya sendiri. Admin platform memilih perusahaan melalui daftar sebelum mengelola master turunannya. Request master turunan dan `GET /users` dapat membawa `companyId` perusahaan terpilih; hanya admin platform yang boleh memilih perusahaan lain. Riwayat perubahan tersedia melalui `GET /organization/changes/:type/:id` dengan cakupan perusahaan yang sama.

`DELETE /companies/:id?force=true` menonaktifkan perusahaan beraktivitas beserta akses penggunanya tanpa menghapus data. `DELETE /companies/:id?permanent=true&force=true` menghapus seluruh data perusahaan dan akun Supabase terkait. `force=true` diperlukan jika perusahaan sudah mempunyai karyawan. Jika penghapusan akun eksternal gagal, perusahaan tetap nonaktif dan admin platform dapat mengulang permintaan hapus permanen. Admin platform tidak boleh menonaktifkan atau menghapus perusahaannya sendiri.

#### Office, Division, dan JobTitle

Masing-masing resource menggunakan:

- `GET /{resource}` — list
- `GET /{resource}/:id` — detail
- `POST /{resource}` — create
- `PATCH /{resource}/:id` — update/reactivate
- `DELETE /{resource}/:id` — deactivate

Resource path adalah `offices`, `divisions`, dan `job-titles`. Read memerlukan `System.Configure` atau `User.View`; mutation memerlukan `System.Configure`. `DELETE /:id?force=true` menonaktifkan master meski terdapat relasi aktif, tanpa menghapus data turunannya. `DELETE /:id?permanent=true` menghapus master dan data yang bergantung padanya. Kantor/Divisi menghapus dokumen penerbit, penempatan, dan relasi Kantor–Divisi terkait; Jabatan menghapus penempatan terkait.

Office wajib memiliki `code`, `name`, dan `timezone` dengan identifier IANA seperti `Asia/Makassar`. Division dan JobTitle wajib memiliki `code` serta `name`.

#### OfficeDivision

- `GET /office-divisions`
- `GET /office-divisions/:id`
- `POST /office-divisions`
- `PATCH /office-divisions/:id`
- `DELETE /office-divisions/:id`

Create body:

```json
{
  "officeId": "<uuid>",
  "divisionId": "<uuid>"
}
```

Office dan Division harus berada dalam company yang sama dan aktif.

`DELETE /office-divisions/:id?force=true` menonaktifkan relasi meski memiliki penempatan aktif. `permanent=true` menghapus dokumen dan penempatan yang bergantung pada relasi tersebut.

#### EmployeeAssignment

- `GET /assignments`
- `GET /assignments/:id`
- `POST /assignments`
- `PATCH /assignments/:id`
- `DELETE /assignments/:id`

Read memerlukan `User.View`, `User.Manage`, atau `System.Configure`. Mutation memerlukan `User.Manage`.

Create body:

```json
{
  "employeeId": "<uuid>",
  "officeDivisionId": "<uuid>",
  "jobTitleId": "<uuid-or-null>",
  "isPrimary": true,
  "validFrom": "2026-11-16",
  "validUntil": null
}
```

Employee, OfficeDivision, dan JobTitle harus konsisten dalam satu company. Maksimal satu assignment primary aktif per employee.

#### Response Status

| Status | Makna                                                 |
|--------|-------------------------------------------------------|
| 200    | Read, update, atau deactivate berhasil                |
| 201    | Resource dibuat                                       |
| 400    | Input atau relasi organisasi tidak valid              |
| 401    | Application session tidak valid                       |
| 403    | Permission tidak cukup atau gagal CSRF/Origin          |
| 404    | Resource tidak ditemukan dalam tenant                 |
| 409    | Duplicate code, constraint, atau referenced conflict  |
| 429    | Rate limit P04                                        |

Pada master turunan, `DELETE` menonaktifkan data secara default; `force=true` mengizinkan penonaktifan saat masih terdapat relasi aktif. `permanent=true` menghapus master beserta data terkait. Pada perusahaan, `DELETE` mengikuti aturan perusahaan di atas.

## 4. Group Policy

### P06 — Group Policy API

**Base URL:** `/api/v1/group-policy`

Seluruh endpoint memerlukan valid application session. Mutation mengikuti CORS, trusted Origin, CSRF, cookie policy, dan rate-limiting policy P04. Read-only Group Policy menerima `Group.View` atau `Group.Manage`; mutation mensyaratkan `Group.Manage` dan `System.Configure`. Evaluasi selalu menggunakan DENY precedence dan Default Deny.

#### Effective Permissions

`GET /me/effective-permissions` mengembalikan policy efektif employee yang sedang login dan tidak menerima employee ID atau company ID dari client.

```json
[
  { "code": "Group.View", "decision": "ALLOW" },
  { "code": "Group.Manage", "decision": "DENY" }
]
```

#### Permission Catalog

`GET /permissions` mengembalikan permission aktif beserta code, name, dan description. Katalog bersifat read-only untuk tenant.

#### Group Master

- `GET /groups`
- `GET /groups/:groupId`
- `POST /groups`
- `PATCH /groups/:groupId`
- `PATCH /groups/:groupId/status`
- `DELETE /groups/:groupId`

```json
{
  "code": "FINANCE_APPROVERS",
  "name": "Finance Approvers",
  "description": "Group untuk pengelola keuangan"
}
```

DELETE merupakan soft-deactivation.

#### Group Membership

- `GET /groups/:groupId/members`
- `GET /groups/:groupId/member-candidates?q=<nama-atau-NIP>`
- `POST /groups/:groupId/members`
- `DELETE /groups/:groupId/members/:employeeId`

```json
{ "employeeId": "<uuid>" }
```

Employee harus aktif dan berada dalam company yang sama dengan group.
Pencarian calon anggota hanya tersedia bagi pengelola grup, mencari nama atau NIP dalam perusahaan yang sama, dan mengembalikan maksimal 20 karyawan aktif yang belum menjadi anggota aktif. Client tetap mengirim `employeeId` setelah memilih hasil pencarian.

#### Group Permissions

- `GET /groups/:groupId/permissions`
- `POST /groups/:groupId/permissions`
- `POST /groups/:groupId/permissions/batch`
- `DELETE /groups/:groupId/permissions/:permissionCode`

```json
{
  "permissionCode": "Document.Download",
  "effect": "DENY"
}
```

Set menggunakan upsert dan permission harus aktif di katalog. Delete menonaktifkan policy, bukan menghapus baris fisik.
Batch menerima 1–100 kode izin unik dengan satu keputusan Allow atau Deny. Seluruh kode divalidasi dan disimpan dalam satu transaksi; setiap perubahan menghasilkan audit entry.

```json
{
  "permissionCodes": ["Document.Create", "Document.Download"],
  "effect": "ALLOW"
}
```

#### Common HTTP Responses

| Status | Makna                                                    |
|--------|----------------------------------------------------------|
| 200    | Read, update, atau deactivate berhasil                   |
| 201    | Resource dibuat atau policy/membership diaktifkan         |
| 400    | Input atau relasi tidak valid                            |
| 401    | Session tidak valid                                      |
| 403    | Effective permission kurang atau CSRF/Origin gagal       |
| 404    | Resource tidak tersedia dalam tenant                     |
| 409    | Unique constraint atau integrity conflict                |
| 429    | Request rate limited                                     |

Tenant isolation diterapkan server-side; client tidak dapat memilih company lain melalui request body.

## 4.A P07 — RLS Runtime POC

P07 membuktikan PostgreSQL RLS terhadap Prisma runtime connection. Backend authorization tetap menjadi enforcement utama. RLS adalah defense-in-depth dan hanya berlaku pada query yang memakai transaction-local identity context melalui transaction client yang sama.

### Diagnostic POC Endpoint

`GET /api/v1/rls-poc/resources/:id`

Memerlukan application session valid, employee dan company aktif, active primary office, serta resource yang dimiliki employee dan berada pada office tersebut.

Response sukses (`200 OK`):

```json
{
  "id": "<uuid>",
  "ownerEmployeeId": "<uuid>",
  "officeId": "<uuid>",
  "label": "P07 probe"
}
```

Resource yang tidak ada, dimiliki user lain, atau berada pada office lain menghasilkan generic `403 Forbidden`:

```json
{
  "code": "RLS_ACCESS_DENIED",
  "message": "Access denied."
}
```

Endpoint ini diagnostic P07, bukan business-domain endpoint. Probe table tidak dipakai untuk data production. Setelah RLS-protected Document domain memiliki equivalent coverage, endpoint dan probe table dapat dihapus melalui migration terpisah.

## 5. Document creation

### P08 — Document Master

P08 menyediakan metadata Draft sebelum file, participant, signature, dan workflow ditambahkan.

#### Document Master

- `GET /document-types`
- `GET /document-subtypes`
- `GET /document-subtypes?documentTypeId=<uuid>`

Master hanya mengembalikan type/subtype aktif. Kombinasi `documentTypeId` dan `documentSubtypeId` divalidasi di service serta composite foreign key database.

#### Creator Issuer Scope

`GET /documents/issuer-scopes` memerlukan `Document.Create`. Respons hanya berisi kombinasi Office dan Division dari assignment employee yang aktif dan masih valid. Client tidak mengirim company ID.

#### Create Draft

`POST /documents` memerlukan `Document.Create`.

```json
{
  "documentTypeId": "<uuid>",
  "documentSubtypeId": "<uuid>",
  "issuerOfficeId": "<uuid>",
  "issuerDivisionId": "<uuid>",
  "title": "Judul dokumen",
  "description": "Optional"
}
```

Server menetapkan `companyId` dan `creatorEmployeeId` dari authenticated employee, `status = DRAFT`, `revision = 1`, dan UUID `id` sebagai Tracking ID. Creator hanya dapat memilih Office/Division dari assignment aktif miliknya.

#### List Documents

`GET /documents?scope=mine&status=DRAFT&limit=50&cursor=<uuid>`

`scope=mine` hanya menampilkan dokumen milik creator. `scope=accessible` mengikuti document visibility policy: creator sendiri atau seluruh company bila mempunyai effective `Document.ViewAll`.

#### Read Document

`GET /documents/:documentId` mengizinkan creator membaca dokumen miliknya tanpa `Document.ViewAll`. Employee dengan `Document.ViewAll` dapat membaca dokumen dalam company yang sama. Resource yang tidak visible menghasilkan `404 DOCUMENT_NOT_FOUND` untuk mengurangi existence enumeration.

#### Update Draft

`PATCH /documents/:documentId` memerlukan effective `Document.Create`, ownership creator, status `DRAFT`, serta issuer scope yang masih valid. Request membawa revision terakhir yang dibaca browser:

```json
{
  "expectedRevision": 3,
  "title": "Judul baru"
}
```

Update berhasil menaikkan revision secara atomik. Revision yang sudah berubah menghasilkan `409 DOCUMENT_REVISION_CONFLICT`; status selain Draft menghasilkan `409 DOCUMENT_NOT_DRAFT`. `Document.ViewAll` tidak memberi hak mengubah Draft employee lain. P08 tidak menyediakan DELETE document.

### P09 — Private File Upload

`POST /documents/:documentId/files/upload` menerima `multipart/form-data` dengan tepat satu field binary `file` dan `fileRole` opsional (`MAIN`, default, atau `ATTACHMENT`). Maksimum 4 MiB. Filename harus aman dan paling banyak 255 byte UTF-8. Format yang diizinkan: PDF, DOCX, DOC, XLSX, XLS; ekstensi, MIME browser, dan signature/struktur container diperiksa di backend. Server menghitung SHA-256 dari byte yang tersimpan. Hanya creator dengan `Document.Create` dapat mengunggah ke Draft miliknya. P09 membuat `document_versions.version_no = 1` saat upload pertama; satu versi hanya boleh memiliki satu `MAIN`. Setiap upload sukses menaikkan `documents.revision`.

Response `201` memuat `id`, `documentVersionId`, `fileRole`, `originalFilename`, `detectedMime`, `sizeBytes`, `sha256`, `processingStatus = UPLOADED`, `reviewStatus = PENDING`, dan `createdAt`. Response tidak memuat pathname, URL, atau token storage. `GET /documents/:documentId/files` mengembalikan metadata file sesuai visibility dokumen. File tidak terlihat menghasilkan `404`.

`GET /documents/:documentId/files/:fileId/download` mengirim byte sebagai attachment melalui API setelah autentikasi, download permission check, dan RLS download-purpose check. Backend memeriksa ulang ukuran dan SHA-256 sebelum merespons. Header `Cache-Control: private, no-store` dan `X-Content-Type-Options: nosniff` diterapkan. `GET /documents/:documentId/files/:fileId/preview` merupakan jalur preview terautentikasi, tetapi hanya mengirim PDF setelah status `PREVIEW_READY`; pada P09 file baru masih `UPLOADED` sehingga hasilnya `409 FILE_PREVIEW_NOT_READY`. Scan malware, worker processing, review, dan pembuatan versi berikutnya merupakan phase setelah P09.

Storage backend menggunakan Vercel **private** Blob di production dan adapter private lokal hanya untuk development/test. Blob token/OIDC tetap di backend. Browser tidak menerima direct Blob URL.

| Method | Endpoint                              | Fungsi                         |
|--------|---------------------------------------|--------------------------------|
| GET    | `/document-types`                     | Jenis dokumen                  |
| GET    | `/document-subtypes`                  | Subjenis                       |
| POST   | `/documents`                          | Membuat draft                  |
| GET    | `/documents`                          | Daftar dokumen sesuai akses    |
| GET    | `/documents/:id`                      | Detail dokumen                 |
| PATCH  | `/documents/:id`                      | Update draft                   |
| POST   | `/documents/:id/versions`             | Membuat versi draft baru       |
| GET | `/documents/:id/files` | Daftar file pada dokumen yang visible |
| POST | `/documents/:id/files/upload` | Upload satu file privat; membutuhkan `Document.Create` |
| GET | `/documents/:id/files/:fileId/download` | Download file; membutuhkan `Document.Download` atau `Document.DownloadAll` |
| GET | `/documents/:id/files/:fileId/preview` | Preview file yang visible dan sudah `PREVIEW_READY` |
| GET    | `/documents/:id/files/:fileId/processing` | Status validasi/ekstraksi/konversi |
| POST   | `/documents/:id/files/:fileId/retry-processing` | Retry job gagal sesuai izin dan batas retry |
| POST   | `/documents/:id/files/:fileId/review` | Review/konfirmasi file         |
| DELETE | `/documents/:id/files/:fileId`        | Hapus file draft sesuai aturan |
| POST   | `/documents/:id/participants`         | Atur Knowing dan Approver      |
| POST   | `/documents/:id/submit`               | Atomic Creator Sign + Lock + Submit; request membawa metode/proof signature dan idempotency key |

### Document file authorization

Hak melihat dan mengunduh file merupakan capability terpisah.

- `Document.ViewAll` tidak memberikan hak download.
- `Document.Download` mengizinkan download hanya terhadap dokumen pada normal visibility scope employee.
- `Document.DownloadAll` mengizinkan download seluruh dokumen company tetapi tidak memberikan kemampuan metadata/list `Document.ViewAll`.
- Anonymous request menerima 401.
- Authenticated employee tanpa download permission menerima 403.
- Employee dengan `Document.Download` tetapi resource di luar visibility scope menerima 404 untuk mencegah enumeration.

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
