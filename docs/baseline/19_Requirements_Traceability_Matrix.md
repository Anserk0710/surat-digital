# Requirements Traceability Matrix

## Surat Digital

**Versi:** 1.3
**Status:** Baseline traceability; diperbarui pada setiap phase

## 1. Tujuan

RTM menghubungkan kebutuhan produk/SRS dengan business rule, API, data model, test, dan backlog/roadmap. Tujuannya mencegah requirement “ada di dokumen tetapi hilang di implementasi” dan memudahkan impact analysis saat aturan berubah.

## 2. Matrix requirement kritis

| Requirement | Business rule / design | API | Database | Test | Backlog / Phase |
|---|---|---|---|---|---|
| PR-05 / FR-WF-001 | Atomic Creator Sign+Lock+Submit | `POST /documents/:id/submit` | `document_versions`, `document_signatures`, `document_actions`, `outbox_events` | INT-001 | E16 / P16 |
| PR-17 / FR-SIG-008 | Canonical Document Manifest | submit + verification | `document_versions.document_manifest_hash`, file hashes | INT-002, signature verification | E16 / P15,P24 |
| FR-WF-007 | Semua Knowing selesai sebelum approval | `/knowing/confirm` | `document_participants` | workflow acknowledgment gate | E09 / P17 |
| FR-WF-009/010 | Sequential approve+sign | `/approvals/approve` | participants/signatures/actions | concurrency + active approver | E09/E10 / P18 |
| FR-WF-014/015 | Withdraw hanya sebelum approval pertama | `/withdraw` | documents/actions | UAT withdraw | E09 / P19 |
| FR-WF-004A/017/018 | Runtime permission re-check + recovery | action endpoints + `/workflow/recover` | participants, `workflow_recovery_actions`, audit | WF-REC-001/002, PERM-001 | E18 / P20,P21 |
| FR-NUM-002/007/008 | Reserve number before render; retry same/VOID | internal finalization | counters/numberings/outbox | numbering concurrency + INT-004/005 | E21 / P25–P27 |
| FR-REL-001/002 | Transactional outbox | internal dispatcher | `outbox_events` | INT-003 | E17 / P11 |
| FR-FILE-001/002 | Mandatory malware scan fail-closed | upload/processing status | file/job scan status | FILE-SEC-001/002 | E19 / P10 |
| FR-API-001 | OpenAPI source of truth | all | n/a | API-001/CI | E20 / P03+ |
| FR-API-002 | NestJS auth gateway | `/auth/*` | employee↔auth mapping | auth negative/session tests | E02/E20 / P03,P04 |
| FR-API-003 | No reusable PIN oracle | signature action endpoints | signature profile | PIN-001 | E10/E19 / P23 |
| FR-AUD-001/002/003 | Application-immutable audit | audit endpoints | `audit_logs` | audit redaction/permission | E13 / P32 |
| NFR-011 | p95 common API/search target | list/search endpoints | indexes | performance suite | E15 / P41 |
| NFR-012 | WCAG 2.2 AA core flow | UI | n/a | accessibility checks | E15 / P40,P45 |
| NFR-014 | RPO/RTO baseline | ops | backup data | restore drill | E14/E15 / P42 |
| NFR-016 | Observability | internal metrics | operational state | alert tests | E14 / P43 |
| PR-21 / FR-VER-001–004 | QR verification zero-credit + status validity | `GET /verify/:token` | verification tokens + document status | VER-001–005 | E22/E29 / P49,P58 |
| PR-22 / FR-EXT-001–008 | Purpose-bound External Signing | `/external-signing-requests`, `/public/external-sign/*` | `external_signing_requests`, signatures | EXT-001–009 | E22/E23 / P49–P51 |
| PR-23 / FR-BILL-001–004 | Credit-based company subscription | `/billing/*` | plans/subscriptions/wallet/lots/ledger | BILL-007–014 | E24/E26 / P52–P56 |
| PR-24 / FR-BILL-005–007/011–013 | Reserve→consume/release, no technical double charge | external sign/issue transaction | reservations/ledger/lots | BILL-001–006, BILL-014–015 | E25/E29 / P54,P58 |
| PR-25 / FR-BILL-008–010/014–015 | Rollover/top-up/trial/history/admin correction | `/billing/*` | lots/ledger/subscription | BILL-008–013 | E26–E30 / P55–P59 |
| NFR-017/018 | Credit concurrency + reconciliation | billing internal | wallet/lots/ledger/reservations | BILL-004/012 | E25/E29 / P54,P58 |
| NFR-019/020 | Public token & verification abuse resistance | public endpoints | token/request state | EXT-002/008/009, VER-003/004 | E22/E23/E29 / P49–P50,P58 |

## 3. Coverage rules

- Semua `Must` SRS harus memiliki minimal satu test reference sebelum UAT.
- Requirement yang mengubah persistent state harus memiliki data model/transaction mapping.
- Requirement security harus memiliki negative-path test.
- Requirement async/retry harus memiliki idempotency/failure-injection test.
- Perubahan requirement harus memperbarui minimal SRS/PRD, RTM, Decision Log (bila keputusan), API/DB contract, dan test/backlog terkait.

## 4. Status coverage

Gunakan nilai `Planned`, `Implemented`, `Tested`, `Accepted`. Status tidak diisi secara fiktif di dokumentasi baseline; tim memperbaruinya ketika evidence implementasi tersedia.
