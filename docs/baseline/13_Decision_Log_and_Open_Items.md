# Decision Log & Open Items

## Surat Digital

**Versi:** 1.3

## 1. Tujuan

Dokumen ini mencatat keputusan yang telah disepakati dan hal yang masih
perlu dikonfirmasi. Keputusan baru harus ditambahkan agar kebutuhan
produk tidak berubah tanpa jejak.

## 2. Keputusan yang telah disepakati

| ID    | Area                 | Keputusan                                                     |
|-------|----------------------|---------------------------------------------------------------|
| D-001 | Scope                | Surat Internal, SK, Dokumen Pengajuan                         |
| D-002 | Organisasi           | Satu perusahaan, 3 kantor, 10 divisi                          |
| D-003 | Struktur             | Satu divisi dapat berada di beberapa kantor                   |
| D-004 | User import          | Administrator dapat import Excel                              |
| D-005 | Registration         | Registrasi mandiri tersedia                                   |
| D-006 | Login                | Email/Username/NIP dan Password                               |
| D-007 | Subtypes             | Jenis dokumen sudah memiliki subjenis                         |
| D-008 | Numbering            | Semua kategori dokumen memperoleh nomor resmi                 |
| D-009 | Template manager     | Administrator dan pengguna yang diberi policy                 |
| D-010 | Form Builder         | Diperlukan                                                    |
| D-011 | Editor               | Editor internal fungsi dasar seperti Word                     |
| D-012 | Upload               | PDF, DOCX, DOC, XLSX, XLS                                     |
| D-013 | Upload review        | Satu per satu dengan review                                   |
| D-014 | Creator signature    | Creator Sign + Lock + Submit atomik; tidak ada signed-but-editable Draft |
| D-015 | Role overlap         | Creator tidak boleh menjadi Knowing/Approver                  |
| D-016 | Knowing              | Wajib membaca, konfirmasi, dan tanda tangan                   |
| D-017 | Knowing timing       | Knowing selesai sebelum approver pertama aktif                |
| D-018 | Knowing display      | Signature Knowing ditampilkan pada PDF final                  |
| D-019 | Knowing vs Approver  | Harus berbeda orang                                           |
| D-020 | Knowing notification | Notifikasi awal dan setelah dokumen terbit                    |
| D-021 | Approval             | Approve dan sign dalam satu tahap                             |
| D-022 | Approval sequence    | Berurutan                                                     |
| D-023 | Delegation           | Tidak ada delegasi                                            |
| D-024 | Deadline             | Tidak ada batas waktu global                                  |
| D-025 | Rejection            | Permanen, alasan wajib                                        |
| D-026 | Withdraw             | Creator boleh withdraw sebelum approval pertama, alasan wajib |
| D-027 | Withdraw status      | Cancelled, ID Tracking dan audit tetap ada                    |
| D-028 | Numbering option     | Nomor di-reserve setelah semua approval selesai dan sebelum final PDF dibuat |
| D-029 | Numbering format     | `025/SK/HRD/CIM/X/2026`                                       |
| D-030 | Counter              | Terpisah per jenis/divisi/kantor/bulan/tahun                  |
| D-031 | Counter reset        | Kembali 001 setiap bulan                                      |
| D-032 | Issuer               | Creator memilih divisi dan kantor penerbit                    |
| D-033 | Group Policy         | Multiple group membership                                     |
| D-034 | Permission           | Allow/Deny; Deny menang                                       |
| D-035 | Self-approval        | Prevent                                                       |
| D-036 | Download/export      | Terpisah dari view                                            |
| D-037 | Document access      | Berdasarkan Creator, participant, atau ViewAll                |
| D-038 | Creator visibility   | Creator selalu dapat melihat dokumennya sendiri               |
| D-039 | Signature methods    | Visual dan internal                                           |
| D-040 | Signature selection  | Individual; setiap signer memilih sendiri                     |
| D-041 | Visual profile       | Tidak perlu reusable visual signature profile                 |
| D-042 | Internal signature   | Registrasi melalui profil dan PIN khusus                      |
| D-043 | PSrE                 | Belum menjadi kebutuhan saat ini                              |
| D-044 | Notifications        | In-app dan email                                              |
| D-045 | Audit                | User, action, IP, lokasi perkiraan, device, dan detail lain   |
| D-046 | Platform             | Web responsive desktop dan HP                                 |
| D-047 | Frontend             | React di cPanel perusahaan                                    |
| D-048 | Backend              | NestJS di Vercel                                              |
| D-049 | Database             | Supabase PostgreSQL                                           |
| D-050 | Storage              | Vercel Blob                                                   |
| D-051 | User scale           | ±100 pengguna                                                 |
| D-052 | Business model       | Subscription                                                  |
| D-053 | Product ownership    | Pemilik produk memiliki produk/source code                    |
| D-054 | Support              | Maintenance dan support disediakan                            |
| D-055 | Database platform    | Supabase PostgreSQL                                            |
| D-056 | ORM                  | Prisma ORM; NestJS memakai Prisma Client sebagai akses DB utama |
| D-057 | Schema/migration     | `schema.prisma` + Prisma Migrate                               |
| D-058 | Seed                 | Prisma Seed                                                    |
| D-059 | Package manager      | npm; gunakan `package-lock.json`                               |
| D-060 | File processing      | Worker/container terpisah dari NestJS API                      |
| D-061 | File extraction      | Parser per format; PDF scan memakai OCR fallback              |
| D-062 | Office rendering     | LibreOffice headless sebagai kandidat utama konversi PDF       |
| D-063 | Extraction storage   | Metadata job dan hasil ekstraksi disimpan di PostgreSQL        |
| D-064 | RLS + Prisma         | RLS tidak otomatis diterapkan Prisma; role/context harus diuji |
| D-065 | Auth boundary        | Browser menggunakan NestJS auth gateway/BFF; Supabase Auth tidak dipanggil langsung frontend |
| D-066 | Signature integrity  | Semua signature mengikat canonical `document_manifest_hash` |
| D-067 | Queue reliability    | Transactional outbox + idempotent consumers wajib untuk event/job kritis |
| D-068 | Workflow recovery    | Participant blocked dapat diganti via `Workflow.Repair` dengan reason/audit; historical signature tidak diubah |
| D-069 | Permission runtime   | Status aktif dan permission participant diperiksa kembali saat action |
| D-070 | Malware scanning     | Wajib dan fail-closed sebelum parser/OCR/converter |
| D-071 | API contract         | OpenAPI adalah source of truth; frontend client/types digenerate |
| D-072 | PIN verification     | Tidak ada reusable generic PIN boolean oracle |
| D-073 | Audit terminology    | Audit baseline application-immutable; tamper-evident cryptographic logging bukan klaim MVP |
| D-074 | Accessibility       | Flow inti menargetkan WCAG 2.2 AA |
| D-075 | Commercial focus | Fitur komersial awal: QR Document Verification + External Signing |
| D-076 | Billing metric | Document Credits per company/workspace; bukan per internal user |
| D-077 | Internal users | Tidak dimeter untuk harga; baseline capacity teknis tetap ±100 sebelum review |
| D-078 | External recipients | Gratis dan tidak membutuhkan paid account |
| D-079 | QR scan | 0 credit/unlimited secara komersial; abuse controls tetap berlaku |
| D-080 | Credit formula | Total per document = `max(1, completed_external_signers)` |
| D-081 | Credit lifecycle | `RESERVE → CONSUME` atau `RESERVE → RELEASE`; successful business event only |
| D-082 | Credit accounting | Append-only application ledger + lots + reservations + reconciliation |
| D-083 | Rollover | Subscription credit allocation berlaku maksimal 2 billing cycle dan saldo subscription maksimum 2× monthly allocation |
| D-084 | Top-up | Credit top-up berlaku 12 bulan |
| D-085 | Trial | 50 credit atau 30 hari, mana yang lebih dahulu |
| D-086 | Negative balance | Tidak diizinkan pada baseline v1.3; top-up/upgrade digunakan |
| D-087 | Launch pricing | Lite 100/Rp49k, Starter 300/Rp129k, Business 1000/Rp349k, Business+ 3000/Rp899k, Enterprise custom; subject to validation |
| D-088 | Subscription expiry | Tidak otomatis membuat dokumen issued menjadi invalid pada public verification |

## 3. Keputusan ERD terbaru

| ID     | Area                    | Keputusan                    |
|--------|-------------------------|------------------------------|
| DB-001 | Creator sebagai Knowing | Deny                         |
| DB-002 | File utama              | Tepat satu per versi dokumen |
| DB-003 | Attachment              | Banyak diperbolehkan         |
| DB-004 | Tracking ID             | UUID dokumen                 |

## 4. Asumsi desain yang digunakan

Asumsi berikut digunakan agar rancangan dapat dilanjutkan. Validasi
akhir tetap diperlukan.

| ID    | Asumsi                                                                                                           | Dampak                                                             |
|-------|------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| A-001 | Beberapa Knowing dapat menyelesaikan tugas secara paralel satu sama lain                                         | Semua harus selesai sebelum Approver pertama                       |
| A-002 | Knowing yang belum menyelesaikan tugas membuat approval tetap tertahan                                           | Tidak ada auto-complete                                            |
| A-003 | Creator masih dapat withdraw setelah Knowing selesai selama approval pertama belum selesai                       | Perlu state validation                                             |
| A-004 | Jika tidak ada Knowing, approval dapat langsung dimulai                                                          | State langsung ke Pending Approval                                 |
| A-005 | Semua tanda tangan mengacu pada canonical Document Manifest versi terkunci                                      | `document_manifest_hash` deterministic                             |
| A-006 | Nomor di-reserve setelah semua approver selesai, sebelum final PDF, dan dipakai ulang hanya untuk retry dokumen yang sama | Menghindari PDF tanpa nomor dan nomor baru saat retry               |
| A-007 | Nomor resmi yang telah di-issue tidak pernah digunakan ulang                                                     | Menjaga audit                                                      |
| A-008 | Internal signature bukan PSrE-certified signature                                                                | Perlu legal review sebelum digunakan untuk dokumen berisiko tinggi |

## 5. Open items — wajib diselesaikan sebelum production

Keputusan yang sudah ditutup pada v1.2 tidak lagi menjadi open item. Khusus malware scanning, kebutuhan **wajib** sudah diputuskan; yang terbuka hanya pilihan provider/operasionalnya.

| ID | Pertanyaan | Priority | Owner | Status | Decision deadline / blocker |
|---|---|---|---|---|---|
| O-001 | Daftar kode jenis dan subjenis dokumen | P1 | Pemilik proses/Admin | Open | Sebelum P25 numbering |
| O-002 | Apakah kode subjenis masuk nomor resmi? | P1 | Product/Management | Open | Sebelum P25 |
| O-003 | Batas ukuran satu file dan total attachment | P0 | IT/Product | POC | Sebelum P09/P10 |
| O-004 | Maksimum attachment per dokumen | P1 | Product/IT | Open | Sebelum P16 |
| O-005 | Excel: seluruh sheet atau print area/sheet terpilih | P1 | Pemilik proses | POC | Sebelum P33 |
| O-006 | Batas halaman PDF dan sheet workbook | P0 | IT/Product | POC | Sebelum P10 |
| O-007 | Provider email transaksional | P2 | IT/Product | Open | Sebelum P30 |
| O-008 | Hosting final worker/container | P0 | DevOps | POC | Sebelum P10 |
| O-009 | Redis/BullMQ managed provider final | P0 | DevOps | POC | Sebelum P11 |
| O-010 | Detail retensi log teknis dan extraction text | P1 | Security/Legal | Open | Sebelum UAT |
| O-011 | Kebijakan legal penggunaan TTE internal per jenis dokumen | P0 | Legal/Management | Open | Sebelum pilot |
| O-012 | Proses reset PIN dan identity verification | P1 | IT/Legal | Open | Sebelum P23 |
| O-013 | Apakah public verification page menampilkan field apa saja | P1 | Product/Security | Open | Sebelum P28 |
| O-014 | Detail scope ViewAll/ExportAll per organisasi | P1 | Product/Security | Open | Sebelum P31 |
| O-015 | Final runtime DB role dan tx-local RLS implementation | P0 | Backend/DBA/Security | POC | P07 blocker |
| O-016 | Versi Prisma/driver adapter yang dipin | P0 | Backend | Open | Sebelum P02 selesai |
| O-017 | Versi parser/LibreOffice/OCR yang dipin | P1 | Worker/DevOps | POC | Sebelum P33 |
| O-018 | Malware scanner: ClamAV atau managed service | P0 | IT/Security | POC | Sebelum P10 selesai |
| O-019 | Batas timeout/retry/dead-letter per job type | P1 | Backend/Worker | Open | Sebelum P11/P26 |
| O-020 | SLA kontraktual final di atas baseline engineering | P2 | Management/Product | Open | Sebelum kontrak production |
| O-021 | Payment provider/metode konfirmasi pembayaran final | P1 | Product/Finance/Backend | Open | Sebelum P59 |
| O-022 | Channel External Signing awal: email saja atau email+WhatsApp/SMS | P1 | Product | Open | Sebelum P49 |
| O-023 | OTP provider dan kapan challenge wajib digunakan | P0 | Security/Product | POC | Sebelum P50 |
| O-024 | Refund policy top-up dan credit saat terminasi | P1 | Product/Legal | Open | Sebelum commercial launch |
| O-025 | Pajak, invoice, dan Terms of Service pricing | P0 | Finance/Legal | Open | Sebelum commercial launch |
| O-026 | Fair-use storage dan large-volume processing limit | P1 | Product/DevOps | Open | Sebelum commercial launch |
| O-027 | Annual pricing/discount | P2 | Product/Finance | Deferred | Setelah pilot unit economics |
| O-028 | Enterprise post-paid/overage | P2 | Product/Finance | Deferred | Post-v1.3 |

Status yang digunakan: `Open`, `POC`, `Decided`, `Deferred`, `Closed`. Setiap item yang berubah menjadi `Decided/Closed` wajib menunjuk Decision/ADR dan update RTM bila memengaruhi requirement.

## 6. Change control

Setiap perubahan keputusan:

1.  Catat masalah dan alasan.

2.  Identifikasi dokumen/fitur terdampak.

3.  Nilai dampak database, API, UI, security, dan data lama.

4.  Minta persetujuan pemilik produk.

5.  Tambahkan decision log.

6.  Buat migration/API version jika diperlukan.

7.  Tambahkan regression test.

## 7. Riwayat versi

| Versi | Status         | Catatan                                        |
|-------|----------------|------------------------------------------------|
| 1.0   | Draft baseline | Hasil diskusi kebutuhan awal dan keputusan ERD |
| 1.1   | Revisi spesifikasi | Supabase + Prisma, npm, RLS/transaction context, document processing, OCR, dan worker |
| 1.2   | Architecture & Integrity Hardening | Auth gateway, manifest, atomic submit, outbox, numbering/finalization order, workflow recovery, malware mandatory, OpenAPI, NFR/RTM |
| 1.3   | Credit Billing & External Signing | Document Credits, pricing baseline, credit ledger/reservation, QR Verification Must, External Signing, rollover/top-up/trial |
