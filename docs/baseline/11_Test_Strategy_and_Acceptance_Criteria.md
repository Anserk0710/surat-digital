# Test Strategy & Acceptance Criteria

## Surat Digital

**Versi:** 1.3

## 1. Tujuan

Memastikan sistem:

- Berjalan sesuai PRD/SRS.

- Melindungi dokumen berdasarkan hak akses.

- Menjaga urutan workflow.

- Menjaga integritas tanda tangan dan nomor.

- Stabil untuk skala awal ±100 pengguna.

## 2. Tingkatan pengujian

| Jenis            | Fokus                                     | Pelaksana       |
|------------------|-------------------------------------------|-----------------|
| Unit Test        | Function, validation, permission resolver | Developer       |
| Integration Test | NestJS, Prisma, Supabase, Blob, queue, worker, email | Developer/QA |
| Database Test    | Constraint, trigger, function, RLS        | Developer/QA    |
| E2E Test         | Alur pengguna dari draft sampai issue     | QA              |
| Security Test    | IDOR, privilege escalation, file privacy  | QA/Security     |
| Performance Test | Concurrency dan load                      | QA              |
| UAT              | Kesesuaian proses bisnis                  | User perwakilan |

## 3. Test role matrix

Siapkan akun:

1.  Administrator.

2.  Creator biasa.

3.  Knowing.

4.  Approver pertama.

5.  Approver kedua.

6.  Audit Viewer.

7.  User tanpa permission khusus.

8.  User dengan beberapa Group Policy.

9.  User dengan Explicit Deny.

10. User suspended.

## 4. Functional test scenarios

### A. Authentication

- Login email berhasil.

- Login username berhasil.

- Login NIP berhasil.

- Password salah.

- Akun Pending.

- Akun Suspended.

- Token expired.

- Reset password.

### B. User & Organization

- Import Excel valid.

- Import dengan NIP duplikat.

- Import dengan email duplikat.

- Registrasi mandiri.

- Approval registrasi.

- Divisi berada di beberapa kantor.

- Karyawan memiliki assignment lebih dari satu jika diaktifkan.

### C. Group Policy

- Satu group ALLOW.

- Dua group ALLOW.

- Satu group ALLOW dan satu DENY.

- Tidak memiliki permission.

- Membership dicabut.

- Group dinonaktifkan.

- Perubahan permission tercatat di Audit Log.

### D. Document Creation

- Template.

- Editor.

- Upload PDF.

- Upload DOCX.

- Upload DOC.

- Upload XLSX.

- Upload XLS.

- Satu file utama.

- Banyak lampiran.

- Review file satu per satu.

- File corrupt.

- File terlalu besar.

- File dengan MIME type palsu.

- Konversi Office gagal.
- PDF digital berhasil diekstrak dengan PDF.js.
- PDF scan memicu OCR fallback dan hasilnya diberi label OCR.
- DOCX diekstrak menggunakan Mammoth.
- DOC legacy diproses pada worker dengan parser/converter yang disetujui.
- XLSX/XLS menghasilkan data sheet/cell yang sesuai fixture.
- File signature tidak cocok ditolak.
- File zip bomb/ukuran expanded berlebihan ditolak.
- Macro/active content tidak pernah dieksekusi.
- Processing status berubah sesuai state machine.
- Retry job tidak membuat extraction/preview duplikat.
- Preview harus tersedia sebelum review/submit.
- File corrupt atau parser crash ditangani tanpa membocorkan stack trace.

- Sign+Submit tanpa `signatureMethod`/proof yang valid harus gagal atomik: document tetap Draft/unlocked dan tidak ada signature parsial.

### E. Workflow

- Tidak ada Knowing.

- Satu Knowing.

- Banyak Knowing.

- Creator dipilih sebagai Knowing harus ditolak.

- Creator dipilih sebagai Approver harus ditolak.

- Orang yang sama dipilih sebagai Knowing dan Approver harus ditolak.

- Approver pertama tidak aktif sebelum semua Knowing selesai.

- Knowing harus membaca dan tanda tangan.

- Knowing tidak bisa approve.

- Approver kedua tidak dapat bertindak sebelum pertama.

- Approver aktif dapat approve dan sign.

- Approver aktif dapat reject dengan alasan.

- Reject tanpa alasan harus gagal.

- Creator dapat withdraw sebelum approval pertama.

- Creator tidak dapat withdraw setelah approval pertama.

- Withdraw tanpa alasan harus gagal.

### F. Signature

- Visual signature.

- Internal signature aktif.

- Internal signature tanpa registrasi harus gagal.

- PIN benar.

- PIN salah.

- PIN brute force lockout.

- Signature role cocok dengan participant role.

- Hash signature sama dengan versi dokumen.

- Signature tidak dapat diubah/dihapus.

- Final PDF memuat seluruh signature block.

### G. Numbering

- Jenis berbeda.

- Divisi berbeda.

- Kantor berbeda.

- Bulan berbeda.

- Tahun berbeda.

- Bulan Romawi benar.

- Reset 001.

- Dua request bersamaan.

- Retry finalization.

- Rejected/cancelled tidak memiliki nomor.

- Nomor resmi tidak dapat diedit.

### H. Notification

- In-app notification.

- Email.

- Knowing notification awal.

- Knowing notification setelah issue.

- Approver notification sesuai urutan.

- Retry email.

- Duplicate event tidak membuat notifikasi ganda yang tidak diinginkan.

### I. Archive dan Audit

- Search berdasarkan ID.

- Search nomor.

- Search judul.

- Filter status.

- Search isi dokumen.

- User tidak dapat membuka dokumen orang lain.

- Audit Viewer dapat membaca.

- User biasa tidak dapat membaca Audit Log.

- Audit record tidak dapat diubah/dihapus.

## 5. Security test

| Test                                 | Expected result                                  |
|--------------------------------------|--------------------------------------------------|
| Mengubah UUID dokumen pada URL       | Tidak dapat membaca dokumen tanpa akses          |
| Mengakses Blob langsung              | Tidak dapat membaca file private tanpa otorisasi |
| Memanggil endpoint tanpa JWT         | 401                                              |
| Memanggil endpoint tanpa permission  | 403                                              |
| Mengirim employee ID orang lain      | Ditolak                                          |
| Memanggil approve sebelum gilirannya | Ditolak                                          |
| Creator mencoba self-approve         | Ditolak                                          |
| Mengubah file setelah submit         | Ditolak                                          |
| Mengubah signature record            | Ditolak                                          |
| Mengubah nomor resmi                 | Ditolak                                          |
| Membaca PIN hash                     | Tidak tersedia ke client                         |
| Mengakses service role dari frontend | Tidak ada secret yang terekspos                  |

## 6. Performance test

Skenario awal:

- ±100 akun.

- Simulasikan concurrent login.

- Simulasikan daftar dokumen.

- Simulasikan preview PDF.

- Simulasikan upload dokumen.

- Simulasikan approval bersamaan pada dokumen berbeda.

- Simulasikan numbering request bersamaan.

- Simulasikan pencarian arsip.

Target latency dan throughput harus ditetapkan setelah baseline
infrastruktur dan ukuran dokumen diketahui.

## 7. UAT scenarios

### UAT-01 — Surat berhasil diterbitkan

1.  Creator membuat Surat Internal.

2.  Upload file utama dan lampiran.

3.  Review file.

4.  Pilih Knowing.

5.  Pilih dua Approver berurutan.

6.  Creator melakukan **Sign & Submit** atomik.

7.  Knowing membaca, konfirmasi, dan tanda tangan.

8.  Approver pertama approve dan sign.

9.  Approver kedua approve dan sign.

10. Sistem me-reserve nomor resmi lalu membuat PDF final.

11. PDF final tersedia dan numbering menjadi ISSUED.

13. Semua pihak terkait dapat melihat sesuai hak akses.

**Expected:** status ISSUED dan nomor resmi unik.

### UAT-02 — Knowing belum selesai

1.  Creator submit.

2.  Salah satu Knowing belum tanda tangan.

3.  Approver pertama mencoba membuka task.

**Expected:** approver belum aktif dan tidak dapat melakukan approval.

### UAT-03 — Rejection

1.  Approver aktif menolak.

2.  Alasan diisi.

**Expected:** REJECTED permanen, tidak ada nomor resmi.

### UAT-04 — Withdraw

1.  Creator submit.

2.  Knowing belum selesai atau sudah selesai.

3.  Belum ada approval pertama.

4.  Creator withdraw dengan alasan.

**Expected:** CANCELLED, nomor resmi tidak diterbitkan.

### UAT-05 — Self-approval

1.  Creator mencoba memasukkan dirinya sebagai approver.

**Expected:** sistem menolak sebelum submit dan database/backend tetap
melindungi aturan.

### UAT-06 — Permission

1.  User tanpa `Document.ViewAll` mencoba melihat dokumen yang tidak
    melibatkan dirinya.

**Expected:** akses ditolak.

## 8. Defect severity

| Severity | Definisi                                   | Contoh                       |
|----------|--------------------------------------------|------------------------------|
| Critical | Kebocoran data atau bypass kontrol utama   | User melihat dokumen rahasia |
| High     | Workflow/nomor/signature salah             | Approval dapat dilompati     |
| Medium   | Fungsi penting gagal tetapi ada workaround | Preview file gagal           |
| Low      | Masalah tampilan minor                     | Alignment komponen           |

Critical dan High harus diselesaikan sebelum production.

## 9. Release acceptance

Release hanya dapat dilakukan jika:

- Seluruh Must requirements lulus.

- Tidak ada critical/high defect terbuka.

- Prisma Migrate dapat membangun database kosong dari awal.
- Prisma Seed idempotent.
- Prisma runtime role tidak memiliki BYPASSRLS jika RLS menjadi lapisan query runtime.
- Transaction-local `auth.uid()` context tidak bocor antar pengguna/transaction.
- RLS dan backend authorization tests lulus secara terpisah dan bersama.

- Numbering concurrency test lulus.

- Final PDF dan hash terverifikasi.

- Backup restore berhasil.

- UAT disetujui.

- Rollback plan tersedia.


## 10. Database/Prisma test wajib

- `prisma migrate deploy` berhasil pada database kosong dan database upgrade.
- SQL kustom RLS/trigger/function di dalam migration Prisma ikut diterapkan.
- `prisma migrate status` menunjukkan schema up-to-date.
- Prisma Seed dapat dijalankan ulang tanpa duplikasi.
- Runtime role tidak dapat melakukan DDL.
- Runtime role tidak memiliki `BYPASSRLS` bila policy harus melindungi Prisma query.
- Migration role dan runtime role tidak saling tertukar.
- Semua operasi RLS per-user menggunakan Prisma transaction client yang sama.
- Simulasi dua user berbeda memastikan claim `auth.uid()` tidak tertukar pada concurrent requests.
- Test membuktikan query tanpa claim ditolak atau tidak mengembalikan baris sesuai policy.

## 11. Document Processing test matrix

| Format | Fixture | Expected |
|---|---|---|
| PDF digital | PDF dengan teks dan tabel | Teks dapat diekstrak; halaman terdeteksi |
| PDF scan | PDF berbasis gambar | OCR fallback; hasil diberi label OCR |
| DOCX | Paragraf, heading, tabel | Teks dan struktur dasar terbaca |
| DOC | Dokumen Word legacy | Worker dapat membaca/konversi atau memberi error yang jelas |
| XLSX | Banyak sheet, formula, print area | Sheet/cell terbaca dan PDF preview sesuai pengaturan |
| XLS | Workbook legacy | Sheet/cell terbaca dan PDF preview dibuat |
| File palsu | Extension/MIME/signature tidak cocok | Ditolak |
| File berbahaya | Malware/zip bomb/active content | Ditolak atau dikarantina |


## 12. Mandatory integrity/reliability tests v1.3

| ID | Scenario | Expected |
|---|---|---|
| INT-001 | Creator mengirim dua request Sign+Submit dengan idempotency key sama | Satu signature, satu state transition, satu audit business action |
| INT-002 | File/attachment diubah setelah manifest dihitung | Manifest berubah; signature lama tidak dapat dianggap valid |
| INT-003 | Crash antara business DB commit dan queue publish | Outbox pending terdeteksi dan didispatch ulang |
| INT-004 | Finalization retry setelah PDF worker timeout | Reservation nomor sama; tidak membuat counter baru |
| INT-005 | Permanent finalization failure | Reservation dapat VOID oleh proses berizin; nomor tidak reused |
| WF-REC-001 | Approver suspended sebelum gilirannya | Task BLOCKED; approve ditolak |
| WF-REC-002 | Workflow.Repair mengganti participant | Sequence sama, reason/audit lengkap, signature historis immutable |
| PERM-001 | Permission approver dicabut setelah submit | Action ditolak saat runtime re-check |
| FILE-SEC-001 | File malware/EICAR-like fixture sesuai scanner test | Quarantine; parser/converter tidak dijalankan |
| FILE-SEC-002 | Malware scanner timeout | Fail-closed; file tidak diproses |
| API-001 | OpenAPI breaking change tanpa regenerated client | CI gagal |
| PIN-001 | Panggilan berulang mencoba validasi PIN generik | Tidak ada reusable PIN oracle; rate limit/lockout berlaku pada signature operation |
| XSS-001 | Filename/title/extracted text/editor HTML mengandung payload XSS | Di-escape/sanitize, tidak dieksekusi |
| PREVIEW-001 | PDF/untrusted preview mencoba active content | CSP/sandbox mencegah perilaku yang tidak diizinkan |

## 13. NFR acceptance baseline v1.3

- Common API read p95 ≤ 800 ms dan write p95 ≤ 1.5 s pada dataset/load pilot yang terdokumentasi, tidak termasuk async file processing.
- Indexed list/search p95 ≤ 2 s pada dataset pilot.
- PDF digital processing p95 ≤ 30 s dan Office conversion p95 ≤ 60 s untuk fixture dalam batas file yang disepakati.
- Restore drill membuktikan RPO ≤ 24 jam dan RTO ≤ 4 jam untuk baseline pilot.
- Flow inti menjalani accessibility checks terhadap target WCAG 2.2 AA.
- Queue age, dead-letter, outbox backlog, finalization failure, auth/storage error memiliki observability dan alert test.

## 14. External Signing & Credit Billing test matrix — v1.3

### External Signing

- EXT-001: valid external signer dapat review dan sign tanpa internal account.
- EXT-002: token random/unknown tidak membocorkan document existence.
- EXT-003: expired/revoked token ditolak.
- EXT-004: token untuk version A tidak dapat sign version B.
- EXT-005: duplicate sign request/idempotent retry menghasilkan satu signature dan satu consumed credit.
- EXT-006: revoke sebelum complete me-release reservation.
- EXT-007: successful external signature tetap dapat diverifikasi terhadap manifest hash.
- EXT-008: OTP/challenge brute-force terkena rate limit/lock controls sesuai policy.
- EXT-009: token tidak muncul di log/audit/analytics raw.

### QR Verification

- VER-001: issued valid document menampilkan allowlisted verification metadata.
- VER-002: revoked/void status ditampilkan benar.
- VER-003: 10.000 repeated scan tidak membuat credit ledger debit.
- VER-004: public page tidak mengekspos private Blob URL/file tanpa capability terpisah.
- VER-005: subscription expired tidak mengubah historical document validity secara keliru.

### Credits

- BILL-001: QR-only issue mengonsumsi tepat 1 credit.
- BILL-002: document dengan 3 completed external signer mengonsumsi tepat 3 credit, bukan 4.
- BILL-003: failed/resend/retry technical paths tidak menambah debit.
- BILL-004: two concurrent reservations for last available credit menghasilkan tepat satu success.
- BILL-005: reserve→consume hanya dapat terjadi sekali.
- BILL-006: reserve→release hanya dapat terjadi sekali dan credit kembali available.
- BILL-007: duplicate payment callback menghasilkan satu top-up lot.
- BILL-008: consumption memilih credit lot dengan expiry paling dekat.
- BILL-009: subscription rollover tidak melebihi 2× monthly allocation dan lot monthly melewati dua billing cycle diproses expired.
- BILL-010: top-up expire sesuai 12-month policy dan menghasilkan ledger evidence.
- BILL-011: trial berhenti pada 50 credit atau 30 hari, mana lebih dahulu.
- BILL-012: wallet projection dapat direkonsiliasi dari ledger/lots/reservations.
- BILL-013: admin grant/reversal tanpa permission/reason ditolak.
- BILL-014: balance tidak pernah negatif pada baseline.
- BILL-015: insufficient credit memblokir new reservation tetapi tidak memblokir signer dengan existing ACTIVE reservation.

Commercial launch gate: semua BILL-001–015 dan EXT/VER critical security path harus hijau sebelum fitur dijual secara luas.
