# ADR-0004 — Document Limits and Worker Hosting

Status: Accepted  
Date: 2026-11-21  
Phase: Governance before P10  
Approval: User delegated the choice by accepting the agent's recommendations on 2026-11-21.

## Context

O-003, O-006, dan O-008 membutuhkan keputusan sebelum P10. Baseline ditujukan untuk korespondensi internal dan worker dokumen dengan sumber daya terbatas. Limit byte saja tidak membatasi kompleksitas PDF/workbook. Dokumen dengan sedikit byte tetap dapat memiliki banyak halaman/sheet atau memerlukan rendering mahal.

## Decision

| Item             | Keputusan                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| O-003: satu file | Maksimum 4 MiB = 4,194,304 byte; mempertahankan batas P09                                            |
| O-003: kumulatif | Maksimum 20 MiB = 20,971,520 byte untuk seluruh file MAIN + ATTACHMENT pada satu versi dokumen aktif |
| O-006: PDF       | Maksimum 200 halaman per file PDF; berlaku juga pada hasil konversi Office ke PDF                    |
| O-006: workbook  | Maksimum 20 worksheet per workbook, termasuk sheet hidden dan very hidden                            |
| O-008: hosting   | Render Background Worker, Docker Linux, region Singapore                                             |

MiB menggunakan satuan biner (1 MiB = 1,048,576 byte). Batas bersifat inklusif: tepat pada batas diterima, lebih dari batas ditolak. Limit kumulatif mencakup file utama dan semua attachment yang masih terdaftar pada versi aktif, tidak menghitung hasil preview, salinan turunan, maupun versi historis. Penghapusan/replacement baru mengurangi total setelah transaksi metadata berhasil. Jumlah attachment adalah keputusan terpisah O-004 dan tidak otomatis ditutup oleh limit byte ini.

Worker awal direncanakan menjalankan satu job berat per instance, minimum 1 CPU dan 2 GiB RAM sebagai titik awal sizing yang harus diukur. Tidak ada subscription, provisioning, deployment, ataupun implementasi P10 yang dilakukan oleh ADR ini. Storage dokumen tetap private Blob; filesystem container hanya untuk file sementara dan dibersihkan setelah job. Pemilihan queue/Redis tetap O-009. Scanner tetap O-018 dan wajib diputuskan sebelum P10 selesai.

## Rationale and alternatives

Batas 4 MiB mempertahankan kompatibilitas P09. Total 20 MiB memberi ruang untuk dokumen utama dan lampiran sambil membatasi akumulasi storage/transfer per versi. Batas 200 halaman dan 20 sheet adalah baseline operasional yang direkomendasikan, bukan hasil benchmark atau batas dari provider. Batas ini dapat direvisi melalui keputusan tercatat setelah data penggunaan tersedia.

Render menyediakan [background worker kontinu tanpa incoming traffic](https://render.com/docs/background-workers), [Docker runtime](https://render.com/docs/docker), dan [region Singapore](https://render.com/docs/regions). Worker memproses queue dan membuat koneksi keluar ke API/storage. Ini sesuai kebutuhan proses panjang dan dependency sistem seperti LibreOffice. Vercel request functions tetap untuk API; VM mandiri memberi kontrol lebih luas tetapi menambah beban operasi. Hosting final dipilih sekarang; smoke test deployment dan sizing tetap deliverable implementasi berikutnya.

## Consequences and implementation follow-up

- O-003, O-006, dan O-008 ditutup sebagai keputusan; penutupan keputusan tidak berarti implementasi limit/hosting selesai.
- Batas satu file 4 MiB telah ditegakkan P09. Enforcement kumulatif harus atomic terhadap upload paralel pada phase file lifecycle terkait sebelum production; jangan hanya menjumlahkan di frontend.
- PDF/page count, workbook sheet count, dan hasil konversi harus diperiksa pada worker dengan batas waktu, memory, dan temporary disk. Job yang melampaui limit harus gagal secara deterministik dan tidak dinyatakan ready. Ini pekerjaan phase worker terkait; belum diimplementasikan dalam housekeeping ini.
- Jumlah sheet/halaman bukan perlindungan lengkap terhadap decompression bomb atau formula/layout mahal. Resource limits, sandboxing, retry policy, dan malware scanning tetap diperlukan.
- Pengukuran beban, secret provisioning, dan deployment smoke test tetap diperlukan sebelum menyatakan worker siap digunakan. P10 belum dimulai.

## Closed Open Items

- O-003 — Batas satu file dan total file/attachment per versi aktif.
- O-006 — Batas halaman PDF dan jumlah sheet workbook.
- O-008 — Hosting final worker/container.
