# Product Requirements Document (PRD)

## Surat Digital — Digital Document Management System

**Versi:** 1.3  
**Status:** Baseline v1.3 — credit billing & external signing commercialization  
**Product owner:** Pemilik produk  
**Target pengguna awal:** Satu perusahaan, 3 kantor, 10 divisi, ±100
pengguna

------------------------------------------------------------------------

## 1. Ringkasan produk

Surat Digital adalah aplikasi web responsif yang mendigitalisasi proses
surat-menyurat internal perusahaan. Aplikasi mendukung pembuatan
dokumen, pengajuan, konfirmasi pihak Mengetahui, persetujuan berurutan,
tanda tangan, penerbitan nomor resmi, dan pengarsipan.

Produk menggunakan model berlangganan (subscription) berbasis **Document Credits**, bukan harga per internal user. Fokus komersial awal adalah QR Document Verification dan External Signing. Pemilik produk
mempertahankan kepemilikan produk/source code, sedangkan perusahaan
pelanggan memiliki data dan dokumen yang diunggah atau dihasilkan
melalui sistem.

## 2. Latar belakang dan masalah

Kondisi saat ini:

- Proses surat-menyurat perusahaan masih sepenuhnya manual.

- Dokumen dibuat, diperiksa, ditandatangani, dan disimpan secara fisik.

- Proses membutuhkan kertas, tinta, pencetakan, pemindahan dokumen, dan
  penyimpanan fisik.

- Pelacakan posisi dokumen dan riwayat tindakan pengguna belum terpusat.

- Pencarian dokumen lama berpotensi memerlukan waktu dan pemeriksaan
  arsip manual.

Masalah yang ingin diselesaikan:

1.  Penggunaan kertas dan biaya administrasi yang tidak efisien.

2.  Proses persetujuan yang sulit dipantau.

3.  Risiko dokumen hilang, rusak, atau tidak ditemukan.

4.  Kurangnya audit trail terpusat.

5.  Ketergantungan pada perpindahan dokumen fisik antarpegawai/kantor.

## 3. Visi produk

Menyediakan satu platform administrasi internal yang aman, dapat
ditelusuri, mudah digunakan, dan mengurangi ketergantungan perusahaan
pada dokumen kertas.

## 4. Tujuan produk

### Tujuan bisnis

- Mengurangi pencetakan dokumen internal.

- Mempercepat dan menstandarkan proses persetujuan.

- Meningkatkan keterlacakan dokumen dan aktivitas.

- Mempermudah pencarian serta pengarsipan.

- Menyediakan produk yang dapat dijual dengan model subscription berbasis Document Credits.
- Menjadikan QR Verification dan External Signing sebagai value proposition komersial awal.

### Tujuan pengguna

- Membuat surat atau form dari template, editor, atau upload.

- Menentukan pihak Mengetahui dan approver secara fleksibel.

- Menandatangani dokumen tanpa harus mencetaknya.

- Mengetahui status dan riwayat dokumen.

- Mengakses dokumen sesuai keterlibatan dan hak akses.

## 5. Indikator keberhasilan (success metrics)

Nilai target numerik harus ditentukan setelah baseline proses manual
diukur. Metrik yang disarankan:

| Metrik                   | Cara pengukuran                                               |
|--------------------------|---------------------------------------------------------------|
| Pengurangan kertas       | Jumlah lembar yang digunakan sebelum dan sesudah implementasi |
| Pengurangan waktu proses | Median waktu dari submit sampai issued                        |
| Tingkat adopsi           | Persentase karyawan aktif yang menggunakan sistem             |
| Keberhasilan workflow    | Persentase dokumen yang selesai tanpa intervensi admin        |
| Kualitas data            | Jumlah dokumen dengan metadata/nomor yang salah               |
| Keterlacakan             | Persentase dokumen dengan riwayat tindakan lengkap            |
| Ketersediaan sistem      | Uptime bulanan                                                |
| Kualitas layanan         | Jumlah insiden dan waktu penyelesaiannya                      |

**Rekomendasi:** ukur baseline proses manual selama 2–4 minggu sebelum
pilot agar penghematan dapat dibuktikan.

## 6. Target pengguna dan persona

### 6.1 Creator / Pembuat

- Karyawan yang membuat surat atau form.

- Memilih jenis/subjenis dokumen.

- Menentukan divisi dan kantor penerbit.

- Menentukan pihak Mengetahui dan approver.

- Menandatangani dan mengajukan dokumen dalam satu tindakan atomik `Sign & Submit`.

- Dapat withdraw sebelum persetujuan pertama.

### 6.2 Knowing / Pihak Mengetahui

- Menerima notifikasi saat dokumen diajukan.

- Wajib membaca, mengonfirmasi telah membaca, dan menandatangani.

- Harus menyelesaikan tahap ini sebelum approver pertama aktif.

- Menerima notifikasi kedua setelah dokumen diterbitkan.

- Tidak memiliki hak approval hanya karena ditugaskan sebagai
  Mengetahui.

### 6.3 Approver

- Memeriksa dokumen pada gilirannya.

- Menyetujui sekaligus menandatangani.

- Dapat menolak permanen dengan alasan wajib.

- Memproses approval secara berurutan.

- Tidak dapat menyetujui dokumen yang dibuat sendiri.

### 6.4 Administrator

- Mengelola pengguna, organisasi, Group Policy, master data, dan
  konfigurasi.

- Mengimpor data karyawan.

- Memverifikasi registrasi mandiri.

- Mengelola template/form sesuai permission.

### 6.5 Audit Viewer / Pengelola arsip

- Melihat atau mengekspor Audit Log sesuai permission.

- Melakukan pencarian dan pemeriksaan riwayat.

- Jabatan tidak otomatis memberikan akses ini.

## 7. Ruang lingkup MVP

### Termasuk

1.  Satu perusahaan dengan kantor pusat dan cabang.

2.  Master data 3 kantor dan 10 divisi.

3.  User Management dan import Excel.

4.  Registrasi mandiri dengan status Pending dan aktivasi administrator.

5.  Login Email/Username/NIP dan Password melalui NestJS auth gateway ke Supabase Auth.

6.  Multiple Group Policy dan permission Allow/Deny.

7.  Surat Internal, SK, dan Dokumen Pengajuan.

8.  Template dokumen.

9.  Editor internal dengan fungsi dasar seperti Word.

10. Upload PDF, DOCX, DOC, XLSX, XLS dengan mandatory malware scanning/quarantine sebelum parsing atau konversi.

11. Satu file utama per versi dokumen dan banyak lampiran.

12. Preview/review file satu per satu.

13. Ekstraksi teks dan struktur dasar dari file yang didukung untuk preview, indexing, dan pencarian.

14. OCR fallback untuk PDF scan yang di-upload secara individual.

15. Form Builder.

16. Workflow Mengetahui dan approver.

17. Tanda tangan visual dan internal.

18. Penomoran otomatis.

19. Notifikasi in-app dan email.

20. Document Archive dan pencarian.

21. Audit Log.

22. Responsive web desktop dan HP.

23. QR Document Verification/public verification page sebagai fitur Must.

24. External Signing melalui secure link untuk recipient di luar akun internal.

25. Subscription dan Document Credits: credit ledger, reserve/consume/release, rollover, top-up, trial, dan low-balance handling.

### Tidak termasuk pada MVP

- Surat eksternal sebagai **tipe dokumen bisnis terpisah** (berbeda dari External Signing terhadap dokumen yang dibuat internal).

- Multi-company/holding sebagai fitur operasional.

- Integrasi ERP, HRIS, Microsoft 365, Google Workspace, atau SSO.

- Aplikasi native Android/iOS.

- Delegasi approver.

- Batas waktu dan eskalasi approval.

- Integrasi PSrE tersertifikasi.

- OCR massal/backfill untuk seluruh arsip dokumen lama (OCR individual sebagai fallback saat upload termasuk dalam target MVP).

- Workflow paralel untuk approver.

## 8. Ringkasan kebutuhan fungsional

| ID    | Kebutuhan                                                            |
|-------|----------------------------------------------------------------------|
| PR-01 | Sistem mendukung pembuatan Surat Internal, SK, dan Form              |
| PR-02 | Sistem mendukung template, editor, dan upload                        |
| PR-03 | Sistem mendukung lima format upload yang disepakati                  |
| PR-04 | Sistem mengunci isi dokumen setelah submit                           |
| PR-05 | Creator Sign + Lock + Submit wajib berlangsung sebagai satu transaksi bisnis atomik |
| PR-06 | Knowing wajib membaca, konfirmasi, dan tanda tangan sebelum approval |
| PR-07 | Approver memproses secara berurutan                                  |
| PR-08 | Approver wajib menyetujui dan menandatangani dalam satu tahap        |
| PR-09 | Rejection bersifat permanen dan alasan wajib                         |
| PR-10 | Creator dapat withdraw sebelum approval pertama dan alasan wajib     |
| PR-11 | Setelah semua approver selesai, nomor di-reserve sebelum worker membuat PDF final |
| PR-12 | Setiap penandatangan memilih metode tanda tangannya sendiri          |
| PR-13 | Hak akses diatur melalui Group Policy                                |
| PR-14 | Akses dokumen mempertimbangkan Creator dan participant               |
| PR-15 | Sistem mencatat audit trail                                          |
| PR-16 | Sistem mengirim notifikasi in-app dan email                          |
| PR-17 | Semua signature mengikat `document_manifest_hash` canonical          |
| PR-18 | Permission participant diperiksa kembali ketika tindakan dilakukan    |
| PR-19 | Workflow yang macet karena participant tidak aktif memiliki recovery path terkontrol dan teraudit |
| PR-20 | Job/event kritis menggunakan transactional outbox dan idempotency     |
| PR-21 | QR Verification tersedia untuk dokumen issued dan scan QR tidak mengonsumsi Document Credit |
| PR-22 | External signer dapat review/sign melalui secure purpose-bound link tanpa paid account |
| PR-23 | Billing menggunakan Document Credits; internal user bukan billing metric utama |
| PR-24 | Credit memakai reserve→consume/release yang transactional dan idempotent |
| PR-25 | Ledger credit bersifat append-only dari aplikasi dan setiap debit dapat ditelusuri ke business event |

## 9. Aturan produk yang tidak boleh dilanggar

- Creator tidak boleh ditugaskan sebagai Knowing atau Approver pada
  dokumen yang sama.

- Satu karyawan tidak boleh memegang peran Knowing sekaligus Approver
  pada dokumen yang sama.

- Semua Knowing harus selesai sebelum approver pertama aktif.

- Hanya satu approver yang aktif pada satu waktu.

- Approver berikutnya menunggu approver sebelumnya.

- Creator memilih metode signature pada langkah final; server menghitung manifest, mengunci versi/participant, membuat Creator signature, dan submit dalam satu transaksi bisnis.

- Dokumen yang sudah disubmit tidak dapat diedit.

- Withdraw hanya sebelum persetujuan pertama selesai.

- Rejected dan Cancelled tidak memperoleh nomor surat resmi.

- Nomor resmi tidak boleh dipakai ulang. Nomor yang sudah di-reserve tetapi finalisasi gagal permanen menjadi `VOID` dan tidak dialokasikan ke dokumen lain.

- Signature wajib mengikat canonical Document Manifest yang mencakup versi, canonical PDF, attachment hashes, issuer, dan metadata integritas yang disepakati.

- Participant harus masih aktif dan masih memiliki permission yang diperlukan saat melakukan acknowledgment/approval. Jika tidak, workflow masuk kondisi blocked dan hanya dapat dipulihkan melalui Workflow Recovery yang beraudit.

- File upload wajib lolos malware scanning/quarantine sebelum parser, OCR, atau converter dijalankan.

- View, Download, dan Export adalah permission terpisah.
- External recipient tidak memperoleh akses internal; secure link hanya memberi capability minimum untuk dokumen/action yang dituju.
- Credit hanya dikonsumsi untuk successful business event; QR scan, resend, retry teknis, dan signature gagal tidak boleh dikenai charge tambahan.
- Dokumen dengan N successful external signer mengonsumsi `max(1, N)` credit secara total; QR Verification tidak menambah base debit jika external signing sudah mengonsumsi credit.

## 10. Penomoran surat

Contoh: `025/SK/HRD/CIM/X/2026`

| Bagian | Makna                         |
|--------|-------------------------------|
| 025    | Nomor urut minimal tiga digit |
| SK     | Kode jenis dokumen            |
| HRD    | Kode divisi penerbit          |
| CIM    | Kode kantor penerbit          |
| X      | Bulan Romawi                  |
| 2026   | Tahun penerbitan              |

Counter terpisah berdasarkan kombinasi:
`Jenis Dokumen + Divisi + Kantor + Bulan + Tahun`.

Counter kembali ke 001 pada bulan baru. Zona waktu kantor penerbit menggunakan nama zona IANA pada `offices.timezone` untuk menentukan bulan/tahun.

Setelah approver terakhir selesai, sistem melakukan reserve nomor di transaksi database terlebih dahulu, lalu worker menggunakan reservation tersebut ketika menyusun PDF final. Retry finalisasi selalu menggunakan reservation yang sama.

## 11. Model bisnis dan kepemilikan

- Model penjualan: subscription per perusahaan/workspace berbasis **Document Credits**.
- Tidak ada billing per internal user pada baseline v1.3; kapasitas teknis awal tetap ±100 user sebelum capacity review.
- External signer gratis dan tidak memerlukan paid account.
- QR scan gratis/unlimited secara komersial dengan abuse controls.
- Baseline paket: Lite 100 credit/Rp49.000; Starter 300/Rp129.000; Business 1.000/Rp349.000; Business+ 3.000/Rp899.000; Enterprise 10.000+ custom.
- Subscription credit rollover maksimal 2× monthly allocation; setiap allocation berlaku maksimal dua billing cycle; top-up berlaku 12 bulan; trial 50 credit/30 hari.
- Pemilik produk/source code: pemilik produk.
- Data, file, dan dokumen perusahaan: milik perusahaan pelanggan.
- Detail accounting, top-up, expiry, trial, dan pricing berada di `20_Credit_Billing_and_Pricing.md`.

## 12. Risiko produk

| Risiko                                             | Mitigasi                                                 |
|----------------------------------------------------|----------------------------------------------------------|
| Penyalahgunaan akses dokumen                       | Group Policy, RLS, backend authorization, negative tests |
| Nomor surat ganda                                  | Counter transaksional dan unique constraint              |
| File berubah setelah tanda tangan                  | Atomic Sign+Submit, version lock, canonical manifest hash, private storage |
| Konversi/ekstraksi Office tidak konsisten          | Preview wajib, parser test corpus, dan worker terpisah |
| Pengguna tidak menyelesaikan acknowledgment        | Status pending terlihat; approval diblokir               |
| Participant nonaktif/permission dicabut            | Runtime permission re-check dan audited Workflow Recovery |
| Queue/event hilang setelah commit DB                | Transactional outbox, reconciliation, idempotent worker   |
| File upload berbahaya                              | Mandatory malware scan, quarantine, sandbox/resource limits |
| TTE internal disalahartikan sebagai tersertifikasi | Label yang jelas dan legal review                        |
| Ketergantungan pada layanan pihak ketiga           | Backup, monitoring, prosedur ekspor dan recovery         |
| Credit terpotong ganda karena retry/concurrency | Idempotency key, unique constraint, transactional credit reservation/ledger |
| External signing link diambil pihak lain | High-entropy hashed token, expiry, OTP/purpose binding, rate limit |
| Pricing murah tetapi usage variable tinggi | Credit quota, top-up, unit economics monitoring |

## 13. Kriteria keberhasilan MVP

MVP dapat diterima untuk pilot apabila:

- Seluruh tipe dokumen utama dapat dibuat dan diajukan.

- Mengetahui wajib menyelesaikan acknowledgment sebelum approval.

- Approver berjalan sesuai urutan.

- Creator tidak dapat self-approve.
- Creator Sign + Submit tidak memiliki race window antara signature dan locking.
- Signature verification dapat membuktikan `document_manifest_hash` yang ditandatangani.
- Nomor resmi sudah di-reserve sebelum komposisi PDF final dan retry tidak menghasilkan nomor baru.
- Participant nonaktif dapat ditangani dengan workflow recovery yang tercatat tanpa mengubah signature historis.
- Tidak ada file yang masuk parser/converter sebelum malware scan lolos.
- Job kritis tidak hilang pada skenario database commit berhasil tetapi queue sementara gagal.

- Rejection dan withdraw mengikuti aturan.

- Nomor resmi tidak duplikat pada pengajuan bersamaan.

- File final memuat blok tanda tangan yang benar.

- Pengguna tidak dapat membaca dokumen yang tidak menjadi haknya.

- Audit trail merekam tindakan penting.

- Backup dan pemulihan telah diuji.

- QR verification issued document dapat diverifikasi tanpa debit per scan.
- External signer dapat sign tanpa internal account dan duplicate/retry tidak double-charge.
- Credit ledger dapat direkonsiliasi; reservation release/consume dan rollover/top-up telah diuji.
- UAT disetujui perwakilan HRD, divisi operasional, IT, dan manajemen.
