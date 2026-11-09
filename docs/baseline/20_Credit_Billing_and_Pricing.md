# Credit Billing & Pricing Specification

## Surat Digital Verify & Sign

**Versi:** 1.3  
**Status:** Commercial baseline; harga dapat direvisi melalui Decision Log berdasarkan unit economics dan hasil pilot

## 1. Tujuan

Dokumen ini mendefinisikan model subscription berbasis **Document Credits** untuk fitur komersial awal Surat Digital: **QR Document Verification** dan **External Signing**. Model ini sengaja tidak menggunakan jumlah internal user sebagai billing metric utama.

Prinsip komersial:

- Subscription berlaku per perusahaan/workspace/deployment.
- Internal user **tidak dikenai harga per user**. Baseline kapasitas teknis awal tetap ±100 user dan deployment lebih besar memerlukan capacity review.
- External signer/recipient tidak pernah dikenai subscription atau diwajibkan membeli akun.
- Scan QR verification tidak mengonsumsi credit dan tidak dibatasi secara komersial, dengan fair-use/security controls untuk abuse.
- Credit hanya dikonsumsi pada successful business event; retry teknis, resend link, OTP gagal, preview, atau scan QR tidak boleh mengurangi credit.
- Semua mutasi credit harus dapat direkonsiliasi melalui append-only application ledger.

## 2. Definisi Document Credit

**1 Document Credit** adalah unit penggunaan komersial untuk satu dokumen terverifikasi atau satu External Signing Action yang berhasil.

Aturan biaya per dokumen:

```text
credit_cost(document) = max(1, completed_external_signers)
```

Contoh:

| Aktivitas | Credit |
|---|---:|
| Dokumen diterbitkan dengan QR Verification, tanpa external signer | 1 |
| Dokumen + 1 external signer berhasil | 1 |
| Dokumen + 2 external signer berhasil | 2 |
| Dokumen + 5 external signer berhasil | 5 |
| Scan QR 1 kali atau 10.000 kali | 0 |
| External signer membuka secure link | 0 |
| Resend invitation/OTP | 0 |
| Signature gagal atau dibatalkan sebelum berhasil | 0 consumed; reservation dilepas |
| Retry worker/finalization karena error teknis | 0 tambahan |

QR Verification untuk dokumen yang sudah memiliki minimal satu successful External Signing Action **tidak menambah base credit terpisah**.

## 3. Credit lifecycle

Gunakan state machine:

```text
AVAILABLE
   │
   ▼
RESERVED
   ├── operation gagal/cancel/expired ──> RELEASED → AVAILABLE
   └── successful business event ───────> CONSUMED
```

### 3.1 QR-only document

1. Dokumen telah lolos workflow dan siap diterbitkan.
2. Server memastikan minimal 1 credit tersedia.
3. Dalam transaksi finalisasi bisnis, 1 credit di-reserve.
4. Setelah dokumen berhasil `ISSUED` dan verification token aktif, reservation di-consume.
5. Jika finalisasi gagal sebelum issue, reservation tetap dapat dipakai retry atau dilepas sesuai recovery rule; retry tidak boleh membuat charge baru.

### 3.2 External Signing

1. Internal user membuat external signing request untuk signer tertentu.
2. Sebelum invitation diaktifkan, sistem me-reserve 1 credit untuk signer slot tersebut.
3. Jika signer berhasil menyelesaikan signature, reservation menjadi `CONSUMED`.
4. Jika invitation dicabut/expired/cancel sebelum signature berhasil, reservation menjadi `RELEASED`.
5. Duplicate request/callback/sign action dengan idempotency key yang sama tidak boleh mengonsumsi credit dua kali.

## 4. Credit source dan consumption priority

Credit berasal dari:

- `SUBSCRIPTION_ALLOCATION` — alokasi bulanan.
- `TOP_UP` — pembelian credit tambahan.
- `TRIAL` — credit masa percobaan.
- `ADMIN_GRANT` — koreksi goodwill/manual yang wajib memiliki actor dan reason.
- `REVERSAL` — pengembalian akibat koreksi transaksi yang valid.

Consumption menggunakan credit yang **paling cepat kedaluwarsa terlebih dahulu** untuk meminimalkan credit customer yang hangus.

## 5. Subscription packages — commercial baseline v1.3

Harga berikut adalah baseline launch untuk validasi pasar, bukan janji permanen. Perubahan harga wajib dicatat di Decision Log dan tidak boleh mengubah saldo credit customer secara retroaktif.

| Paket | Credit/bulan | Harga/bulan | Efektif maksimum/credit |
|---|---:|---:|---:|
| Lite | 100 | Rp49.000 | Rp490 |
| Starter | 300 | Rp129.000 | Rp430 |
| Business | 1.000 | Rp349.000 | Rp349 |
| Business+ | 3.000 | Rp899.000 | ±Rp300 |
| Enterprise | 10.000+ | Custom | Custom |

Termasuk pada seluruh paket berbayar:

- Internal user tidak dimeter berdasarkan jumlah akun.
- External recipient gratis.
- Unlimited QR scan secara komersial.
- Public verification page.
- External signing sesuai credit yang tersedia.
- Audit trail dan credit history.

Storage, very-high-volume processing, SLA khusus, dan kebutuhan custom dapat diatur terpisah di kontrak bila biaya aktual material.

## 6. Rollover

Subscription credit dapat rollover dengan batas maksimum saldo subscription sebesar **2× monthly allocation**. Setiap monthly subscription allocation berlaku sampai akhir **billing cycle kedua** sejak allocation tersebut, sehingga credit lama tidak menumpuk tanpa batas.

Contoh Starter:

```text
Monthly allocation = 300
Maximum subscription-credit balance = 600
```

Pada allocation baru, sistem lebih dahulu memproses lot subscription yang sudah melewati dua billing cycle, lalu menerapkan cap 2× monthly allocation. Bagian allocation yang akan membuat saldo subscription melewati cap tidak ditambahkan. Sistem harus menampilkan allocation, used, expired/not-added-by-cap, dan remaining secara transparan.

Rollover policy dapat diubah untuk customer Enterprise melalui kontrak, tetapi tidak boleh mengubah ledger history.

## 7. Top-up

Baseline top-up:

| Top-up | Harga | Validitas |
|---:|---:|---|
| 100 credit | Rp50.000 | 12 bulan |
| 500 credit | Rp225.000 | 12 bulan |
| 1.000 credit | Rp400.000 | 12 bulan |
| 5.000 credit | Rp1.500.000 | 12 bulan |

Top-up dibuat sedikit lebih mahal per credit dibanding paket subscription agar customer dengan usage konsisten terdorong memilih paket yang tepat.

Credit top-up hanya diberikan setelah pembayaran/konfirmasi transaksi berhasil. Pada tahap awal, provider pembayaran dapat diganti adapter/manual confirmation yang tetap menghasilkan event billing yang teraudit.

## 8. Trial

Baseline trial:

- 50 Document Credits.
- Maksimal 30 hari.
- Berakhir ketika credit habis atau waktu trial berakhir, mana yang lebih dahulu.
- External recipient tetap gratis.
- Tidak memerlukan kartu pembayaran jika kebijakan go-to-market memilih friction rendah.
- Abuse prevention dapat membatasi trial per company/domain/verified identity tanpa menjadikan scan QR berbayar.

## 9. Credit ledger dan invariants

Credit balance **tidak boleh** menjadi satu-satunya sumber kebenaran. Saldo merupakan hasil/denormalized projection dari ledger dan lot/reservation yang dapat direkonsiliasi.

Invariant wajib:

1. Ledger entry yang sudah committed tidak di-update/delete melalui aplikasi.
2. Koreksi menggunakan entry baru `REVERSAL`/`ADJUSTMENT`, bukan edit history.
3. Balance tidak boleh negatif kecuali kontrak Enterprise secara eksplisit mendukung post-paid overage; baseline v1.3 tidak mendukung saldo negatif.
4. Setiap `CONSUME` memiliki `reference_type`, `reference_id`, dan idempotency key unik.
5. Reservation hanya dapat di-consume atau release satu kali.
6. Allocation/top-up/grant memiliki source dan expiry yang jelas.
7. Credit expiration/cap processing berjalan idempotent dan dapat direkonsiliasi.
8. Retry teknis tidak boleh menimbulkan charge baru.
9. QR scan tidak membuat ledger debit.

## 10. Low balance dan insufficient credit

UI menampilkan warning pada threshold yang dapat dikonfigurasi, baseline:

- Warning: remaining available credit ≤ 20% monthly allocation.
- Critical: remaining available credit ≤ 5%.

Jika credit tidak cukup:

- Pembuatan/edit draft tetap boleh.
- Scan QR dokumen yang sudah diterbitkan tetap berjalan.
- Existing external signer yang credit-nya sudah reserved tetap dapat menyelesaikan signature.
- Aktivasi external signing request baru atau issuance QR-only baru diblokir dengan error `CREDIT_INSUFFICIENT` sampai top-up/allocation tersedia.

Sistem tidak boleh membatalkan reservation existing hanya karena subscription berubah setelah invitation aktif.

## 11. Cancellation dan subscription expiry

Saat subscription berakhir:

- Tidak ada alokasi subscription baru.
- Dokumen existing tetap mengikuti data-retention/exit policy.
- QR verification untuk dokumen yang sudah resmi diterbitkan tidak boleh tiba-tiba menjadi “invalid” hanya karena subscription berhenti; status harus membedakan **document validity** dari **account subscription status**.
- Kemampuan membuat issuance/external-signing baru mengikuti grace/read-only policy kontrak.
- Top-up credit yang masih berlaku mengikuti ketentuan kontrak/termination; keputusan refund/non-refund harus tertulis pada Terms of Service.

## 12. Metrics untuk validasi pricing

Pantau minimal:

- MRR dan ARR.
- Average Revenue per Customer (ARPC).
- Credit allocated vs consumed.
- Credit utilization percentage.
- External signing completion rate.
- Cost per successful external signing.
- QR verification requests per issued document.
- Gross margin per customer/package.
- Top-up attach rate.
- Upgrade/downgrade rate.
- Trial-to-paid conversion.
- Support minutes per customer.

Harga v1.3 harus ditinjau setelah data aktual tersedia; keputusan akhir berorientasi pada unit economics dan willingness-to-pay, bukan hanya biaya server.
## 13. Legal/marketing wording

External Signing baseline v1.3 adalah mekanisme electronic signing dengan secure link, evidence, audit, dan document-integrity binding. Sistem **tidak boleh** memasarkan fitur ini sebagai tanda tangan elektronik tersertifikasi/PSrE-certified kecuali memang telah terintegrasi dengan penyelenggara dan memenuhi persyaratan yang berlaku. Wording legal per jenis dokumen harus direview sebelum commercial launch.

