# ADR-0002 — Prisma Runtime RLS Strategy

Status: Accepted  
Date: 2026-11-18  
Phase: P07  
Related decision: D-064  
Related open item: O-015

P02/P09 reconciliation: [runtime role, pinned driver, dan download-purpose context](ADR-0003-runtime-database-rls.md) melengkapi keputusan ini. Bukti dan benchmark P07 di bawah tetap berlaku.

## Context

Surat Digital menggunakan NestJS dan Prisma sebagai satu-satunya application data-access boundary untuk browser. Backend authorization melalui application session dan Group Policy tetap menjadi enforcement utama. PostgreSQL RLS dievaluasi sebagai defense-in-depth untuk resource dengan row-level ownership atau organizational scope.

Prisma tidak otomatis meneruskan Supabase identity ke PostgreSQL. RLS efektif hanya bila runtime role bukan owner relation dan tidak memiliki BYPASSRLS, identity berasal dari authenticated backend state, context bersifat transaction-local, semua protected query memakai Prisma transaction client yang sama, serta negative-path dan connection-pool isolation dibuktikan melalui integration test.

## Decision

Selective RLS diterima sebagai defense-in-depth. Backend authorization tetap mandatory. RLS tidak diaktifkan secara blanket ke seluruh tabel aplikasi.

Runtime PostgreSQL role `surat_runtime` harus NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOBYPASSRLS, dan bukan owner application relation.

Protected Prisma query wajib memakai `RlsContextService`. Module ini membuka interactive transaction, memvalidasi employee/company dan organizational context dari database, mengambil `auth_user_id` dari trusted application/session mapping, menetapkan context dengan `set_config(..., true)`, lalu menjalankan seluruh protected query melalui transaction client yang sama. Transaction client tidak boleh keluar dari callback.

Transaction-local settings P07 adalah `request.jwt.claim.sub`, `app.employee_id`, `app.company_id`, dan `app.office_id`. Session-level `SET` tidak boleh dipakai untuk request identity.

## P07 Proof

`rls_poc_resources` adalah probe read-only yang terpisah dari tabel P03–P06. SELECT dibatasi oleh authenticated employee, company aktif, resource ownership, primary office aktif, dan assignment validity. Query tanpa transaction-local context menghasilkan zero protected rows.

## Security Evidence

- P07-T01: role bukan superuser, bukan BYPASSRLS, bukan owner relation; RLS aktif; runtime hanya memiliki SELECT pada probe.
- P07-T02: User A membaca miliknya, tidak membaca milik User B atau row di office lain; User B tidak membaca milik User A.
- P07-T03: `set_config(..., true)` hilang sesudah COMMIT; physical connection yang sama tidak mewarisi identity; concurrent transactions tidak bertukar identity.

## Performance Evidence

Hasil benchmark aktual tersimpan di `docs/evidence/P07/benchmark.json`. Benchmark membandingkan authorization/scope query tanpa RLS context dengan authorization + interactive transaction + tx-local identity + protected RLS read. p50, p95, delta p95, dan ratio berasal dari environment test, bukan angka hardcoded. Ini directional microbenchmark, bukan production load test. Ulangi pada staging jika jumlah query per request, topology, atau connection strategy berubah.

## Complexity Trade-off

RLS menambah interactive transaction per protected request, identity resolution, `set_config`, keharusan memakai transaction client yang sama, dan SQL policy yang harus diuji. Sebagai imbalan, database membatasi query yang lupa owner/office predicate. Untuk baseline sekitar 100 internal users, kompleksitas ini diterima pada resource sensitif yang membutuhkan row-level isolation.

## Consequences

Selective RLS memberi defense-in-depth terhadap IDOR/query filtering mistake, fail-closed saat identity context tidak ada, dan context yang tidak melekat pada pooled connection. Pola ini dapat dipakai pada Document domain P08+. Developers harus membedakan `PrismaService` dari transaction client; policy SQL menjadi bagian migration review; benchmark dan concurrency test menjadi regression gate.

## Follow-up

P08 memakai `RlsContextService` untuk Document bila ownership/office scope tersedia. `rls_poc_resources` bukan domain bisnis dan dapat dihapus setelah policy Document production memiliki equivalent integration coverage. P40 tetap menjalankan security regression IDOR, RLS, authorization, dan connection-pool isolation.
