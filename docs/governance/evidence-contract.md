# Phase evidence contract

`npm run verify:through-p09` menjalankan verifikasi teknis, kemudian memvalidasi schema dan kelengkapan evidence sebelum memeriksa keputusan governance. `npm run evidence:validate` memeriksa artifact yang sudah ada tanpa menjalankan ulang tes. `npm run governance:check` memeriksa hygiene environment contoh, keunikan nomor ADR, dan link ADR.

Kontrak field dan enum berasal dari `phase-gates.json`; implementasi validator bersama berada di `scripts/phase-evidence.mjs`. Ringkasan backend membutuhkan `phaseId`, `executedAt`, `overallStatus`, dan array `verification` yang tidak kosong. Setiap record backend maupun frontend wajib memiliki string nonkosong untuk `phaseId`, `testId`, `status`, `executedAt`, `command`, `result`, dan `artifactPath`.

Timestamp harus merupakan waktu UTC ISO yang valid. Identitas phase, prefix test ID, dan artifact path harus sesuai file yang diperiksa. Test ID wajib unik dan seluruh test wajib phase P02–P09 harus tercantum. `PASS` pada ringkasan tidak cukup: setiap record harus `PASS`. `FAIL`, `BLOCKED`, `NOT_RUN`, status tidak dikenal, JSON rusak, field hilang, atau test wajib yang tidak tercatat menolak gate.

Writer P02/P03 dan P05–P08 menghasilkan record canonical langsung dari hasil command aktual. Detail execution lama tetap disertakan untuk diagnosis. Evidence lama yang belum memenuhi schema harus dihasilkan ulang oleh verifier; validator tidak memperbaiki atau mengarang hasil dan timestamp tes historis.

Validasi schema membuktikan bentuk dan konsistensi evidence, bukan keaslian kriptografis hasil tes. Gate lengkap menjalankan command aktual lebih dahulu. `evidence:validate` sendiri tidak menyatakan source saat ini sudah diuji ulang, tidak membuka P10, dan tidak menggantikan gate lengkap.

Keputusan governance yang Closed berarti keputusan telah ditetapkan. Status implementasi, deployment, dan acceptance test phase berikutnya tetap terpisah. Lihat ADR-0004 untuk limit file/PDF/workbook dan hosting worker yang disetujui.
