# Risk Register

## Surat Digital

**Versi:** 1.3

## 1. Skala penilaian

- Probability: Low / Medium / High.
- Impact: Low / Medium / High / Critical.
- Status: Open / Mitigating / Accepted / Closed.
- `Due` menggunakan milestone/phase agar tidak bergantung pada tanggal kalender.
- Residual risk dinilai setelah mitigasi utama diterapkan.

## 2. Daftar risiko

| ID | Risiko | Probability | Impact | Mitigasi utama | Owner | Status | Due | Residual risk |
|---|---|---|---|---|---|---|---|---|
| R-001 | Pengguna tanpa hak membaca dokumen orang lain | Medium | High | Backend authz, RLS test, IDOR tests, private storage | Backend/Security | Mitigating | P40 | Low |
| R-002 | Secret/service key terekspos frontend/log | Low | Critical | Server-only secret, secret scanning, redacted logs | DevOps | Mitigating | P04 | Low |
| R-003 | Race condition nomor resmi | Medium | Critical | Atomic counter/reservation, concurrency tests | Backend/DBA | Mitigating | P25 | Low |
| R-004 | Dokumen berubah setelah signature | Medium | Critical | Atomic Sign+Submit, canonical manifest hash, version/file lock | Backend | Mitigating | P16/P24 | Low |
| R-005 | Approval sequence dapat dilompati | Medium | Critical | State machine, single ACTIVE guard, concurrency tests | Backend | Mitigating | P18 | Low |
| R-006 | Approval berjalan sebelum Knowing selesai | Medium | High | Acknowledgment gate + E2E negative tests | Backend | Mitigating | P17 | Low |
| R-007 | Office conversion berbeda dari file asli | High | Medium | Preview wajib, fixture corpus, human review | Worker/Product | Open | P33/P34 | Medium |
| R-008 | Worker timeout/resource exhaustion | Medium | High | Container limits, queue, timeouts, file limits | DevOps/Worker | Open | P10/P34 | Medium |
| R-009 | File privat menjadi public | Low | Critical | Private Blob, authenticated access, URL expiry | Backend/Security | Mitigating | P09/P40 | Low |
| R-010 | Stored XSS dari filename/editor/extraction | Medium | High | Encode/sanitize, CSP, security tests | Frontend/Security | Open | P38/P40 | Low |
| R-011 | PIN signature ditebak | Medium | High | Password-grade hash, rate limit, lockout, no PIN oracle | Security | Open | P23 | Low |
| R-012 | TTE internal disalahartikan sebagai PSrE-certified | Medium | High | UI/legal wording, policy/legal review | Product/Legal | Open | Pilot | Medium |
| R-013 | Audit menyimpan PIN/token/raw confidential body | Medium | High | Allowlisted audit fields, redaction | Backend/Security | Open | P32 | Low |
| R-014 | Audit diubah oleh privileged DB actor | Low | High | Application-immutable baseline; optional external/WORM/hash chain for higher assurance | Security/DBA | Accepted | Post-MVP review | Medium |
| R-015 | Notification/email duplicate | Medium | Medium | Outbox + idempotent consumer/delivery key | Backend | Open | P29/P30 | Low |
| R-016 | Backup tidak dapat dipulihkan | Low | Critical | Restore drill + evidence | DevOps | Open | P42 | Low |
| R-017 | Restore melebihi recovery target | Medium | High | RPO/RTO drill, runbook, capacity planning | DevOps | Open | P42 | Medium |
| R-018 | Business rule berubah tanpa dokumentasi | Medium | High | Decision Log, RTM, PR review | Product | Mitigating | Continuous | Low |
| R-019 | Employee nonaktif masih punya session | Medium | High | Backend active check per request + revoke | Backend/IT | Open | P04 | Low |
| R-020 | Final PDF gagal setelah nomor di-reserve | Medium | High | Retry same reservation, FINALIZING monitoring, VOID no-reuse | Backend/Worker | Open | P27 | Low |
| R-021 | Prisma runtime role bypass RLS | Medium | High | Runtime role test, backend authz, ADR | Backend/DBA | Open | P07 | Low/Accepted by ADR |
| R-022 | RLS claim/context bocor antar request | Medium | Critical | tx-local `set_config`, same tx client, concurrency tests | Backend/Security | Open | P07/P40 | Low |
| R-023 | OCR salah mengenali angka/nama | High | Medium | Label OCR, confidence/warning, human review | Product/Worker | Open | P35 | Medium |
| R-024 | Malware/zip bomb masuk parser/converter | Medium | Critical | Mandatory malware scan, quarantine, sandbox, resource limits | Security/Worker | Open | P10 | Low |
| R-025 | LibreOffice gagal karena font/layout | High | Medium | Locked image/fonts, fixture regression | Worker/DevOps | Open | P33/P34 | Medium |
| R-026 | Queue job hilang/duplicate | Medium | Critical | Transactional outbox, reconciliation, idempotency | Backend/Worker | Open | P11 | Low |
| R-027 | Extracted text bocor via search/log | Medium | High | Authz before search, private data, log redaction | Backend/Security | Open | P36/P40 | Low |
| R-028 | Participant resign/permission revoked membuat workflow stuck | Medium | High | Runtime re-check, BLOCKED status, Workflow Recovery | Backend/Product | Open | P20/P21 | Low |
| R-029 | Generic PIN verify endpoint menjadi oracle | Medium | High | Remove reusable verify endpoint, action-bound verification | Backend/Security | Open | P23 | Low |
| R-030 | Auth model drift frontend/backend | Medium | High | NestJS auth gateway + OpenAPI/session ADR | Backend/Frontend | Open | P03/P04 | Low |

| R-031 | Credit double-consumed akibat retry/concurrency | Medium | Critical | Idempotency key, unique constraint, atomic reservation/ledger, concurrency tests | Backend/DBA | Open | P54/P58 | Low |
| R-032 | Credit ledger/projection drift | Medium | High | Reconciliation job, immutable entries, alert, repair via adjustment | Backend/Finance | Open | P53/P58 | Low |
| R-033 | External signing token dicuri/leak | Medium | Critical | High-entropy hashed token, expiry, revoke, no-log, optional OTP | Security/Backend | Open | P49/P50 | Low |
| R-034 | External signer menandatangani version berbeda | Low | Critical | Token/version/manifest binding + locked version | Backend/Security | Open | P50/P51 | Low |
| R-035 | Public verification membocorkan data privat | Medium | High | Metadata allowlist, separate token, no direct Blob exposure | Security/Product | Open | P49/P58 | Low |
| R-036 | Payment callback duplicate/forged memberi credit berlebih | Medium | High | Signature verification, idempotency, amount/currency validation | Backend/Finance | Open | P59 | Low |
| R-037 | Pricing terlalu murah terhadap variable usage | Medium | High | Credit quotas, top-up, unit economics metrics, pricing review | Product/Finance | Mitigating | Pilot | Medium |
| R-038 | Credit expiry/rollover dipersepsikan tidak adil | Medium | Medium | Transparent UI/ledger, 2× rollover cap, 12-month top-up validity | Product | Open | P55–P57 | Low |
| R-039 | Subscription expiry salah membuat dokumen issued tampak invalid | Medium | High | Separate account status vs document validity, regression tests | Backend/Product | Open | P58 | Low |

## 3. Risiko release-blocking

Sebelum production, berikut tidak boleh berstatus Open tanpa accepted exception formal: R-001, R-002, R-003, R-004, R-005, R-006, R-009, R-011, R-013, R-016, R-019, R-020, R-021/R-022 sesuai ADR, R-024, R-026, R-028, R-030, R-031, R-033, R-034, R-035, R-036, R-039.

## 4. Review risiko

Risk register ditinjau pada akhir setiap phase roadmap, sebelum UAT, sebelum production release, setelah incident keamanan, dan setiap perubahan besar workflow/storage/authentication. Status/owner/due/residual risk wajib diperbarui; mitigasi yang belum memiliki test/evidence belum dianggap selesai.
