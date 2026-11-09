# Business Model & Service Operations

## Surat Digital Verify & Sign

**Versi:** 1.3 — Credit-based subscription commercial baseline

## 1. Model bisnis

Model yang dipilih adalah **subscription per perusahaan/workspace dengan Document Credits**. Jumlah internal user bukan billing metric utama.

Pemilik produk mempertahankan kepemilikan produk dan source code. Perusahaan pelanggan memperoleh hak penggunaan aplikasi sesuai perjanjian dan memiliki data/dokumen yang diproses melalui sistem.

Keputusan v1.3 **tidak mengubah** keputusan implementasi satu perusahaan/deployment yang telah disepakati sebelumnya. Pembahasan multi-tenant/shared SaaS architecture tetap di luar scope perubahan ini.

## 2. Product offer awal

Fokus komersial awal adalah:

1. **QR Document Verification** — dokumen resmi memiliki verification token/QR yang dapat diperiksa publik tanpa mengekspos file privat.
2. **External Signing** — pihak di luar akun internal perusahaan dapat menerima secure link, melakukan verifikasi identitas sesuai policy, membaca dokumen, dan menandatangani tanpa membeli akun. Baseline ini tidak boleh diklaim sebagai PSrE-certified signature kecuali ada integrasi/landasan yang sesuai.

Positioning yang direkomendasikan:

> **Surat Digital Verify & Sign — Kirim. Tanda tangani. Verifikasi.**

## 3. Kepemilikan

| Aset | Kepemilikan yang direkomendasikan |
|---|---|
| Produk dan source code | Pemilik produk |
| Merek/brand produk | Pemilik produk, sesuai pendaftaran |
| Data karyawan perusahaan | Perusahaan pelanggan |
| Dokumen dan lampiran perusahaan | Perusahaan pelanggan |
| Audit trail perusahaan | Perusahaan pelanggan |
| Billing/credit ledger | Catatan layanan pemilik produk; data transaksional customer tetap tunduk kontrak/privacy terms |
| Infrastruktur hosting | Sesuai kontrak dan pengaturan layanan |
| Konfigurasi khusus pelanggan | Diatur dalam perjanjian |

## 4. Prinsip pricing

- Tidak ada harga per internal user pada baseline v1.3.
- External signer/recipient gratis dan tidak dihitung sebagai paid user.
- Scan QR verification tidak mengonsumsi credit.
- Subscription memberikan alokasi Document Credits bulanan.
- Customer dengan usage tambahan dapat membeli top-up.
- Credit digunakan hanya pada successful business event sesuai `20_Credit_Billing_and_Pricing.md`.
- Retry teknis, resend invitation, scan QR, dan signature gagal tidak menghasilkan charge tambahan.

Baseline paket launch:

| Paket | Credit/bulan | Harga/bulan |
|---|---:|---:|
| Lite | 100 | Rp49.000 |
| Starter | 300 | Rp129.000 |
| Business | 1.000 | Rp349.000 |
| Business+ | 3.000 | Rp899.000 |
| Enterprise | 10.000+ | Custom |

Harga tersebut merupakan hipotesis komersial untuk pilot/launch dan harus divalidasi menggunakan unit economics serta willingness-to-pay.

## 5. Rollover, top-up, dan trial

- Subscription credit rollover sampai maksimum 2× alokasi bulanan; tiap monthly allocation berlaku maksimal dua billing cycle.
- Top-up credit berlaku 12 bulan.
- Baseline top-up: 100/Rp50.000, 500/Rp225.000, 1.000/Rp400.000, 5.000/Rp1.500.000.
- Trial: 50 credit atau 30 hari, mana yang lebih dahulu.
- Baseline v1.3 tidak memakai post-paid overage/saldo negatif; customer melakukan top-up atau upgrade.

Detail accounting dan state machine credit berada di `20_Credit_Billing_and_Pricing.md`.

## 6. Komponen subscription

Subscription dapat mencakup:

- Hak penggunaan aplikasi.
- QR verification portal.
- External signing capability sesuai credit.
- Hosting frontend/backend.
- Database dan storage dalam fair-use/contract limits.
- Backup dan monitoring.
- Maintenance, bug fixing, dan security updates.
- Technical support sesuai tier/SLA.
- Pelatihan/onboarding self-service atau berbayar sesuai kebutuhan.

Pengembangan fitur besar/custom, integrasi pihak ketiga, SLA khusus, dan processing volume ekstrem dapat menjadi biaya terpisah.

## 7. One-time/service revenue

Lisensi lifetime/one-time payment untuk software **tidak menjadi model utama**. Biaya one-time diperbolehkan untuk pekerjaan yang memang satu kali, misalnya:

- Onboarding/migrasi data.
- Training khusus.
- Custom template yang kompleks.
- Custom integration.
- White-label/custom domain jika ditawarkan kemudian.
- Data migration/exit assistance di luar allowance kontrak.

## 8. Unit economics guardrail

Sebelum harga dipromosikan sebagai harga tetap jangka panjang, ukur:

- biaya server/database/storage per customer;
- biaya email/OTP;
- biaya PDF processing/worker;
- biaya payment gateway;
- backup/monitoring;
- support minutes per customer;
- fraud/abuse cost;
- pajak dan biaya provider;
- credit utilization dan top-up rate.

Target internal yang direkomendasikan adalah menjaga gross margin yang sehat setelah variable cost; harga tidak boleh ditetapkan hanya dari biaya hosting.

## 9. Service limits

| Item | Baseline/kebijakan |
|---|---|
| Internal user | Tidak dimeter untuk billing; capacity baseline teknis ±100 user sebelum capacity review |
| QR scan | Unlimited secara komersial; rate-limit/fair-use untuk abuse |
| External signing | Berdasarkan Document Credits |
| Storage | Fair-use/kontrak; angka final setelah cost measurement |
| Upload | Batas file sesuai security/worker benchmark |
| Availability | Baseline engineering 99,5% sampai SLA kontraktual ditetapkan |
| Support | Sesuai tier/kontrak |
| Backup/restore | Mengikuti RPO/RTO dokumentasi operations |
| Top-up | Tersedia; validity 12 bulan |
| Overage | Tidak ada saldo negatif pada baseline; top-up/upgrade |

## 10. Support model

### Severity

- Critical: sistem tidak dapat digunakan atau ada kebocoran data.
- High: workflow inti, external signing, credit accounting, atau verification gagal material.
- Medium: fungsi penting terganggu tetapi ada workaround.
- Low: masalah tampilan atau pertanyaan penggunaan.

### Support workflow

1. Pelanggan membuat ticket.
2. Ticket diberi severity.
3. Tim support melakukan triage.
4. Jika bug, dibuat issue dan patch.
5. Patch diuji pada staging.
6. Release dilakukan sesuai change control.
7. Pelanggan menerima update dan penutupan ticket.

Billing dispute wajib dapat direkonsiliasi melalui credit ledger dan business-event reference.

## 11. Maintenance

Maintenance mencakup monitoring aplikasi, patch dependency, security updates, database maintenance, backup verification, storage/credit reconciliation, error investigation, capacity review, dan review biaya provider.

## 12. Exit dan data portability

Saat subscription berakhir, perjanjian harus mengatur:

- periode akses read-only/grace period;
- ekspor dokumen, metadata, dan audit;
- format data dan biaya transfer bila ada;
- jadwal penghapusan;
- perlakuan top-up credit yang belum habis;
- bukti penghapusan jika diwajibkan;
- status QR dokumen resmi yang sudah diterbitkan.

**Document validity tidak boleh disamakan dengan subscription validity.** QR dokumen resmi yang pernah diterbitkan harus tetap menjelaskan status dokumen secara benar sesuai retention/verification policy, bukan berubah menjadi “invalid” hanya karena customer berhenti berlangganan.

## 13. Open commercial items

- Provider/metode pembayaran final.
- Pajak dan invoice format.
- Refund policy top-up.
- SLA per tier.
- Fair-use storage final.
- Syarat trial/anti-abuse final.
- Annual pricing/discount setelah cash-flow simulation.
- Enterprise minimum commitment.
- Ketentuan credit ketika kontrak dihentikan sebelum expiry.

## 14. Validation sebelum penawaran luas

1. Jalankan pilot dengan paket/credit nyata.
2. Ukur conversion trial → paid.
3. Ukur credit utilization dan top-up rate.
4. Hitung gross margin per paket.
5. Ukur support cost per customer.
6. Uji willingness-to-pay melalui customer interview dan transaksi nyata.
7. Review Terms of Service, privacy, data processing, dan wording electronic signature bersama pihak yang berwenang.
8. Revisi pricing melalui Decision Log, tanpa mengubah historical ledger.
