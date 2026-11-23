# ADR-0003 — Runtime Database Role, Prisma Driver, and RLS Context

Status: Accepted  
Date: 2026-11-21  
Phase: P02 / P07 / P09

## Context

Surat Digital membutuhkan database runtime tanpa privilege migration dan tenant/resource isolation yang tetap efektif bila application-layer query mengalami defect. Hak melihat dan mengunduh dokumen merupakan capability berbeda. Keputusan ini melengkapi [bukti P07 ADR-0002](ADR-0002-prisma-rls-runtime.md).

## Decision

Runtime database menggunakan:

- Prisma 7.10.1 dan @prisma/adapter-pg 7.10.1 yang dipin.
- PostgreSQL runtime role `surat_runtime`, tanpa SUPERUSER atau BYPASSRLS.
- Role migration terpisah; runtime tidak mempunyai migration privilege.
- Row Level Security sebagai defense-in-depth.
- Identity context transaction-local melalui `set_config(..., true)`.

Identity context: `request.jwt.claim.sub`, `app.employee_id`, `app.company_id`, dan `app.office_id`.

Resource-operation context `app.access_purpose` bernilai `DEFAULT`, atau `DOCUMENT_DOWNLOAD` hanya pada transaction pembacaan binary download. Document list, metadata, dan preview memakai normal visibility.

## Document authorization

- Normal visibility: creator atau `Document.ViewAll`.
- Endpoint download membutuhkan `Document.Download` atau `Document.DownloadAll`.
- `Document.Download` tidak memperluas visibility.
- `Document.DownloadAll` memperluas scope company hanya pada transaction `DOCUMENT_DOWNLOAD`; tidak memberikan `Document.ViewAll`.

## Security constraints

Application tidak boleh menggunakan session-level RLS identity, SUPERUSER runtime connection, BYPASSRLS runtime role, atau client-controlled `app.access_purpose`. Semua context dibuat backend dan transaction-local.

## Consequences

Tenant isolation memiliki defense-in-depth, permission View dan Download tetap independen, dan pooled connection tidak membawa identity antar request. Operation khusus membutuhkan explicit RLS context method; integration test wajib memastikan context tidak bocor antar request.

## Closed Open Items

- O-015 — Final runtime DB role dan tx-local RLS implementation.
- O-016 — Versi Prisma/driver adapter yang dipin.

O-003, O-006, dan O-008 telah diputuskan melalui [ADR-0004](ADR-0004-document-limits-worker-hosting.md). O-018 tetap wajib ditutup sebelum P10 selesai.
