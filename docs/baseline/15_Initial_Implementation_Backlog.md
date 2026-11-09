# Initial Implementation Backlog

## Surat Digital

**Versi:** 1.3 — Backlog awal  
**Catatan:** Item adalah backlog kandidat. Estimasi story point dan
penugasan personel dilakukan setelah tim dan kapasitas diketahui.

## 1. Epic overview

| Epic                       | Hasil yang diharapkan                           | Phase |
|----------------------------|-------------------------------------------------|-------|
| E01 — Project Foundation   | Repository, CI, environment, coding standards   | 0–1   |
| E02 — Authentication       | NestJS auth gateway, session, employee mapping   | 1     |
| E03 — Organization         | Company, office, division, employee import      | 1     |
| E04 — Access Control       | Group Policy, permission, RLS                   | 1     |
| E05 — Document Core        | Draft, type, subtype, version, storage metadata | 2     |
| E06 — File Management      | Upload, preview, review, conversion             | 2–3   |
| E07 — Template & Editor    | Template and basic document editor              | 3     |
| E08 — Form Builder         | Dynamic form and versioning                     | 3     |
| E09 — Workflow             | Knowing, sequential approval, reject, withdraw  | 4     |
| E10 — Signature            | Visual and internal signature                   | 4     |
| E11 — Numbering & Issuance | Official number and final PDF                   | 5     |
| E12 — Notification         | In-app and email                                | 5     |
| E13 — Archive & Search     | Search, filters, controlled download            | 5     |
| E14 — Audit                | Append-only audit and export                    | 1–6   |
| E15 — QA & Security        | E2E, RLS, IDOR, performance, UAT                | 6     |
| E16 — Release & Support    | Production, monitoring, backup, user guide      | 7     |

## 2. Sample user stories

### E02 — Authentication

- As an employee, I want to log in with email so that I can access the
  system.

- As an employee, I want to log in with username or NIP so that I can
  use my company identifier.

- As an administrator, I want to activate pending registrations so that
  only verified employees can use the system.

Acceptance:

- Invalid credentials return a generic error.

- Pending/suspended accounts cannot access protected APIs.

- No password is stored in `employees`.

### E03 — Organization

- As an administrator, I want to import employees from Excel so that
  initial onboarding is efficient.

- As an administrator, I want to map divisions to offices so that one
  division can operate in multiple offices.

Acceptance:

- Duplicate employee number/email is reported.

- Import provides row-level validation feedback.

- Office-division relationships are validated.

### E04 — Access Control

- As an administrator, I want to assign several Group Policies to one
  employee.

- As an administrator, I want to assign ALLOW or DENY permission to a
  group.

- As a security owner, I want DENY to override ALLOW.

Acceptance:

- Permission resolver is deterministic.

- Permission changes are audited.
- RLS is tested with the actual Prisma runtime role and transaction context.

- RLS and backend guard produce consistent outcomes.

### E05/E06 — Document Core and Files

- As a Creator, I want to create a draft document.

- As a Creator, I want to upload one file at a time and review each
  file.

- As a Creator, I want one main file and multiple attachments.

- As a Creator, I want Excel to be accepted as a main document or
  attachment.

Acceptance:

- Only the agreed five formats are accepted.

- File is not publicly accessible.

- One MAIN exists per submitted version.

- All files are validated and processed before review.
- Extraction and preview jobs are idempotent and retryable.
- Scanned PDF OCR output is visibly labeled and reviewable.
- All files are reviewed before submit.

- Content hash is stored.

### E09 — Workflow

- As a Creator, I want to select Knowing and Approvers.

- As a Knowing, I want to confirm reading and sign.

- As an Approver, I want to approve and sign when my turn is active.

- As a Creator, I want to withdraw before the first approval.

Acceptance:

- Creator cannot be Knowing or Approver.

- Knowing and Approver cannot be the same person.

- Approval is blocked until all Knowing signatures are complete.

- Only one Approver is active at a time.

- Reject requires reason and is permanent.

- Withdraw requires reason and is blocked after first approval.

### E10 — Signature

- As a signer, I want to choose visual or internal signature per
  document.

- As a signer, I want to register an internal signature profile and PIN.

- As a signer, I want my signature to be bound to the exact canonical Document Manifest
  version.

Acceptance:

- Visual signature evidence is stored securely.

- Internal signature requires active profile and valid PIN.

- PIN never appears in logs.

- Signature record is immutable.

- PDF final contains all required signature blocks.

### E11 — Numbering

- As the system, I want to allocate a number atomically so that
  concurrent issuance cannot create duplicates.

Acceptance:

- Number is unique.

- Counter scope matches type/division/office/month/year.

- Month uses office timezone.

- Retry reuses the same reservation for the same document.

- Rejected/cancelled documents have no official number.

## 3. Priority guide

- P0: security, workflow integrity, data correctness, numbering.

- P1: core document creation, upload, signature, notification.

- P2: advanced search, reports, UX refinements.

- P2: OCR bulk/backfill for historical archive, advanced extraction/indexing.
- P3: PSrE integration, SSO, mobile app, multi-company.

## 4. Backlog refinement checklist

For each story:

- Business rule is documented.

- UI state is defined.

- API contract is defined.

- Database impact is known.

- Permission is identified.

- Audit event is identified.

- Acceptance criteria are testable.

- Error and retry states are defined.


## 5. Prisma foundation acceptance

- `schema.prisma` covers the approved application ERD.
- Prisma Migrate builds an empty database and upgrades an existing development database.
- PostgreSQL-specific SQL (RLS, triggers, functions, partial indexes) is versioned in Prisma migration files.
- Prisma Seed is repeatable/idempotent.
- Runtime and migration database roles are separated.
- Prisma runtime role does not bypass RLS if RLS is expected to constrain its queries.
- Per-user transactions set verified identity context and use the same transaction client for protected queries.

## 6. Document processing acceptance

- Supported file types are validated by extension, MIME, and file signature.
- Original file is preserved in private Vercel Blob storage.
- Text and structural extraction is available for supported digital files.
- Scanned PDF uses OCR fallback when appropriate.
- Office documents generate a preview PDF through the worker.
- User review is required before submit.
- Job retry is bounded, observable, and idempotent.
- Parser/converter failures do not lose original uploads or expose sensitive content.


## 7. Epics tambahan v1.3

| Epic | Scope | Roadmap |
|---|---|---|
| E16 — Document Integrity | Canonical manifest, deterministic hash, atomic Creator Sign+Submit | P15–P16 |
| E17 — Reliability Outbox | `outbox_events`, dispatcher, reconciliation, idempotent consumers | P11 |
| E18 — Workflow Recovery | Runtime permission re-check, BLOCKED task, `Workflow.Repair` | P20–P21 |
| E19 — Security Processing | Mandatory malware scan, quarantine, preview/CSP/XSS hardening | P10, P40 |
| E20 — API Contract | OpenAPI source of truth, generated client/types, contract CI | P03 onward |
| E21 — Finalization Integrity | Number reservation before render, retry same reservation, VOID | P25–P27 |

### Acceptance highlights

- Tidak ada endpoint/state terpisah yang meninggalkan Creator signature pada Draft editable.
- Perubahan attachment setelah manifest dibuat mengubah manifest hash.
- Outbox recovery membuktikan queue outage setelah DB commit tidak menghilangkan job.
- Workflow Recovery membutuhkan permission + reason dan tidak menghapus historical action/signature.
- Malware scanner PASS merupakan precondition parser/converter.
- Generated API client tidak boleh drift dari OpenAPI dalam CI.

## 8. Epics v1.3 — Verify & Sign Commercialization

| Epic | Scope | Roadmap |
|---|---|---|
| E22 — External Signing Domain | Public capability token, signer request, revoke/expiry, version binding | P49 |
| E23 — External Signing Execution | Challenge/OTP, review, external signature, idempotency | P50–P51 |
| E24 — Credit Data Model | Plans, subscription, wallet, lots, ledger, reservations | P52–P53 |
| E25 — Credit Transaction Engine | Reserve/consume/release, concurrency, reconciliation | P54 |
| E26 — Subscription Lifecycle | Allocation, rollover, trial | P55 |
| E27 — Top-up & Expiry | Top-up lot, expiry, admin grant/reversal | P56 |
| E28 — Billing UX | Credit summary/history, low balance, top-up UI | P57 |
| E29 — Commercial E2E | External sign + QR + credit/accounting failure injection | P58 |
| E30 — Payment Operations | Payment adapter/manual confirmation, callback idempotency, runbook | P59 |

### Acceptance highlights v1.3

- External signer tidak membutuhkan paid account dan tidak dapat mengakses internal resources.
- Satu signer slot me-reserve satu credit sebelum invitation aktif.
- Completed signature menghasilkan tepat satu consume; revoke/expiry menghasilkan release.
- QR-only issue mengonsumsi satu credit; QR scan selalu zero-credit.
- Document dengan N successful external signer tidak ditagih base+N; total adalah `max(1, N)`.
- Concurrent reservation tidak membuat saldo negatif.
- Credit ledger dapat direkonsiliasi dan historical entry tidak diedit.
- Subscription rollover, top-up expiry, trial expiry, dan duplicate payment callback memiliki automated test.
