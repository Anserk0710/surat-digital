# Glossary

## Surat Digital

**Versi:** 1.3

| Istilah              | Definisi                                                                          |
|----------------------|-----------------------------------------------------------------------------------|
| Acknowledgment       | Konfirmasi bahwa pihak Mengetahui telah membaca dan mengetahui dokumen            |
| API                  | Application Programming Interface                                                 |
| Approver             | Pengguna yang memeriksa, menyetujui, dan menandatangani dokumen                   |
| Audit Log            | Catatan aktivitas sistem dan pengguna yang dapat ditelusuri                       |
| Blob Storage         | Penyimpanan file di luar database                                                 |
| Canonical PDF        | Representasi PDF yang menjadi dasar review dan tanda tangan                       |
| Creator              | Pengguna yang membuat dan mengajukan dokumen                                      |
| DDMS                 | Digital Document Management System                                                |
| Prisma ORM           | ORM yang digunakan NestJS untuk mengakses Supabase PostgreSQL                     |
| Prisma Client        | Client hasil generate Prisma untuk query dan transaksi database                   |
| Prisma Migrate       | Sistem versioned migration database dari Prisma                                   |
| Prisma Seed          | Mekanisme seed data awal melalui Prisma                                            |
| Document Processing | Pipeline validasi, ekstraksi, OCR, konversi, dan preview file                      |
| OCR                  | Optical Character Recognition untuk mengenali teks pada gambar/scan                |
| PDF digital          | PDF yang memiliki text layer yang dapat diekstrak langsung                         |
| PDF scan             | PDF yang halaman utamanya berupa gambar dan memerlukan OCR                         |
| Worker               | Proses background terpisah untuk tugas berat seperti parsing, OCR, dan konversi    |
| Queue                | Sistem antrean job asynchronous untuk worker                                      |
| Idempotency key      | Kunci yang mencegah satu job/tindakan menghasilkan efek ganda                      |
| Document Version     | Versi tertentu dari isi dokumen                                                   |
| Employee             | Data karyawan yang terhubung dengan akun autentikasi                              |
| Explicit Deny        | Penolakan permission yang mengalahkan Allow                                       |
| Form Builder         | Fitur untuk membuat form dinamis                                                  |
| Group Policy         | Kumpulan permission yang dapat diberikan kepada pengguna                          |
| IDOR                 | Insecure Direct Object Reference, akses objek tanpa otorisasi                     |
| Internal E-Signature | Tanda tangan elektronik internal dengan autentikasi dan bukti integritas          |
| Knowing              | Pihak yang wajib membaca, konfirmasi, dan menandatangani sebagai bukti mengetahui |
| NIP                  | Nomor Induk Pegawai                                                               |
| Object Storage       | Penyimpanan file seperti Vercel Blob                                              |
| Official Number      | Nomor surat resmi setelah seluruh approval selesai                                |
| PDF Final            | PDF final yang memuat blok tanda tangan seluruh pihak                             |
| Permission           | Hak untuk melakukan tindakan tertentu                                             |
| PRD                  | Product Requirements Document                                                     |
| RLS                  | Row Level Security di PostgreSQL                                                  |
| SRS                  | Software Requirements Specification                                               |
| Supabase Auth        | Layanan autentikasi yang digunakan aplikasi                                       |
| TTE                  | Tanda Tangan Elektronik                                                           |
| Tracking ID          | UUID dokumen yang dibuat saat submit                                              |
| UAT                  | User Acceptance Testing                                                           |
| UUID                 | Universally Unique Identifier                                                     |
| Vercel Blob          | Layanan object storage untuk file                                                 |
| Withdraw             | Penarikan dokumen oleh Creator sebelum approval pertama                           |
| Workflow             | Urutan proses dan tindakan pada dokumen                                           |

| Auth Gateway/BFF      | NestJS sebagai boundary login/session browser ke Supabase Auth                        |
| Canonical Document Manifest | Representasi deterministic metadata integritas dokumen, canonical PDF, attachment hash, issuer, dan versi schema |
| Document Manifest Hash | SHA-256 dari canonical serialization Document Manifest yang diikat oleh signature      |
| Transactional Outbox   | Tabel event yang ditulis bersama state bisnis agar dispatch eksternal dapat diretry setelah commit |
| Workflow Recovery      | Tindakan berizin untuk mengganti participant BLOCKED tanpa mengubah history/signature lama |
| Application-immutable Audit | Audit yang tidak dapat update/delete melalui aplikasi; tidak otomatis berarti tamper-evident terhadap DBA |
| VOID Number            | Reservation nomor yang batal permanen setelah finalization failure dan tidak boleh digunakan ulang |

## Istilah status

| Status                 | Makna                        |
|------------------------|------------------------------|
| DRAFT                  | Dokumen masih dibuat         |
| PENDING_ACKNOWLEDGMENT | Menunggu Knowing             |
| PENDING_APPROVAL       | Menunggu approver pertama    |
| IN_PROGRESS            | Approval berlangsung         |
| FINALIZING             | Nomor dan PDF final diproses |
| REJECTED               | Ditolak permanen             |
| CANCELLED              | Dibatalkan oleh Creator      |
| ISSUED                 | Dokumen resmi diterbitkan    |
| ARCHIVED               | Dokumen masuk arsip          |

## Perbedaan signature

| Jenis                    | Makna                                                                             |
|--------------------------|-----------------------------------------------------------------------------------|
| Creator Signature        | Tanda tangan pembuat saat pengajuan                                               |
| Acknowledgment Signature | Tanda tangan pihak Mengetahui                                                     |
| Approval Signature       | Tanda tangan approver sebagai bukti persetujuan                                   |
| Visual Signature         | Tanda tangan berupa gambar yang dibuat saat tindakan                              |
| Internal E-Signature     | Tanda tangan internal dengan profil terdaftar dan PIN                             |
| PSrE-certified signature | Tanda tangan tersertifikasi oleh penyelenggara sertifikasi elektronik yang sesuai |

## Istilah tambahan v1.3

| Istilah | Definisi |
|---|---|
| Document Credit | Unit komersial untuk satu dokumen terverifikasi atau successful External Signing Action sesuai formula billing |
| Credit Lot | Kelompok credit dari satu source/allocation dengan remaining amount dan expiry tertentu |
| Credit Ledger | Journal aplikasi append-only untuk seluruh mutasi credit |
| Credit Reservation | Credit yang sementara dikunci untuk business action sebelum menjadi consumed atau released |
| Available Credit | Credit yang masih dapat di-reserve setelah memperhitungkan reservation aktif dan expiry |
| External Signer | Pihak di luar akun internal yang menerima purpose-bound secure link untuk review/sign |
| External Signing Action | Satu external signer berhasil menyelesaikan signature pada satu document version |
| Verification Token | Token publik purpose-bound untuk memeriksa metadata/status dokumen tanpa mengekspos file privat |
| Rollover Cap | Batas maksimum saldo subscription credit yang dapat dibawa ke periode berikutnya |
| Top-up | Pembelian credit tambahan di luar monthly allocation |
| Trial Credit | Credit promotional dengan expiry/scope trial |
