# Access Control & Security

## Surat Digital

**Versi:** 1.3

## 1. Security principles

- Default Deny.

- Least Privilege.

- Separation of Duties.

- Server-side authorization.

- Defense in Depth.

- Application-immutable audit baseline; tamper-evident controls are separate enhancements.

- Private document storage.

- Secure secret management.

- Explicit state transition.

- No trust based on UUID secrecy alone.

## 2. Group Policy

Satu employee dapat menjadi anggota beberapa Group Policy.

Permission efektif:

1.  Kumpulkan permission dari semua group aktif.

2.  Jika ada DENY untuk permission tersebut, hasil akhir DENY.

3.  Jika tidak ada DENY dan ada ALLOW, hasil ALLOW.

4.  Jika tidak ada ALLOW, hasil DENY.

Jabatan tidak otomatis menentukan permission.

## 3. Permission catalogue baseline

| Permission               | Fungsi                                                |
|--------------------------|-------------------------------------------------------|
| `User.View`              | Melihat direktori pengguna                            |
| `User.Manage`            | Mengelola pengguna dan import                         |
| `Group.View`             | Melihat Group Policy                                  |
| `Group.Manage`           | Mengelola grup, membership, permission                |
| `Document.Create`        | Membuat dokumen                                       |
| `Document.ViewAll`       | Melihat seluruh dokumen perusahaan                    |
| `Document.Download`      | Mengunduh dokumen yang memang boleh diakses           |
| `Document.DownloadAll`   | Mengunduh seluruh dokumen perusahaan                  |
| `Document.ExportArchive` | Ekspor arsip secara massal                            |
| `Approval.Execute`       | Menyetujui dan menandatangani dokumen yang ditugaskan |
| `Approval.Reject`        | Menolak permanen dokumen yang ditugaskan              |
| `Signature.Visual`       | Menggunakan tanda tangan visual                       |
| `Signature.Internal`     | Menggunakan TTE internal                              |
| `Template.Manage`        | Mengelola template                                    |
| `Form.Manage`            | Mengelola Form Builder                                |
| `Archive.View`           | Mengakses modul arsip                                 |
| `Audit.View`             | Melihat Audit Log                                     |
| `Audit.Export`           | Mengekspor Audit Log                                  |
| `Numbering.Manage`       | Mengelola konfigurasi penomoran                       |
| `System.Configure`       | Mengelola konfigurasi sistem                          |
| `Workflow.Repair`        | Mengganti participant BLOCKED melalui recovery teraudit |

Permission katalog dapat diperluas melalui migration baru.

## 4. Document visibility

Pengguna tanpa `Document.ViewAll` hanya dapat melihat:

- Dokumen yang dibuatnya sendiri.

- Dokumen yang ditugaskan kepadanya sebagai Knowing.

- Dokumen yang ditugaskan kepadanya sebagai Approver, baik aktif maupun
  selesai.

Creator tetap dapat melihat dokumen buatannya meskipun tidak memiliki
`Document.ViewAll`.

`Document.ViewAll` memberikan akses melihat seluruh dokumen perusahaan.

## 5. Download dan export

Pemisahan:

- `Document.ViewAll`: melihat seluruh dokumen.

- `Document.Download`: mengunduh dokumen yang memang berhak dilihat.

- `Document.DownloadAll`: mengunduh seluruh dokumen perusahaan.

- `Document.ExportArchive`: ekspor arsip secara massal.

Hak download tidak boleh disimpulkan hanya dari kemampuan melihat.

## 6. Separation of Duties

Aturan:

- Creator tidak boleh menjadi Knowing.

- Creator tidak boleh menjadi Approver.

- Satu orang tidak boleh menjadi Knowing dan Approver pada dokumen yang
  sama.

- Knowing tidak memiliki permission approval dari penugasan Knowing.

- Hanya approver aktif yang dapat approve/reject.

- User dengan banyak group tetap tunduk pada aturan ini.


## 7. Supabase RLS dan Prisma

RLS harus diaktifkan pada tabel aplikasi di schema yang dapat diakses melalui Supabase Data API atau role database aplikasi. Policy harus mengikuti prinsip least privilege.

### 7.1 Tanggung jawab yang berbeda

- **Backend authorization:** sumber enforcement utama untuk API NestJS. Memvalidasi JWT, employee aktif, Group Policy, permission, keterlibatan dokumen, dan state transition.
- **PostgreSQL RLS:** lapisan tambahan untuk membatasi baris pada level database.
- **Prisma:** ORM/data access layer. Prisma tidak otomatis meneruskan JWT Supabase atau mengisi `auth.uid()`.

### 7.2 Database roles

Pisahkan:
- Migration role dengan hak DDL untuk Prisma Migrate.
- Runtime role untuk NestJS dengan hak DML minimum, bukan owner tabel, dan tanpa `BYPASSRLS` jika RLS memang akan ditegakkan pada query Prisma.
- Hindari menggunakan `postgres` atau `service_role` sebagai runtime database identity.

Jika runtime role diberi atribut `BYPASSRLS`, RLS tidak melindungi query Prisma yang dijalankan role tersebut. Backend authorization tetap wajib. Jangan membuat klaim bahwa RLS melindungi query Prisma dalam konfigurasi bypass.

### 7.3 Identity context dengan Prisma

Jika policy menggunakan `auth.uid()`:
1. NestJS memverifikasi Supabase JWT.
2. Backend mengambil UUID `sub` dari JWT terverifikasi.
3. Backend memulai Prisma transaction.
4. Di awal transaction, set identity claim secara lokal, misalnya `SELECT set_config('request.jwt.claim.sub', <verified-user-id>, true)`.
5. Semua query dalam scope tersebut menggunakan transaction client yang sama.
6. Policy diarahkan ke runtime role yang sesuai dan role tersebut tidak bypass RLS.
7. Test memastikan tidak ada context yang bocor antar transaksi/pengguna.

Jangan memakai session-level `SET` pada transaction pooler. `set_config(..., true)` harus berada di dalam transaction yang sama dengan query yang dilindungi. Jika pola ini belum dibuktikan, backend authorization tetap menjadi kontrol utama dan RLS hanya dapat diklaim melindungi jalur yang benar-benar tunduk pada policy.

### 7.4 Policy baseline

- Baca dokumen berdasarkan Creator, participant, atau `Document.ViewAll`.
- Baca notifikasi hanya milik penerima.
- Baca Audit Log hanya dengan `Audit.View`.
- Metadata storage, hasil ekstraksi, dan hash PIN tidak dibuka melalui direct client read.
- Write operations bisnis dilakukan melalui NestJS.
- Uji SELECT, INSERT, UPDATE, DELETE untuk role dan identitas yang tepat.
- Policy SQL disimpan dalam migration Prisma, bukan hanya dibuat manual di Dashboard.

### 7.5 Supabase Data API dan secret

Jika seluruh akses tabel aplikasi memang hanya melalui Prisma/NestJS, pertimbangkan menonaktifkan Supabase Data API untuk mengurangi permukaan serangan setelah memastikan tidak ada fitur yang masih membutuhkannya. Supabase Auth tetap dapat digunakan.

Supabase service role/secret key dapat melewati RLS. Jika key diperlukan untuk operasi administratif Supabase Auth, batasi hanya di backend dan jangan gunakan sebagai database runtime Prisma tanpa alasan yang disetujui. Jangan pernah menaruh service role key pada React.

## 8. File security

- Gunakan private storage atau authenticated proxy.

- Jangan simpan Blob token di frontend.

- Jangan mengirim URL private yang dapat digunakan tanpa kontrol akses.

- Validasi MIME type dan ekstensi.

- Periksa ukuran file.

- Gunakan random/opaque pathname.

- Simpan SHA-256.

- Wajib malware scanning/quarantine sebelum parser/OCR/converter; baseline fail-closed.

- Cegah path traversal.

- Batasi download massal.

- Audit aktivitas download/export.

- Terapkan lifecycle dan cleanup untuk orphaned objects.

## 8A. Malware, preview, dan untrusted content

- Malware scanning/quarantine **wajib** sebelum parser, OCR, LibreOffice, atau library document processing membaca konten.
- Baseline policy fail-closed: scan timeout/error diperlakukan belum aman dan file tidak diproses sampai scan berhasil atau ada prosedur manual yang disetujui Security.
- Parser/LibreOffice berjalan dalam sandbox/container non-root dengan CPU/RAM/time/temp-disk/network limits.
- Preview PDF/untrusted content menggunakan CSP dan iframe sandbox policy yang disetujui; JavaScript/active content tidak boleh dipercaya.
- `X-Content-Type-Options: nosniff` dan `Content-Disposition` digunakan sesuai tujuan preview/download.
- Filename, title, extracted text, editor HTML, dan form label dianggap untrusted input; encode/sanitize untuk mencegah stored XSS.

## 9. Authentication dan session

- Browser melakukan login hanya ke NestJS auth gateway; frontend tidak memanggil Supabase Auth langsung.
- NestJS melakukan username/NIP resolver server-side lalu memanggil Supabase Auth.
- Gunakan generic error untuk mencegah account enumeration.
- Session storage baseline menggunakan secure `HttpOnly` + `Secure` cookie bila kompatibel dengan deployment; jika bearer token dipilih, risiko XSS/token storage harus didokumentasikan di ADR.
- Jika cookie digunakan, CSRF protection dan `SameSite` policy wajib; CORS hanya mengizinkan origin frontend yang disetujui.
- Terapkan login rate limit, refresh rotation/revoke sesuai kemampuan provider, dan session expiration.
- Suspended/inactive employee ditolak backend pada setiap protected request walaupun token provider belum kedaluwarsa; revoke dilakukan saat status berubah bila tersedia.
- MFA dapat dipertimbangkan sebagai peningkatan keamanan.

## 10. Internal signature PIN

- PIN khusus tanda tangan.

- Simpan hash dengan algoritma yang sesuai untuk secret pendek, ditambah
  salt.

- Jangan log PIN.

- Jangan kirim PIN melalui email.

- Rate limit percobaan.

- Lockout sementara setelah kegagalan berulang.

- Reset/revoke harus melalui proses terverifikasi dan tercatat.

- Signature record mengikat user, role, document version, `document_manifest_hash`, metode, timestamp, authentication context, dan evidence reference bila diperlukan.

- Jangan menyediakan endpoint generik yang hanya menjawab PIN benar/salah. PIN diverifikasi di operation signature atau melalui short-lived purpose-bound proof yang tidak reusable sebagai oracle.

TTE internal bukan otomatis TTE tersertifikasi PSrE. Legal review
diperlukan untuk menentukan penggunaan yang sesuai dengan kebijakan dan
tingkat risiko dokumen perusahaan.

## 11. Audit Log

Field yang disarankan:

- actor employee ID.

- action.

- resource type dan ID.

- timestamp.

- IP address.

- perkiraan lokasi IP.

- browser/OS/device.

- session ID.

- request/correlation ID.

- before/after berbasis allowlist; jangan simpan raw request body.

- outcome.

- reason.

Lokasi IP merupakan estimasi, bukan GPS. IP dan user-agent tidak boleh
diperlakukan sebagai bukti identitas tunggal.

Audit baseline disebut **application-immutable**: aplikasi tidak memiliki operasi update/delete audit. Ini tidak sama dengan cryptographic tamper-evidence terhadap DBA/provider. Jika assurance lebih tinggi diperlukan, gunakan hash chaining, signed audit batches, atau WORM/external append-only sink sebagai enhancement.

Audit bersifat append-only dari aplikasi:

- Tidak ada update/delete dari aplikasi.

- Akses baca melalui `Audit.View`.

- Export melalui `Audit.Export`.

- Perubahan permission, role, dan master data harus diaudit.

Retensi rekomendasi:

- Dokumen, nomor, approval, dan signature evidence: permanen sesuai
  kebijakan perusahaan.

- Log teknis login/session: retensi awal 2 tahun sebagai rekomendasi,
  perlu persetujuan legal/IT.

## 12. Backup dan recovery

- Backup database otomatis.

- Backup di lokasi terpisah.

- Backup metadata dan file storage.

- Uji restore berkala.

- Tetapkan RPO/RTO.

- Simpan log backup.

- Pastikan backup terenkripsi dan akses dibatasi.

## 13. Security test wajib

- IDOR.

- RLS bypass.

- Role/permission escalation.

- Explicit Deny precedence.

- Creator self-approval.

- Knowing/Approver overlap.

- Unauthorized download.

- Public Blob access.

- PIN brute force.

- Session replay/expired token.

- File upload malicious.

- SQL injection.

- XSS.

- CSRF jika pola autentikasi/cookie memerlukannya.

- Audit tampering.

- Concurrent numbering.

- Duplicate finalization.

## 15. External Signing & Billing security — v1.3

### Public External Signing

- Gunakan token acak high entropy; database menyimpan hash token, bukan plaintext.
- Token harus purpose-bound ke external signing request dan document version tertentu.
- Token memiliki expiry dan revocation.
- Jangan menaruh token penuh pada application log, analytics event, referrer, atau audit detail.
- Terapkan rate limit, bot/abuse controls, generic error, dan optional OTP/challenge sesuai risk level.
- Public capability tidak boleh dapat dipakai untuk enumerate employee/document/archive.
- Document review/download public hanya melalui endpoint yang memvalidasi request capability setiap kali.
- Signature consent/evidence harus tercatat tanpa mengumpulkan data identitas yang tidak diperlukan.

### Public QR Verification

- Verification token terpisah dari external-sign token.
- Metadata publik menggunakan explicit allowlist.
- QR scan tidak memberi akses Blob URL privat secara otomatis.
- Rate-limit abuse tidak boleh mengubah legitimate scan menjadi event berbayar.

### Credit/Billing

- Harga, balance, allocation, expiry, dan consume amount selalu dihitung server-side.
- Client tidak boleh mengirim `balance_after` authoritative.
- Admin grant/reversal membutuhkan permission khusus, step-up authentication bila relevan, reason, dan audit.
- Ledger, payment reference, dan subscription mutation termasuk security-sensitive administrative data.
- Webhook/payment callback harus diverifikasi signature/provider secret dan idempotent sebelum credit diberikan.
