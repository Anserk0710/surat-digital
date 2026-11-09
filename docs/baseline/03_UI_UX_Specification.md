# UI & UX Specification

## Surat Digital

**Versi:** 1.3 — Design baseline

## 1. Prinsip desain

1.  **Task-oriented:** pengguna langsung melihat tindakan yang harus
    diselesaikan.

2.  **Clear status:** status dokumen, posisi approval, dan pihak yang
    menunggu harus terlihat.

3.  **Secure by design:** hanya tampilkan dokumen yang boleh diakses
    pengguna.

4.  **Minimal friction:** proses pembuatan dan review file dibuat
    bertahap.

5.  **Responsive:** fungsi utama dapat digunakan dari desktop dan HP.

6.  **Consistent:** pola tombol, status, tabel, form, dan notifikasi
    konsisten.

7.  **Accessible:** label jelas, error mudah dipahami, kontras memadai,
    dan navigasi keyboard.

## 2. Struktur navigasi

Menu dapat berubah sesuai permission pengguna.

### Menu pengguna biasa

- Dashboard

- Buat Dokumen

- Dokumen Saya

- Tugas Saya

  - Mengetahui
  - Persetujuan

- Riwayat Dokumen

- Notifikasi

- Profil Saya

### Menu pengguna dengan permission tambahan

- Arsip Dokumen

- Template

- Form Builder

- User Management

- Organization Management

- Group Policy

- Numbering Configuration

- Audit Log

- System Settings

Menu tidak boleh menjadi satu-satunya kontrol keamanan. Backend tetap
harus memvalidasi setiap request.

## 3. Dashboard

### Komponen utama

- Greeting dan profil singkat.

- Ringkasan tugas Mengetahui yang menunggu.

- Ringkasan approval yang menunggu.

- Dokumen yang dibuat pengguna.

- Status dokumen terakhir.

- Notifikasi terbaru.

- Quick action: Buat Dokumen.

### Kartu ringkasan

- Menunggu Konfirmasi Mengetahui.

- Menunggu Persetujuan.

- Dokumen Saya dalam Proses.

- Dokumen Terbit.

- Dokumen Ditolak/Dibatalkan (hanya dokumen yang boleh dilihat).

### UX

- Klik kartu membawa pengguna ke daftar yang sudah difilter.

- Badge menunjukkan jumlah tugas yang belum selesai.

- Jangan tampilkan jumlah atau judul dokumen rahasia yang tidak boleh
  diakses.

## 4. Flow pembuatan dokumen

Gunakan wizard bertahap:

### Step 1 — Informasi dokumen

Field:

- Jenis dokumen.

- Subjenis.

- Judul.

- Deskripsi (opsional).

- Divisi penerbit.

- Kantor penerbit.

### Step 2 — Isi dokumen

Pilihan:

- Gunakan template.

- Editor internal.

- Upload dokumen.

Editor internal menyediakan fungsi dasar:

- Font dan ukuran.

- Bold, italic, underline.

- Alignment.

- List.

- Tabel.

- Gambar.

- Header/footer.

- Margin dan ukuran halaman.

- Page numbering.

### Step 3 — File utama dan lampiran

- Satu file utama.

- Banyak lampiran.

- Format: PDF, DOCX, DOC, XLSX, XLS.

- Upload satu file per tindakan.

- Setelah upload, tampilkan metadata dan status pemrosesan asynchronous.
- Preview ditampilkan setelah processing selesai.
- Tampilkan hasil ekstraksi teks/worksheet secara ringkas bila relevan.

- Pengguna harus melakukan review/konfirmasi file sebelum upload
  berikutnya.

- Tampilkan status: Uploaded, Validating, Queued, Processing, Preview Ready, Pending Review, Reviewed/Accepted, Rejected, Failed.
- Jika PDF scan, tampilkan indikator OCR dan peringatan bahwa hasil pengenalan teks dapat keliru.

- Untuk Excel, tampilkan preview hasil konversi dan pengaturan sheet/print area sebelum submit.
- Tampilkan pesan jika area cetak, halaman, font, atau layout hasil konversi berbeda dari file sumber.

### Step 4 — Workflow

Bagian Mengetahui:

- Cari dan pilih karyawan.

- Tampilkan nama, NIP, jabatan, divisi, kantor.

- Validasi bahwa Creator tidak dipilih.

- Validasi bahwa orang yang sama tidak menjadi Approver.

Bagian Approver:

- Cari dan pilih karyawan.

- Atur urutan dengan drag-and-drop atau tombol naik/turun.

- Validasi permission Approval.Execute.

- Creator tidak boleh dipilih.

- Orang yang menjadi Knowing tidak boleh dipilih sebagai Approver.

### Step 5 — Review final

Tampilkan:

- Preview dokumen utama.

- Daftar lampiran.

- Daftar Mengetahui.

- Urutan Approver.

- Divisi/kantor penerbit.

- Konfirmasi bahwa dokumen akan dikunci setelah submit.

- Informasi bahwa tindakan final adalah **Sign & Submit**: sistem menghitung manifest, mengunci versi/participant, membuat signature, dan submit secara atomik.

### Step 6 — Atomic Sign & Submit

- Creator memilih Visual atau Internal.

- Jika Internal, profil harus aktif dan PIN diverifikasi.

- Tombol utama adalah **Sign & Submit**; tidak ada keadaan persisten “sudah sign tetapi masih Draft”.

- Saat diklik, UI menampilkan progress tunggal dan mencegah double-submit dengan idempotency key.

- Server membuat UUID sebagai ID Tracking bila belum tersedia, menghitung `document_manifest_hash`, mengunci versi/participant, membuat Creator signature, lalu melakukan state transition dalam satu transaksi bisnis.

- Dokumen berubah ke Pending Acknowledgment atau Pending Approval jika
  tidak ada Knowing.

## 5. Halaman Tugas Mengetahui

Tampilkan:

- ID Tracking.

- Judul dokumen.

- Creator.

- Tanggal pengajuan.

- Preview dokumen.

- Daftar file dan lampiran.

- Tombol “Konfirmasi Telah Membaca”.

- Pilihan tanda tangan Visual/Internal.

- Ringkasan konsekuensi: konfirmasi ini menyatakan dokumen telah
  dibaca/diketahui, bukan persetujuan substansi.

Aturan:

- Knowing harus membaca dokumen sebelum tombol konfirmasi aktif.

- Konfirmasi dan tanda tangan diselesaikan dalam satu tindakan bisnis.

- Semua Knowing harus selesai sebelum Approver pertama aktif.

- Jika dokumen ditarik sebelum approval pertama, tugas Knowing
  dibatalkan.

## 6. Halaman Tugas Approver

Tampilkan:

- Dokumen yang sedang aktif untuk approver.

- Urutan approval.

- Riwayat approver sebelumnya.

- Status semua Knowing.

- Preview dokumen terkunci.

- Tombol “Setujui & Tanda Tangani”.

- Tombol “Tolak Permanen”.

Saat approve:

1.  Approver memilih metode tanda tangan.

2.  Internal signature meminta PIN.

3.  Sistem menyimpan signature evidence.

4.  Participant menjadi Approved.

5.  Sistem mengaktifkan approver berikutnya atau proses finalisasi.

Saat reject:

- Alasan wajib.

- Tampilkan konfirmasi permanen.

- Setelah dikonfirmasi, dokumen menjadi Rejected dan workflow berhenti.

Approver berikutnya tidak dapat menjalankan tindakan sebelum statusnya
Active.

## 7. Halaman Profil

Bagian:

- Informasi pribadi.

- Employee ID/NIP.

- Email dan username.

- Jabatan/divisi/kantor.

- Status akun.

- Status registrasi tanda tangan internal.

- Registrasi/aktivasi TTE internal.

- Ubah PIN tanda tangan (dengan verifikasi).

- Riwayat perangkat/sesi (jika disediakan).

Tanda tangan visual tidak disimpan sebagai reusable signature profile.
Pengguna membuat tanda tangan visual pada saat penandatanganan.

## 8. Registrasi TTE internal

Flow:

1.  Lengkapi data profil yang diwajibkan.

2.  Baca dan setujui ketentuan penggunaan.

3.  Buat PIN khusus tanda tangan.

4.  Sistem menyimpan hash PIN.

5.  Status registrasi menjadi Active setelah seluruh validasi berhasil.

6.  Batasi percobaan PIN dan gunakan cooldown/lockout.

7.  Sediakan proses reset/revoke yang tercatat di Audit Log.

Jangan menampilkan atau mengirim PIN dalam bentuk plaintext setelah
proses pembuatan.

## 9. Halaman Dokumen Saya dan Arsip

Kolom tabel:

- ID Tracking.

- Nomor resmi (jika sudah terbit).

- Judul.

- Jenis/subjenis.

- Divisi dan kantor penerbit.

- Tanggal dibuat.

- Status.

- Aksi yang diizinkan.

Filter:

- Status.

- Jenis/subjenis.

- Rentang tanggal.

- Divisi/kantor (jika diizinkan).

- Creator.

- Nomor/ID.

Pencarian:

- UUID Tracking.

- Nomor resmi.

- Judul.

- Isi dokumen yang teksnya dapat diekstrak.

## 9A. Workflow blocked dan recovery

Jika participant menjadi nonaktif atau kehilangan permission saat task belum selesai:

- Task ditampilkan sebagai `BLOCKED`; sistem tidak boleh otomatis melewati participant.
- Creator dan administrator berizin melihat alasan blocked yang aman.
- Hanya pengguna dengan permission `Workflow.Repair` yang melihat aksi **Ganti Participant**.
- Recovery wajib memilih replacement yang valid dan mengisi alasan.
- UI menampilkan bahwa signature/action historis tidak diubah atau dihapus.
- Semua recovery menghasilkan audit event dan timeline entry.

## 10. Status dan visual treatment

| Status                 | Label UI             | Deskripsi                                 |
|------------------------|----------------------|-------------------------------------------|
| DRAFT                  | Draft                | Belum diajukan                            |
| PENDING_ACKNOWLEDGMENT | Menunggu Mengetahui  | Menunggu seluruh Knowing                  |
| PENDING_APPROVAL       | Menunggu Persetujuan | Menunggu approver pertama aktif           |
| IN_PROGRESS            | Dalam Proses         | Approval berurutan berlangsung            |
| FINALIZING             | Finalisasi           | Nomor sudah di-reserve; PDF final sedang disiapkan |
| REJECTED               | Ditolak Permanen     | Proses berhenti                           |
| CANCELLED              | Dibatalkan           | Creator withdraw sebelum approval pertama |
| ISSUED                 | Terbit               | Nomor resmi dan PDF final tersedia        |
| ARCHIVED               | Diarsipkan           | Dokumen masuk arsip                       |

Jangan hanya mengandalkan warna. Setiap status harus memiliki teks dan
ikon.

## 11. Responsive behavior

### Desktop

- Sidebar permanen.

- Tabel dengan filter di bagian atas.

- Preview dokumen berdampingan dengan panel tindakan.

- Workflow timeline horizontal jika ruang cukup.

### Tablet

- Sidebar dapat diciutkan.

- Preview dan panel tindakan dapat ditumpuk.

### Mobile

- Navigasi drawer atau bottom navigation untuk menu utama.

- Tabel berubah menjadi list/card.

- Tombol tindakan utama mudah dijangkau.

- Preview PDF menggunakan area penuh.

- Dialog konfirmasi tidak boleh terpotong.

- Upload file menggunakan file picker perangkat.

## 12. Komponen UI reusable

- `AppShell`

- `SidebarNavigation`

- `MobileNavigation`

- `PageHeader`

- `StatusBadge`

- `DocumentTable`

- `DocumentCard`

- `DocumentPreview`

- `FileUploadReview`

- `ParticipantSelector`

- `ApproverSequenceEditor`

- `WorkflowTimeline`

- `SignatureMethodSelector`

- `InternalPinDialog`

- `RejectReasonDialog`

- `WithdrawReasonDialog`

- `NotificationBell`

- `PermissionGuard`

- `EmptyState`

- `ErrorState`

- `ConfirmDialog`

## 13. UX error dan empty state

Pesan harus spesifik:

- “Anda belum memiliki izin untuk melakukan tindakan ini.”

- “Dokumen sedang menunggu pihak Mengetahui.”

- “Dokumen telah dikunci setelah pengajuan.”

- “Anda bukan approver aktif untuk dokumen ini.”

- “PIN tanda tangan tidak valid.”

- “File gagal diproses. Periksa format/isi file atau coba ulang.”
- “Dokumen berupa hasil scan; teks dibaca menggunakan OCR dan perlu diperiksa kembali.”
- “Preview belum tersedia. Dokumen belum dapat dikonfirmasi.”
- “File sedang dipindai untuk malware dan belum dapat diproses.”
- “File ditolak oleh pemeriksaan keamanan dan tidak dapat diproses.”
- “Participant ini tidak lagi aktif atau tidak memiliki permission yang dibutuhkan. Workflow memerlukan recovery oleh administrator berizin.”

- “Nomor resmi sedang diproses. Jangan membuat pengajuan baru untuk
  dokumen yang sama.”

Jangan membocorkan apakah dokumen tertentu ada ketika pengguna tidak
memiliki hak akses.


## 14. Security dan accessibility UX baseline v1.3

- Nama file, judul, extracted text, label form, dan konten editor diperlakukan sebagai untrusted input dan harus di-escape/sanitize pada render.
- Preview untrusted file menggunakan policy CSP/sandbox yang disetujui; jangan mengandalkan URL yang sulit ditebak sebagai kontrol akses.
- UI tidak menampilkan raw stack trace, internal storage path, token, PIN, atau detail malware engine.
- Flow inti menargetkan WCAG 2.2 AA: keyboard navigation, visible focus, semantic labels, error association, contrast, dan status async yang diumumkan dengan tepat.
- State `PROCESSING`, `BLOCKED`, `FINALIZING`, dan `RETRYING` harus memiliki status text, bukan hanya warna/spinner.

## 15. External Signing & Public Verification UX — v1.3

### 15.1 Internal — Send for External Signing

Internal user berizin melihat action **Kirim untuk Tanda Tangan Eksternal** pada versi dokumen yang eligible. Form minimal:

- nama recipient;
- email/nomor tujuan sesuai channel yang tersedia;
- optional identity hint yang aman;
- expiry date;
- urutan signer bila sequential external signing diaktifkan;
- ringkasan Document Credit yang akan di-reserve.

Sebelum confirm, UI menampilkan misalnya: `2 external signer → 2 Document Credits akan di-reserve`. Jangan menyatakan credit sudah consumed sebelum signature berhasil.

### 15.2 Public External Sign page

Flow mobile-first:

```text
Secure link → verify/challenge → document review → consent → sign → success receipt
```

Halaman tidak menampilkan menu internal, employee directory, archive, credit balance, atau metadata lain di luar capability invitation. Token tidak boleh ditampilkan kembali di analytics/logging UI.

Jika invitation expired/revoked/already completed, tampilkan generic state yang tidak membocorkan informasi internal berlebih.

### 15.3 Public Verification page

QR membuka verification page dengan allowlisted metadata seperti status valid/revoked, nomor, issuer, tanggal issue, dan fingerprint pendek. File privat tidak otomatis dapat di-download.

Scan QR tidak pernah menampilkan counter biaya atau credit dan tidak mengurangi saldo customer.

## 16. Credit & Subscription UX — v1.3

### 16.1 Credit badge

Header/admin dashboard menampilkan saldo **Available Document Credits**, bukan hanya raw wallet total. Tooltip dapat memisahkan reserved credit.

Contoh:

```text
Available 237 | Reserved 12 | Monthly plan 300
```

### 16.2 Billing page

Halaman Billing minimal menampilkan:

- paket aktif dan monthly allocation;
- available/reserved credit;
- next allocation date;
- rollover cap;
- credit lots dan expiry terdekat;
- ledger/history yang dapat difilter;
- top-up options;
- trial/subscription status;
- low-balance warning.

### 16.3 Insufficient credit

Draft/edit tetap dapat berjalan. Action yang membutuhkan reservation baru menampilkan pesan:

> Document Credits tidak cukup untuk mengaktifkan tindakan ini. Tambah credit atau upgrade paket.

Existing external invitation yang credit-nya sudah reserved tidak boleh gagal hanya karena available balance sekarang nol.

### 16.4 Pricing transparency

Sebelum action yang me-reserve credit, UI harus menjelaskan jumlah credit yang terdampak. Tidak ada debit tersembunyi untuk scan QR, resend, preview, atau retry teknis.
