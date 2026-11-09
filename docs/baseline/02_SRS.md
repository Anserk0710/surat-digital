# Software Requirements Specification (SRS)

## Surat Digital

**Versi:** 1.3 — Implementation baseline

## 1. Tujuan dokumen

SRS menjelaskan kebutuhan fungsional, aturan bisnis, kebutuhan
nonfungsional, dan kriteria sistem yang akan digunakan sebagai acuan
desain, implementasi, dan pengujian.

## 2. Konvensi prioritas

- **Must:** wajib tersedia untuk MVP.

- **Should:** penting, tetapi dapat dijadwalkan setelah fungsi inti.

- **Could:** peningkatan lanjutan.

- **TBD:** belum diputuskan.

## 3. Kebutuhan fungsional

### 3.1 Authentication & User Management

| ID          | Requirement                                                                       | Prioritas |
|-------------|-----------------------------------------------------------------------------------|-----------|
| FR-AUTH-001 | Sistem menyediakan login dengan Email, Username, atau NIP dan Password            | Must      |
| FR-AUTH-002 | Sistem menghubungkan akun login ke satu record employee                           | Must      |
| FR-AUTH-003 | Password dikelola Supabase Auth dan tidak disimpan pada tabel employees           | Must      |
| FR-USER-001 | Administrator dapat mengimpor data karyawan melalui Excel                         | Must      |
| FR-USER-002 | Karyawan dapat melakukan registrasi mandiri                                       | Must      |
| FR-USER-003 | Registrasi mandiri berstatus Pending sampai diverifikasi/diaktifkan Administrator | Must      |
| FR-USER-004 | Sistem mencegah NIP, username, atau email duplikat dalam perusahaan               | Must      |
| FR-USER-005 | Administrator dapat mengaktifkan, menonaktifkan, atau menangguhkan akun           | Must      |
| FR-USER-006 | Pengguna memiliki jabatan, divisi, dan kantor sebagai data organisasi             | Must      |

### 3.2 Organization Management

| ID         | Requirement                                                                        | Prioritas |
|------------|------------------------------------------------------------------------------------|-----------|
| FR-ORG-001 | Sistem mendukung satu perusahaan                                                   | Must      |
| FR-ORG-002 | Sistem mendukung kantor pusat dan kantor cabang                                    | Must      |
| FR-ORG-003 | Sistem mendukung 10 divisi pada konfigurasi awal                                   | Must      |
| FR-ORG-004 | Satu divisi dapat terhubung ke beberapa kantor                                     | Must      |
| FR-ORG-005 | Pengguna dapat memiliki penempatan organisasi yang lebih dari satu jika diperlukan | Should    |
| FR-ORG-006 | Jabatan tidak otomatis memberikan permission                                       | Must      |

### 3.3 Group Policy

| ID         | Requirement                                                             | Prioritas |
|------------|-------------------------------------------------------------------------|-----------|
| FR-IAM-001 | Satu pengguna dapat menjadi anggota beberapa Group Policy               | Must      |
| FR-IAM-002 | Permission dapat diberikan dengan efek ALLOW atau DENY                  | Must      |
| FR-IAM-003 | DENY mengalahkan ALLOW                                                  | Must      |
| FR-IAM-004 | Permission yang tidak diberikan dianggap tidak diizinkan (Default Deny) | Must      |
| FR-IAM-005 | Perubahan membership dan permission dicatat di Audit Log                | Must      |
| FR-IAM-006 | Hak melihat, mengunduh, dan mengekspor dokumen dipisahkan               | Must      |

### 3.4 Document Creation

| ID         | Requirement                                                              | Prioritas |
|------------|--------------------------------------------------------------------------|-----------|
| FR-DOC-001 | Sistem mendukung Surat Internal, SK, dan Dokumen Pengajuan               | Must      |
| FR-DOC-002 | Sistem menyediakan metode Template, Editor, dan Upload                   | Must      |
| FR-DOC-003 | Sistem mendukung PDF, DOCX, DOC, XLSX, dan XLS                           | Must      |
| FR-DOC-004 | Upload dilakukan satu per satu dengan preview/review sebelum konfirmasi  | Must      |
| FR-DOC-005 | Satu versi dokumen hanya memiliki satu file utama                        | Must      |
| FR-DOC-006 | Satu versi dokumen dapat memiliki banyak lampiran                        | Must      |
| FR-DOC-007 | Excel dapat menjadi file utama atau lampiran                             | Must      |
| FR-DOC-008 | File Office dikonversi ke PDF representasi untuk review dan tanda tangan | Must      |
| FR-DOC-009 | File asli tetap disimpan sebagai arsip                                   | Must      |
| FR-DOC-010 | Isi dan file yang diajukan dikunci setelah submit                        | Must      |
| FR-DOC-011 | Sistem mendukung editor internal dengan fungsi dasar seperti Word        | Must      |
| FR-DOC-012 | Sistem memvalidasi ekstensi, MIME type, signature file, ukuran, dan hash  | Must      |
| FR-DOC-013 | Sistem memproses file secara asynchronous dan menampilkan status job     | Must      |
| FR-DOC-014 | Sistem mengekstrak teks/paragraf/tabel dari PDF, DOCX, dan DOC yang didukung   | Must      |
| FR-DOC-015 | Sistem mengekstrak workbook, sheet, dan data sel XLSX/XLS                 | Must      |
| FR-DOC-016 | Sistem mendeteksi PDF scan dan menyediakan OCR fallback                  | Should    |
| FR-DOC-017 | Sistem menyediakan PDF preview untuk Office file sebelum review         | Must      |
| FR-DOC-018 | Pengguna wajib memeriksa dan mengonfirmasi preview sebelum submit         | Must      |
| FR-DOC-019 | Sistem menyimpan metadata ekstraksi, parser version, dan status job       | Must      |
| FR-DOC-020 | Sistem mendukung retry idempotent untuk job processing yang gagal        | Must      |
| FR-DOC-021 | Sistem tidak mengeksekusi macro atau active content dari file upload     | Must      |

### 3.5 Form Builder

| ID          | Requirement                                                                                              | Prioritas |
|-------------|----------------------------------------------------------------------------------------------------------|-----------|
| FR-FORM-001 | Pengguna berizin dapat membuat definisi form                                                             | Must      |
| FR-FORM-002 | Form mendukung Text, Textarea, Number, Date, Dropdown, Checkbox, Radio, File Upload, dan Repeating Table | Must      |
| FR-FORM-003 | Field dapat ditandai wajib atau opsional                                                                 | Must      |
| FR-FORM-004 | Perubahan form menghasilkan versi baru                                                                   | Must      |
| FR-FORM-005 | Submission lama tetap mengacu pada versi form yang digunakan saat pengajuan                              | Must      |

### 3.6 Workflow & Approval

| ID        | Requirement                                                                                | Prioritas |
|-----------|--------------------------------------------------------------------------------------------|-----------|
| FR-WF-001 | Creator Sign + Lock + Submit dijalankan sebagai satu transaksi bisnis atomik                      | Must      |
| FR-WF-002 | Creator memilih divisi dan kantor penerbit                                                 | Must      |
| FR-WF-003 | Creator memilih pihak Knowing dan Approver                                                 | Must      |
| FR-WF-004 | Pemilihan participant divalidasi berdasarkan permission dan aturan bisnis                  | Must      |
| FR-WF-004A | Permission dan status aktif participant diperiksa ulang ketika action dilakukan             | Must      |
| FR-WF-005 | Creator tidak boleh menjadi Knowing atau Approver pada dokumen yang dibuatnya              | Must      |
| FR-WF-006 | Satu orang tidak boleh menjadi Knowing sekaligus Approver pada dokumen yang sama           | Must      |
| FR-WF-007 | Semua Knowing wajib membaca, konfirmasi, dan menandatangani sebelum Approver pertama aktif | Must      |
| FR-WF-008 | Knowing tidak melakukan approval                                                           | Must      |
| FR-WF-009 | Approver memeriksa, menyetujui, dan menandatangani dalam satu tahap                        | Must      |
| FR-WF-010 | Approval berjalan berurutan dan hanya satu approver aktif                                  | Must      |
| FR-WF-011 | Approver tidak memiliki batas waktu global                                                 | Must      |
| FR-WF-012 | Tidak ada delegasi approver pada MVP                                                       | Must      |
| FR-WF-013 | Approver dapat menolak permanen dengan alasan wajib                                        | Must      |
| FR-WF-014 | Creator dapat withdraw sebelum persetujuan pertama dengan alasan wajib                     | Must      |
| FR-WF-015 | Setelah approval pertama selesai, Creator tidak dapat withdraw                             | Must      |
| FR-WF-016 | Workflow dan isi dokumen dikunci sebagai bagian dari transaksi Sign+Submit                            | Must      |
| FR-WF-017 | Participant nonaktif/kehilangan permission menyebabkan task blocked, bukan bypass                      | Must      |
| FR-WF-018 | Admin berizin dapat melakukan Workflow Recovery untuk mengganti participant blocked dengan reason wajib dan audit penuh | Must |

### 3.7 Signature

| ID         | Requirement                                                                 | Prioritas |
|------------|-----------------------------------------------------------------------------|-----------|
| FR-SIG-001 | Sistem menyediakan tanda tangan visual                                      | Must      |
| FR-SIG-002 | Tanda tangan visual dibuat saat proses tanda tangan, bukan reusable profile | Must      |
| FR-SIG-003 | Sistem menyediakan tanda tangan elektronik internal                         | Must      |
| FR-SIG-004 | TTE internal memerlukan profil lengkap dan registrasi aktif                 | Must      |
| FR-SIG-005 | TTE internal menggunakan PIN khusus tanda tangan                            | Must      |
| FR-SIG-006 | PIN disimpan dalam bentuk hash                                              | Must      |
| FR-SIG-007 | Setiap penandatangan memilih metodenya sendiri                              | Must      |
| FR-SIG-008 | Signature mengikat identitas, waktu, metode, versi, dan `document_manifest_hash` canonical | Must      |
| FR-SIG-009 | Tanda tangan Creator, Knowing, dan Approver ditampilkan pada PDF final      | Must      |
| FR-SIG-010 | Sistem menyediakan QR/halaman verifikasi dokumen                            | Must      |
| FR-SIG-011 | Integrasi PSrE tersertifikasi tidak termasuk MVP                            | Must      |

### 3.8 Numbering

| ID         | Requirement                                                               | Prioritas |
|------------|---------------------------------------------------------------------------|-----------|
| FR-NUM-001 | Nomor resmi mengikuti format `NNN/JENIS/DIVISI/KANTOR/BULAN_ROMAWI/TAHUN` | Must      |
| FR-NUM-002 | Nomor resmi di-reserve setelah seluruh approval selesai dan sebelum komposisi PDF final    | Must      |
| FR-NUM-003 | Counter dipisah berdasarkan jenis, divisi, kantor, bulan, dan tahun       | Must      |
| FR-NUM-004 | Counter dimulai dari 001 setiap bulan                                     | Must      |
| FR-NUM-005 | Nomor resmi unik dan tidak boleh digunakan kembali                        | Must      |
| FR-NUM-006 | Rejected dan Cancelled tidak menerima nomor resmi                         | Must      |
| FR-NUM-007 | Nomor dibuat secara transaksional dan aman dari race condition            | Must      |
| FR-NUM-008 | Retry finalisasi memakai reservation yang sama; kegagalan permanen mengubah reservation menjadi VOID tanpa reuse | Must |

### 3.9 Notification, Archive, Audit

| ID         | Requirement                                                                                                   | Prioritas |
|------------|---------------------------------------------------------------------------------------------------------------|-----------|
| FR-NOT-001 | Sistem menyediakan notifikasi in-app                                                                          | Must      |
| FR-NOT-002 | Sistem mengirim notifikasi email                                                                              | Must      |
| FR-NOT-003 | Knowing menerima notifikasi saat awal submit dan setelah dokumen terbit                                       | Must      |
| FR-ARC-001 | Sistem menyediakan pencarian berdasarkan nomor, ID, judul, tipe, pembuat, divisi, kantor, tanggal, dan status | Must      |
| FR-ARC-002 | Sistem menyediakan pencarian isi dokumen yang dapat diekstrak teksnya                                         | Should    |
| FR-ARC-003 | Dokumen resmi tidak dapat dihapus melalui fungsi biasa                                                        | Must      |
| FR-AUD-001 | Sistem mencatat user, aktivitas, waktu, IP, lokasi perkiraan, device, dan hasil tindakan                      | Must      |
| FR-AUD-002 | Audit Log bersifat append-only dari aplikasi                                                                  | Must      |
| FR-AUD-003 | Audit Log dapat dilihat/diekspor hanya oleh pengguna berizin                                                  | Must      |

### 3.10 Reliability, File Security, dan API Contract

| ID | Requirement | Prioritas |
|---|---|---|
| FR-REL-001 | Dispatch job/event kritis menggunakan transactional outbox yang ditulis dalam transaksi yang sama dengan state bisnis | Must |
| FR-REL-002 | Outbox dispatcher/reconciliation dapat melakukan retry idempotent tanpa menggandakan side effect | Must |
| FR-FILE-001 | Semua file upload menjalani malware scan/quarantine sebelum parser, OCR, atau converter | Must |
| FR-FILE-002 | File yang gagal scan atau scan timeout sesuai fail-closed policy tidak boleh diproses lebih lanjut | Must |
| FR-API-001 | OpenAPI menjadi source of truth untuk DTO, response, error, pagination, dan generated TypeScript client/types | Must |
| FR-API-002 | Browser melakukan autentikasi melalui endpoint NestJS; Supabase Auth tidak dipanggil langsung dari frontend | Must |
| FR-API-003 | Endpoint PIN generik tidak boleh menjadi PIN-validation oracle; PIN diverifikasi di operation yang membutuhkan signature atau melalui proof yang purpose-bound dan short-lived | Must |

## 4. Kebutuhan nonfungsional

Target di bawah adalah **baseline engineering v1.3** untuk pilot dan harus divalidasi melalui POC/performance test. Perubahan target wajib masuk Decision Log.

| ID | Kebutuhan | Kriteria baseline v1.3 |
|---|---|---|
| NFR-001 | Responsif | Desktop, tablet, dan HP; flow inti dapat diselesaikan tanpa horizontal scroll yang memblokir tindakan |
| NFR-002 | Keamanan transport | HTTPS untuk seluruh komunikasi; secure cookie bila session cookie digunakan |
| NFR-003 | Password/session | Supabase Auth diakses melalui NestJS auth gateway; session lifecycle, refresh/revoke, CSRF/CORS didokumentasikan dan diuji |
| NFR-004 | Authorization | Backend authorization wajib; RLS hanya diklaim efektif jika runtime role/context benar-benar tunduk pada policy |
| NFR-005 | File privacy | File internal tidak dapat diakses publik tanpa authorization; download melalui authenticated proxy/signed access yang terkontrol |
| NFR-006 | Integritas dokumen | SHA-256 file + canonical `document_manifest_hash`; final PDF memiliki SHA-256 tersimpan |
| NFR-007 | Auditability | Tindakan penting memiliki actor, timestamp, request/correlation ID, outcome, dan reason bila relevan |
| NFR-008 | Availability | Baseline pilot 99.5% per bulan untuk komponen aplikasi yang dikelola, di luar maintenance terjadwal dan outage provider yang terdokumentasi |
| NFR-009 | Backup | Backup otomatis dan restore drill berkala dengan evidence |
| NFR-010 | Maintainability | Modular NestJS, Prisma, versioned migrations, OpenAPI, generated client/types, automated tests |
| NFR-011 | Capacity | Baseline ±100 user; common API read/write tanpa file processing p95 ≤ 800 ms/1.5 s pada dataset pilot; list/search p95 ≤ 2 s untuk query terindeks |
| NFR-012 | Accessibility | Target WCAG 2.2 AA untuk flow inti: keyboard, focus, label, contrast, error association, dan screen-reader semantics |
| NFR-013 | Data retention | Dokumen/nomor/approval mengikuti kebijakan; log teknis memiliki retention eksplisit |
| NFR-014 | Recovery | Baseline RPO ≤ 24 jam dan RTO ≤ 4 jam sampai SLA kontraktual menetapkan target lain |
| NFR-015 | Worker processing | p95 PDF digital ≤ 30 detik dan Office conversion ≤ 60 detik untuk fixture dalam batas file yang disetujui; timeout/limit terdokumentasi |
| NFR-016 | Observability | Queue age, dead-letter, outbox backlog, finalization failure, auth failure, dan storage error memiliki metric/alert |

## 5. Aturan validasi inti

- Satu `document_version` harus memiliki tepat satu file `MAIN` ketika
  submit.

- Semua file harus direview dan diterima sebelum submit.

- Creator signature tidak dibuat sebagai langkah final terpisah; server membuat signature dalam transaksi atomik Sign+Lock+Submit setelah manifest final dihitung.

- Semua Knowing harus selesai sebelum approver pertama aktif.

- Hanya approver berstatus ACTIVE yang dapat approve/reject.

- Approver wajib memiliki signature record pada versi terkunci.

- Semua approver harus selesai sebelum reservasi nomor. Reservation harus berhasil sebelum final-PDF job dipublikasikan.

- PDF final harus cocok dengan hash yang disimpan dan dapat ditelusuri ke manifest/reservation yang sama.
- File upload tidak dapat direview/submit sebelum validasi dan processing wajib selesai.
- Processing job harus idempotent dan kegagalan dapat di-retry tanpa menggandakan hasil.
- Malware scan harus berstatus lulus sebelum parser/OCR/converter berjalan.
- Runtime permission participant harus masih valid saat action dilakukan.
- Outbox event yang belum dipublish harus dapat dideteksi dan didispatch ulang.

- Status transition harus mengikuti state machine.

## 6. Kriteria penerimaan sistem

Sistem dinyatakan memenuhi SRS jika:

1.  Seluruh Must requirements lolos test.

2.  Tidak ada critical/high security issue yang belum dimitigasi.

3.  Workflow utama lolos end-to-end test.

4.  Pengujian RLS dan permission lintas pengguna lolos.

5.  Penomoran diuji dengan permintaan bersamaan.

6.  Restore backup berhasil diuji.

7.  UAT ditandatangani pemilik proses.
8.  OpenAPI contract validation dan generated client/type check lolos CI.
9.  Atomic Creator Sign+Submit, manifest verification, workflow recovery, outbox recovery, malware fail-closed, dan numbering/finalization retry lolos integration/E2E tests.
10. NFR baseline telah diukur pada environment staging/pilot dan hasilnya terdokumentasi.


## 7. Ketentuan implementasi database

- Supabase PostgreSQL adalah database ter-host.
- Prisma Client adalah jalur utama akses tabel aplikasi dari NestJS.
- `schema.prisma` mendefinisikan model aplikasi.
- Prisma Migrate mengelola migration; Prisma Seed mengelola seed.
- Supabase Auth mengelola `auth.users`; tabel ini bukan tabel aplikasi yang dikelola Prisma.
- RLS policy, trigger, dan function ditambahkan sebagai SQL kustom dalam migration Prisma.
- RLS tidak otomatis aktif untuk Prisma. Runtime DB role, transaction-local identity context, dan policy harus diuji.
- Jangan memakai Supabase JS Client sebagai ORM/database access utama.

## 8. Requirements v1.3 — External Signing, Verification, dan Credit Billing

### 8.1 External Signing & Verification

| ID | Requirement | Prioritas |
|---|---|---|
| FR-EXT-001 | Internal user berizin dapat membuat invitation External Signing untuk versi dokumen terkunci | Must |
| FR-EXT-002 | External signer tidak memerlukan internal account atau paid seat | Must |
| FR-EXT-003 | Invitation memakai high-entropy purpose-bound token yang disimpan dalam bentuk hash, memiliki expiry, status, dan revocation | Must |
| FR-EXT-004 | Identity challenge/OTP bila diaktifkan harus rate-limited dan tidak membocorkan keberadaan recipient kepada pihak tidak berwenang | Must |
| FR-EXT-005 | External signer hanya dapat mengakses dokumen/action yang ditunjuk invitation; tidak memiliki akses archive/internal API | Must |
| FR-EXT-006 | Successful external signature mengikat signer evidence, timestamp, document version, dan `document_manifest_hash` | Must |
| FR-EXT-007 | Revoke/expire sebelum signature berhasil tidak menghasilkan consumed credit | Must |
| FR-EXT-008 | Duplicate/retry external sign operation harus idempotent | Must |
| FR-VER-001 | Dokumen `ISSUED` memiliki public verification token/QR sesuai policy | Must |
| FR-VER-002 | Scan QR/public verification tidak mengonsumsi Document Credit | Must |
| FR-VER-003 | Public verification menampilkan allowlisted metadata/status dan tidak mengekspos file privat secara default | Must |
| FR-VER-004 | Subscription berakhir tidak otomatis mengubah dokumen resmi menjadi invalid; document validity dan account status dipisahkan | Must |

### 8.2 Credit Billing

| ID | Requirement | Prioritas |
|---|---|---|
| FR-BILL-001 | Billing baseline menggunakan Document Credits per company/workspace, bukan per internal user | Must |
| FR-BILL-002 | Internal account tidak memotong credit hanya karena dibuat/login | Must |
| FR-BILL-003 | Sistem mendukung credit source `SUBSCRIPTION_ALLOCATION`, `TOP_UP`, `TRIAL`, `ADMIN_GRANT`, dan `REVERSAL` | Must |
| FR-BILL-004 | Credit mutation disimpan pada application-append-only ledger; koreksi menggunakan entry baru | Must |
| FR-BILL-005 | External signing menggunakan `RESERVE → CONSUME` saat berhasil atau `RESERVE → RELEASE` bila gagal/cancel/expired | Must |
| FR-BILL-006 | QR-only issued document mengonsumsi 1 credit; dokumen dengan external signer mengonsumsi total `max(1, completed_external_signers)` | Must |
| FR-BILL-007 | Scan QR, preview, resend, OTP gagal, dan retry teknis tidak menghasilkan debit tambahan | Must |
| FR-BILL-008 | Subscription credit rollover dibatasi maksimum 2× monthly allocation dan setiap monthly allocation berlaku maksimal dua billing cycle | Must |
| FR-BILL-009 | Top-up credit memiliki expiry baseline 12 bulan dan hanya diberikan setelah pembayaran/konfirmasi valid | Must |
| FR-BILL-010 | Trial baseline 50 credit atau 30 hari, mana yang lebih dahulu | Should |
| FR-BILL-011 | Saldo baseline tidak boleh negatif; operation baru yang membutuhkan credit gagal dengan `CREDIT_INSUFFICIENT` tanpa membatalkan reservation existing | Must |
| FR-BILL-012 | Consumption memakai lot yang paling cepat expired terlebih dahulu | Must |
| FR-BILL-013 | Setiap debit memiliki reference business event dan idempotency key unik | Must |
| FR-BILL-014 | Sistem menyediakan credit summary, ledger/history, allocation, expiry, dan low-balance visibility | Must |
| FR-BILL-015 | Admin grant/reversal memerlukan permission, actor, reason, dan audit | Must |

### 8.3 NFR billing tambahan

| ID | Kebutuhan | Kriteria baseline v1.3 |
|---|---|---|
| NFR-017 | Credit consistency | Concurrent consume/reserve tidak dapat membuat saldo available negatif atau double debit |
| NFR-018 | Billing reconciliation | Wallet/projection dapat direkonsiliasi dari lot/ledger/reservation; mismatch memicu alert |
| NFR-019 | External token security | Token high entropy, hashed at rest, expiry/revocation, rate-limit, generic error, dan no-token-in-log |
| NFR-020 | Public verification abuse resistance | Rate limit/bot controls tanpa mengenakan biaya per legitimate scan |

Kriteria penerimaan v1.3 juga mewajibkan test External Signing, credit concurrency/idempotency, rollover/top-up/expiry, dan public verification no-charge sebelum commercial launch.
