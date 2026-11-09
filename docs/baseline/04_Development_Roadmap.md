# Development Roadmap

## Surat Digital
**Versi:** 1.4 — Phase Execution Roadmap (8/12-hour timeboxes)  
**Status:** Implementation roadmap & execution guide
## 1. Tujuan roadmap

Roadmap v1.4 mempertahankan pembagian pekerjaan menjadi phase kecil **8 atau 12 jam fokus engineering**, tetapi setiap phase kini diperlakukan sebagai unit eksekusi yang lengkap. Setiap phase memiliki **Goal, Dependencies, Pekerjaan/Scope, Deliverables, Test/Verification, dan Exit Criteria** sehingga developer dapat mengetahui dengan jelas apa yang harus dibuat dan bukti apa yang diperlukan sebelum phase dianggap selesai.

Timebox adalah unit perencanaan, bukan janji kalender. Code review lintas tim, approval bisnis, waktu menunggu provider/procurement, incident, dan blocked dependency tidak dihitung sebagai fokus engineering kecuali memang menjadi scope phase tersebut. Jika scope phase tidak dapat selesai dalam timebox, scope harus dipecah atau decision dicatat; phase tidak boleh dianggap selesai hanya karena jamnya habis.
## 2. Aturan eksekusi phase

- Satu phase hanya boleh memiliki satu tujuan arsitektur/produk utama.
- Semua item pada **Pekerjaan/Scope** adalah pekerjaan yang direncanakan dalam phase tersebut.
- Semua **Test/Verification** wajib memiliki evidence: automated test, query/result, screenshot, benchmark, migration log, atau sign-off sesuai jenis test.
- Phase berikutnya boleh berjalan paralel hanya jika dependency dan shared migration/API contract tidak konflik.
- Phase blocker tidak boleh ditutup dengan TODO yang memengaruhi integrity, security, billing correctness, atau data loss.
- Perubahan API/OpenAPI, Prisma schema/migration, UI contract, Decision Log, dan RTM harus diperbarui pada phase yang mengubahnya.
- Temuan Critical/High security/integrity atau mismatch ledger memblokir release sampai dimitigasi atau diterima secara formal sesuai governance.
## 3. Roadmap ringkas

| Phase | Jam | Fokus | Goal singkat | Exit criteria |
|---|---:|---|---|---|
| P00 | 8 | Baseline & traceability | Membekukan baseline requirement dan memastikan seluruh pekerjaan implementasi dapat ditelusuri dari requirement hingga test. | Semua Must requirement memiliki owner/trace awal |
| P01 | 8 | Repository bootstrap | Menyediakan repository yang reproducible dan CI minimum agar seluruh phase berikutnya memiliki quality gate yang konsisten. | Build/lint/test berjalan di CI |
| P02 | 12 | Prisma/Supabase foundation | Membangun fondasi database Prisma/Supabase yang dapat dimigrasikan, di-seed, dan dipisahkan antara role runtime dan migrat... | Migration clean pada DB kosong + seed idempotent |
| P03 | 12 | Auth gateway POC | Membuktikan NestJS dapat menjadi satu-satunya auth gateway browser ke Supabase Auth. | Browser tidak memerlukan direct Supabase Auth; session lifecycle diuji |
| P04 | 8 | Auth hardening | Mengeraskan boundary autentikasi terhadap brute force, session abuse, dan konfigurasi browser yang salah. | Negative auth tests lolos |
| P05 | 8 | Organization master | Menyediakan master organisasi yang valid sebagai dasar authorization, numbering, dan workflow. | CRUD + integrity tests lolos |
| P06 | 12 | Group Policy | Membangun evaluator Group Policy yang deterministik dengan precedence Deny di atas Allow. | Deny precedence + permission tests lolos |
| P07 | 12 | RLS runtime POC | Membuktikan strategi RLS tambahan pada Prisma aman dan layak secara performa/kompleksitas sebelum dijadikan baseline. | Hasil security/performance/complexity terdokumentasi; ADR strategi RLS ditutup |
| P08 | 8 | Document master | Menyediakan domain dokumen minimum untuk membuat, membaca, dan mengubah Draft sebelum file/workflow ditambahkan. | Draft create/read/update sesuai permission |
| P09 | 12 | Storage upload | Membangun upload file privat yang memiliki metadata integrity dan tidak dapat diakses tanpa authorization. | Unauthorized file access gagal |
| P10 | 8 | Malware gate | Memastikan tidak ada parser/converter memproses file sebelum malware scanning dinyatakan PASS. | Parser tidak berjalan sebelum scan PASS |
| P11 | 12 | Queue + transactional outbox | Menjamin event/job tidak hilang saat transaksi database berhasil tetapi queue/dispatcher gagal. | DB commit + queue outage dapat dipulihkan tanpa duplicate effect |
| P12 | 8 | PDF digital processing | Mendukung PDF digital sebagai format Core MVP dengan ekstraksi teks dan preview yang stabil. | Fixture PDF digital lolos |
| P13 | 8 | Document review UI | Memberi pengguna mekanisme review eksplisit agar file hasil processing dikonfirmasi sebelum digunakan untuk submit. | File wajib reviewed sebelum submit |
| P14 | 12 | Participant selection | Membangun konfigurasi participant workflow yang valid sebelum dokumen dikunci. | Overlap/self-assignment ditolak |
| P15 | 8 | Canonical Document Manifest | Mendefinisikan identitas integrity dokumen secara deterministik melalui Canonical Document Manifest. | Hash deterministic pada fixture dan berubah jika file/metadata integrity berubah |
| P16 | 12 | Creator Sign + Submit | Menghilangkan race window antara Creator signature dan submit dengan satu transaksi bisnis atomik. | Tidak ada state “signed Draft”; duplicate request idempotent |
| P17 | 12 | Knowing workflow | Mengimplementasikan Knowing acknowledgment paralel yang wajib selesai sebelum approval dimulai. | Approval blocked sampai semua Knowing selesai |
| P18 | 12 | Sequential Approval | Mengimplementasikan sequential approval dengan tepat satu approver ACTIVE pada satu waktu. | Concurrency test tidak menghasilkan dua active approver |
| P19 | 8 | Reject & Withdraw | Menyediakan jalur Reject dan Withdraw yang memiliki state guard dan alasan audit yang jelas. | State guards + reason audit lolos |
| P20 | 8 | Runtime permission re-check | Memastikan participant yang dipilih saat submit tetap harus memenuhi authorization terkini ketika bertindak. | Revoked/suspended participant tidak dapat bertindak |
| P21 | 12 | Workflow Recovery | Mencegah dokumen stuck permanen ketika participant tidak lagi dapat bertindak melalui recovery yang auditable. | Replacement teraudit, history/signature lama tidak berubah |
| P22 | 8 | Visual signature | Mendukung visual signature evidence secara privat tanpa menjadikannya reusable profile asset yang berisiko. | Evidence private dan tidak reusable sebagai profile |
| P23 | 12 | Internal signature PIN | Menyediakan PIN signing internal dengan penyimpanan aman dan kontrol brute-force. | PIN tidak muncul di log; brute-force controls lolos |
| P24 | 8 | Signature verification | Menyediakan verifikasi integrity signature terhadap version dan document_manifest_hash. | Tampered file/manifest gagal verifikasi |
| P25 | 12 | Number reservation | Menyediakan reservasi nomor surat yang atomic, timezone-aware, dan aman terhadap concurrency. | High-concurrency numbering test unik |
| P26 | 12 | Finalization worker | Membangun finalization worker yang menghasilkan PDF final dari version terkunci dan nomor yang sudah di-reserve. | PDF final memakai nomor reservation yang benar |
| P27 | 8 | Finalization recovery | Menjamin kegagalan finalization dapat dipulihkan tanpa membuat nomor baru atau mendaur ulang nomor VOID. | Retry tidak membuat nomor baru; VOID tidak reused |
| P28 | 8 | Verification token/page | Menyediakan public verification token/page yang memverifikasi dokumen tanpa membocorkan dokumen privat. | Token tidak membocorkan dokumen privat |
| P29 | 8 | Notifications | Menyediakan notification domain event-driven tanpa duplicate user-visible notification. | Duplicate outbox tidak menggandakan user-visible notification |
| P30 | 8 | Email delivery | Menyediakan email delivery adapter yang retryable dan tidak memblokir transaksi workflow. | Failure/retry tercatat tanpa blocking workflow |
| P31 | 12 | Archive & metadata search | Menyediakan archive dan metadata search yang authorized dan performant untuk dokumen yang dapat diakses user. | Authorization + p95 target awal tercapai |
| P32 | 8 | Audit hardening | Mengeraskan audit log agar application-immutable, terstruktur, minim data sensitif, dan dapat diekspor oleh role berizin. | PIN/token/content sensitif tidak masuk audit |
| P33 | 12 | Office conversion POC | Membuktikan kualitas dan batasan konversi Office sebelum jalur production diaktifkan. | Fidelity limitations terdokumentasi dan acceptable |
| P34 | 12 | Office processing production path | Mengubah POC Office conversion menjadi pipeline production yang dibatasi resource dan dapat diretry. | Retry/dead-letter/resource limits diuji |
| P35 | 8 | OCR fallback | Menyediakan OCR fallback untuk PDF scan dengan label human-review sehingga hasil OCR tidak dianggap authoritative. | OCR result tidak dianggap authoritative |
| P36 | 12 | Extraction/full-text | Menyediakan full-text extraction/search yang tetap tunduk pada authorization dokumen. | Extracted text tidak bocor lintas permission |
| P37 | 12 | Template versioning | Menyediakan template yang versioned dan provenance-nya tersimpan pada dokumen. | Document menyimpan template-version provenance |
| P38 | 12 | Basic editor | Menyediakan basic editor dengan content model yang dapat disanitasi dan dipreview secara aman. | Stored XSS tests lolos |
| P39 | 12 | Form Builder | Menyediakan Form Builder versioned yang submission-nya dapat ditelusuri ke dokumen/version hasil. | Submission dapat ditelusuri ke version/document |
| P40 | 12 | Security hardening | Menutup Critical/High security gap pada seluruh attack surface Core/Full MVP. | Tidak ada Critical/High open |
| P41 | 8 | Performance & capacity | Membuktikan API/search utama memenuhi baseline latency dan capacity yang dapat dioperasikan. | NFR p95 baseline tercapai atau exception disetujui |
| P42 | 8 | Backup/restore | Membuktikan backup dapat direstore sesuai target RPO/RTO, bukan hanya dikonfigurasi. | RPO/RTO baseline dibuktikan dengan evidence |
| P43 | 8 | Observability | Menyediakan observability dan alert yang cukup untuk mendeteksi kegagalan queue, outbox, finalization, auth, dan storage. | Alert test dan runbook tersedia |
| P44 | 12 | End-to-end regression | Menyediakan regression suite end-to-end untuk critical path, concurrency, dan failure injection sebelum UAT. | Release suite hijau |
| P45 | 12 | UAT | Memvalidasi sistem terhadap proses bisnis nyata melalui UAT yang memiliki owner dan sign-off. | Sign-off pemilik proses |
| P46 | 8 | Release remediation | Menutup seluruh release blocker hasil UAT/security/performance tanpa memperkenalkan regression baru. | Tidak ada release blocker terbuka |
| P47 | 8 | Pilot readiness | Menyiapkan deployment, support, dan user enablement untuk pilot yang dapat dioperasikan. | Go/no-go checklist lengkap |
| P48 | 12 | Core pilot validation | Membuktikan Core MVP bekerja di pilot environment dengan monitoring dan rollback evidence nyata. | Core pilot acceptance tercatat |
| P49 | 8 | External Signing domain | Membuat capability External Signing yang aman tanpa memberi external recipient akses internal. | Capability tidak memberi internal access; token security tests lolos |
| P50 | 12 | External Signing execution | Menyelesaikan External Signing end-to-end dengan challenge/consent dan signature yang terikat ke version terkunci. | Successful sign binds locked version/manifest; retry idempotent |
| P51 | 8 | External Sign + verification integration | Mengintegrasikan hasil External Signing ke final document dan QR verification tanpa mengenakan credit untuk scan QR. | External signature dapat diverifikasi; QR scan zero-credit |
| P52 | 8 | Billing schema & plan catalog | Menyediakan schema komersial yang eksplisit untuk plan, subscription, wallet, lot, ledger, reservation, dan billing transa... | Migration + constraints + seed plan baseline lolos |
| P53 | 12 | Credit ledger & lot engine | Membangun credit ledger dan lot engine yang deterministic, auditable, dan dapat direbuild menjadi balance projection. | Ledger deterministic dan projection dapat direbuild |
| P54 | 12 | Credit reservation engine | Menjamin credit tidak double-spend pada concurrency dengan lifecycle reserve → consume/release yang idempotent. | Last-credit race menghasilkan satu success; no double debit |
| P55 | 8 | Subscription allocation & rollover | Mengotomasi monthly allocation, rollover 2-cycle/2× cap, dan trial 50 credit/30 hari secara idempotent. | Scheduler idempotent; rollover/expiry/trial tests lolos |
| P56 | 8 | Top-up & expiry | Menyediakan top-up 12 bulan serta admin grant/reversal yang auditable dan tidak merusak ledger. | Expiry/reversal teraudit dan deterministic |
| P57 | 8 | Billing UX | Membuat credit economy dapat dipahami user sebelum melakukan tindakan yang berbiaya. | User memahami available/reserved dan cost sebelum action |
| P58 | 12 | Commercial E2E & reconciliation | Membuktikan External Signing, QR, dan credit accounting konsisten pada happy path maupun failure/retry. | EXT/VER/BILL mandatory suite hijau; no reconciliation mismatch |
| P59 | 8 | Payment/operations adapter | Menyiapkan adapter payment/operational flow yang idempotent dan aman untuk commercial launch. | Duplicate/forged callback tests; commercial ops checklist lengkap |

**Total fokus engineering baseline:** 596 jam. Seluruh phase bernilai 8 atau 12 jam. Sizing tetap harus dikalibrasi berdasarkan velocity dan evidence pilot.

## 4. Phase Execution Cards

## 4.A Foundation & Architecture

### P00 — Baseline & traceability (8 jam)

**Goal**  
Membekukan baseline requirement dan memastikan seluruh pekerjaan implementasi dapat ditelusuri dari requirement hingga test.

**Dependencies**
- Dokumentasi v1.3 tersedia dan telah disetujui sebagai baseline awal.

**Pekerjaan / Scope**
- Review seluruh requirement Must/Should dan tandai owner domain teknisnya.
- Sinkronkan PRD, SRS, backlog, Decision Log, dan Requirements Traceability Matrix (RTM).
- Definisikan release gates, severity blocker, dan format evidence per phase.
- Catat gap requirement yang belum punya API/data/test coverage.

**Deliverables**
- Freeze v1.2, RTM awal, release gates.
- Evidence test/verification P00 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P00-T01 — Setiap requirement Must memiliki minimal satu owner dan trace ke backlog/test atau alasan eksplisit belum tersedia.
- [ ] P00-T02 — Tidak ada duplicate requirement ID atau Decision ID.
- [ ] P00-T03 — Release gate dan blocker criteria dapat ditemukan dari roadmap tanpa interpretasi tambahan.

**Exit Criteria**  
Semua Must requirement memiliki owner/trace awal.

### P01 — Repository bootstrap (8 jam)

**Goal**  
Menyediakan repository yang reproducible dan CI minimum agar seluruh phase berikutnya memiliki quality gate yang konsisten.

**Dependencies**
- P00 selesai.

**Pekerjaan / Scope**
- Bootstrap npm workspace/monorepo sesuai struktur proyek.
- Konfigurasikan TypeScript, lint, formatter, unit test runner, dan environment template.
- Buat CI skeleton untuk install, build, lint, dan test.
- Pastikan package-lock.json menjadi lockfile resmi.

**Deliverables**
- npm workspace, lint, test, CI skeleton.
- Evidence test/verification P01 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P01-T01 — Fresh clone + npm ci berhasil tanpa perubahan lockfile.
- [ ] P01-T02 — Build, lint, dan test berjalan sukses di CI.
- [ ] P01-T03 — Commit dengan lint/test failure membuat CI gagal.

**Exit Criteria**  
Build/lint/test berjalan di CI.

### P02 — Prisma/Supabase foundation (12 jam)

**Goal**  
Membangun fondasi database Prisma/Supabase yang dapat dimigrasikan, di-seed, dan dipisahkan antara role runtime dan migration.

**Dependencies**
- P01 selesai.

**Pekerjaan / Scope**
- Buat schema Prisma awal untuk entitas fondasi.
- Konfigurasikan DATABASE_URL/DIRECT_URL dan role migration/runtime.
- Buat migration awal serta seed master data yang idempotent.
- Dokumentasikan local/staging reset dan migration workflow.

**Deliverables**
- schema awal, migration, seed, runtime/migration roles.
- Evidence test/verification P02 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P02-T01 — Database kosong dapat dimigrasikan hingga latest tanpa manual patch.
- [ ] P02-T02 — Seed dapat dijalankan dua kali tanpa duplikasi/constraint failure.
- [ ] P02-T03 — Runtime role tidak memiliki privilege schema migration.
- [ ] P02-T04 — Prisma generate dan smoke query berhasil.

**Exit Criteria**  
Migration clean pada DB kosong + seed idempotent.

### P03 — Auth gateway POC (12 jam)

**Goal**  
Membuktikan NestJS dapat menjadi satu-satunya auth gateway browser ke Supabase Auth.

**Dependencies**
- P02 selesai.

**Pekerjaan / Scope**
- Implementasikan login, refresh, logout, dan /me pada NestJS.
- Implementasikan resolver Email/Username/NIP ke identity Supabase Auth.
- Tentukan storage session/cookie atau bearer flow sesuai ADR.
- Petakan auth_user_id ke employee internal.

**Deliverables**
- NestJS login/refresh/logout/me ke Supabase Auth.
- Evidence test/verification P03 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P03-T01 — Login valid mengembalikan session yang dapat digunakan ke endpoint /me.
- [ ] P03-T02 — Browser tidak membutuhkan Supabase credential/SDK untuk login aplikasi.
- [ ] P03-T03 — Refresh menghasilkan session baru dan logout/revoke membuat session lama tidak berlaku.
- [ ] P03-T04 — Username/NIP invalid tidak membocorkan apakah account ada.

**Exit Criteria**  
Browser tidak memerlukan direct Supabase Auth; session lifecycle diuji.

### P04 — Auth hardening (8 jam)

**Goal**  
Mengeraskan boundary autentikasi terhadap brute force, session abuse, dan konfigurasi browser yang salah.

**Dependencies**
- P03 selesai.

**Pekerjaan / Scope**
- Tambahkan rate limit dan generic authentication errors.
- Implementasikan suspend/revoke behavior dan session invalidation.
- Tetapkan CORS, CSRF, cookie flags, session expiry, dan trusted origins.
- Tambahkan structured auth logging tanpa secret/token.

**Deliverables**
- rate limit, generic errors, revoke/suspend behavior, CSRF/CORS policy.
- Evidence test/verification P04 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P04-T01 — Brute-force/rate-limit test memblokir request berlebih sesuai policy.
- [ ] P04-T02 — Suspended employee tidak dapat membuat session baru dan session aktif ditolak sesuai policy.
- [ ] P04-T03 — CORS/CSRF negative tests gagal secara aman.
- [ ] P04-T04 — Log tidak mengandung password, refresh token, access token, atau PIN.

**Exit Criteria**  
Negative auth tests lolos.

### P05 — Organization master (8 jam)

**Goal**  
Menyediakan master organisasi yang valid sebagai dasar authorization, numbering, dan workflow.

**Dependencies**
- P02 selesai; P03/P04 tersedia untuk authorization endpoint.

**Pekerjaan / Scope**
- Implementasikan Company, Office, Division, dan employee assignment.
- Tambahkan offices.timezone menggunakan IANA timezone.
- Buat CRUD API dan validation untuk relasi organisasi.
- Tambahkan seed organisasi development.

**Deliverables**
- company/offices/divisions/assignments + `offices.timezone`.
- Evidence test/verification P05 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P05-T01 — CRUD valid mengikuti permission.
- [ ] P05-T02 — Invalid office/division relation ditolak constraint/domain validation.
- [ ] P05-T03 — Timezone non-IANA ditolak.
- [ ] P05-T04 — Deaktivasi master yang masih direferensikan mengikuti rule yang didokumentasikan.

**Exit Criteria**  
CRUD + integrity tests lolos.

### P06 — Group Policy (12 jam)

**Goal**  
Membangun evaluator Group Policy yang deterministik dengan precedence Deny di atas Allow.

**Dependencies**
- P05 selesai.

**Pekerjaan / Scope**
- Implementasikan groups, group memberships, permissions, Allow/Deny policy.
- Buat effective-permission evaluator yang reusable pada backend guard/service.
- Tambahkan permission cache hanya jika correctness tetap terjaga.
- Dokumentasikan permission naming convention.

**Deliverables**
- groups, Allow/Deny, effective permission evaluator.
- Evidence test/verification P06 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P06-T01 — Allow tunggal memberi akses.
- [ ] P06-T02 — Deny mengalahkan Allow dari group lain.
- [ ] P06-T03 — User tanpa policy tidak mendapat akses default.
- [ ] P06-T04 — Perubahan membership/policy tercermin sesuai cache invalidation strategy.

**Exit Criteria**  
Deny precedence + permission tests lolos.

### P07 — RLS runtime POC (12 jam)

**Goal**  
Membuktikan strategi RLS tambahan pada Prisma aman dan layak secara performa/kompleksitas sebelum dijadikan baseline.

**Dependencies**
- P02 dan P06 selesai.

**Pekerjaan / Scope**
- Buat runtime DB role non-BYPASSRLS.
- Implementasikan transaction-local identity context untuk query yang dilindungi RLS.
- Tulis policy minimum dan cross-user/cross-office test.
- Benchmark authorization-only vs authorization+RLS dan tutup ADR berdasarkan evidence.

**Deliverables**
- runtime DB role, tx-local identity context, cross-user tests, benchmark authz-only vs authz+RLS.
- Evidence test/verification P07 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P07-T01 — Runtime role tidak memiliki BYPASSRLS.
- [ ] P07-T02 — User A tidak dapat membaca resource User B melalui query Prisma yang dilindungi.
- [ ] P07-T03 — Context request tidak bocor ke request berikutnya pada connection pool.
- [ ] P07-T04 — Benchmark p95 dan complexity trade-off terdokumentasi.

**Exit Criteria**  
Hasil security/performance/complexity terdokumentasi; ADR strategi RLS ditutup.

## 4.B Document Core & Integrity

### P08 — Document master (8 jam)

**Goal**  
Menyediakan domain dokumen minimum untuk membuat, membaca, dan mengubah Draft sebelum file/workflow ditambahkan.

**Dependencies**
- P05–P07 selesai atau authorization strategy sudah diputuskan.

**Pekerjaan / Scope**
- Implementasikan document types/subtypes dan document draft entity.
- Buat create/read/update draft API dan DTO/OpenAPI.
- Terapkan ownership/office/division permission.
- Tambahkan optimistic concurrency/version field bila diperlukan.

**Deliverables**
- types/subtypes + draft document API.
- Evidence test/verification P08 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P08-T01 — User berizin dapat membuat dan mengubah Draft.
- [ ] P08-T02 — User tanpa akses menerima 403/404 sesuai policy anti-enumeration.
- [ ] P08-T03 — Invalid type/subtype combination ditolak.
- [ ] P08-T04 — Non-Draft document tidak dapat diedit melalui draft endpoint.

**Exit Criteria**  
Draft create/read/update sesuai permission.

### P09 — Storage upload (12 jam)

**Goal**  
Membangun upload file privat yang memiliki metadata integrity dan tidak dapat diakses tanpa authorization.

**Dependencies**
- P08 selesai.

**Pekerjaan / Scope**
- Implementasikan upload satu-per-satu ke Vercel Blob/private storage abstraction.
- Validasi filename, extension, MIME/signature, size, dan hash SHA-256.
- Simpan metadata file dan ownership/version relation.
- Implementasikan authenticated download/preview access path.

**Deliverables**
- private Blob metadata, upload one-by-one, hash.
- Evidence test/verification P09 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P09-T01 — File valid tersimpan beserta hash dan metadata.
- [ ] P09-T02 — Extension/MIME/signature mismatch ditolak.
- [ ] P09-T03 — Unauthorized user tidak dapat mengakses file lewat URL/API.
- [ ] P09-T04 — Hash hasil download sama dengan metadata yang disimpan.

**Exit Criteria**  
Unauthorized file access gagal.

### P10 — Malware gate (8 jam)

**Goal**  
Memastikan tidak ada parser/converter memproses file sebelum malware scanning dinyatakan PASS.

**Dependencies**
- P09 selesai.

**Pekerjaan / Scope**
- Buat scanner adapter dan status PENDING/PASS/QUARANTINED/FAILED.
- Implementasikan quarantine/fail-closed behavior.
- Blokir processing pipeline sebelum scan PASS.
- Tambahkan retry/timeout dan audit event scan.

**Deliverables**
- scanner adapter, quarantine, fail-closed policy.
- Evidence test/verification P10 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P10-T01 — Fixture aman berstatus PASS dan dapat diproses.
- [ ] P10-T02 — Fixture EICAR/test-malware masuk quarantine dan tidak diteruskan ke parser.
- [ ] P10-T03 — Scanner timeout/error tidak fail-open.
- [ ] P10-T04 — Manual bypass tanpa permission tidak tersedia.

**Exit Criteria**  
Parser tidak berjalan sebelum scan PASS.

### P11 — Queue + transactional outbox (12 jam)

**Goal**  
Menjamin event/job tidak hilang saat transaksi database berhasil tetapi queue/dispatcher gagal.

**Dependencies**
- P02 selesai; domain event pertama tersedia.

**Pekerjaan / Scope**
- Tambahkan outbox_events dan publisher/dispatcher.
- Tuliskan outbox di transaksi yang sama dengan perubahan domain.
- Implementasikan retry, status, attempt_count, last_error, dan reconciliation.
- Buat idempotency key pada consumer yang relevan.

**Deliverables**
- outbox table, dispatcher, reconciliation, idempotency.
- Evidence test/verification P11 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P11-T01 — DB commit saat queue down tetap meninggalkan event yang dapat dipublish kemudian.
- [ ] P11-T02 — Duplicate publish tidak menghasilkan duplicate side effect.
- [ ] P11-T03 — Failed event dapat direconcile setelah dependency pulih.
- [ ] P11-T04 — Outbox stuck/age dapat diobservasi.

**Exit Criteria**  
DB commit + queue outage dapat dipulihkan tanpa duplicate effect.

### P12 — PDF digital processing (8 jam)

**Goal**  
Mendukung PDF digital sebagai format Core MVP dengan ekstraksi teks dan preview yang stabil.

**Dependencies**
- P09–P11 selesai.

**Pekerjaan / Scope**
- Validasi PDF dan page count/size limits.
- Ekstrak text layer untuk PDF digital.
- Buat preview derivative yang aman.
- Simpan processing status/result tanpa mengubah original.

**Deliverables**
- validate/extract/preview PDF.
- Evidence test/verification P12 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P12-T01 — Corpus PDF digital valid selesai diproses.
- [ ] P12-T02 — PDF corrupt/encrypted/over-limit mengikuti policy error.
- [ ] P12-T03 — Original hash tidak berubah setelah processing.
- [ ] P12-T04 — Preview hanya dapat diakses user berizin.

**Exit Criteria**  
Fixture PDF digital lolos.

### P13 — Document review UI (8 jam)

**Goal**  
Memberi pengguna mekanisme review eksplisit agar file hasil processing dikonfirmasi sebelum digunakan untuk submit.

**Dependencies**
- P12 selesai.

**Pekerjaan / Scope**
- Buat UI status processing dan preview.
- Tambahkan action Accept/Replace file.
- Blokir submit jika mandatory file belum reviewed.
- Tampilkan warning bila preview/extraction memiliki keterbatasan.

**Deliverables**
- processing status, preview, accept/replace.
- Evidence test/verification P13 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P13-T01 — Submit ditolak bila file mandatory belum Accepted.
- [ ] P13-T02 — Replace menginvalidasi review/status file lama.
- [ ] P13-T03 — Processing failure ditampilkan dengan recovery action.
- [ ] P13-T04 — User tanpa document access tidak dapat membuka review.

**Exit Criteria**  
File wajib reviewed sebelum submit.

### P14 — Participant selection (12 jam)

**Goal**  
Membangun konfigurasi participant workflow yang valid sebelum dokumen dikunci.

**Dependencies**
- P06, P08, P13 selesai.

**Pekerjaan / Scope**
- Implementasikan pemilihan Knowing dan Approver.
- Tambahkan sequence_no untuk Approver dan parallel set untuk Knowing.
- Terapkan segregation-of-duties, self-assignment, duplicate, dan active employee rules.
- Simpan participant snapshot yang diperlukan untuk audit.

**Deliverables**
- Knowing/Approver selection, sequence, SoD rules.
- Evidence test/verification P14 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P14-T01 — Approver sequence tersimpan deterministik.
- [ ] P14-T02 — Duplicate participant dan overlap yang dilarang ditolak.
- [ ] P14-T03 — Self-approval/SoD violation ditolak.
- [ ] P14-T04 — Employee inactive tidak dapat dipilih.

**Exit Criteria**  
Overlap/self-assignment ditolak.

### P15 — Canonical Document Manifest (8 jam)

**Goal**  
Mendefinisikan identitas integrity dokumen secara deterministik melalui Canonical Document Manifest.

**Dependencies**
- P08–P14 selesai.

**Pekerjaan / Scope**
- Definisikan schema manifest dan canonical serialization.
- Masukkan version, issuer, canonical PDF/original file hash, attachment hash, dan metadata integrity yang disepakati.
- Hitung document_manifest_hash dengan SHA-256.
- Simpan/rekalkulasi manifest hanya pada lifecycle yang diizinkan.

**Deliverables**
- canonical serialization + manifest hash.
- Evidence test/verification P15 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P15-T01 — Input identik selalu menghasilkan canonical bytes/hash identik.
- [ ] P15-T02 — Perubahan file/attachment/metadata integrity mengubah hash.
- [ ] P15-T03 — Reordering field yang semantik sama tidak mengubah canonical output.
- [ ] P15-T04 — Fixture canonicalization lintas environment menghasilkan hash sama.

**Exit Criteria**  
Hash deterministic pada fixture dan berubah jika file/metadata integrity berubah.

## 4.C Workflow, Signature & Issuance

### P16 — Creator Sign + Submit (12 jam)

**Goal**  
Menghilangkan race window antara Creator signature dan submit dengan satu transaksi bisnis atomik.

**Dependencies**
- P14–P15 selesai.

**Pekerjaan / Scope**
- Implementasikan endpoint Sign+Submit tunggal.
- Validasi file reviewed, participants, permission, dan credit rules yang belum berlaku pada core internal submit.
- Hitung/freeze manifest, lock version, create Creator signature, transition state, dan audit dalam transaction.
- Tambahkan idempotency key.

**Deliverables**
- atomic manifest→lock→signature→state→audit transaction.
- Evidence test/verification P16 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P16-T01 — Tidak ada state persistent “Creator signed tetapi masih Draft”.
- [ ] P16-T02 — Duplicate request dengan idempotency key tidak membuat signature/audit ganda.
- [ ] P16-T03 — Perubahan file setelah lock ditolak.
- [ ] P16-T04 — Salah satu step gagal menyebabkan seluruh transaction rollback.

**Exit Criteria**  
Tidak ada state “signed Draft”; duplicate request idempotent.

### P17 — Knowing workflow (12 jam)

**Goal**  
Mengimplementasikan Knowing acknowledgment paralel yang wajib selesai sebelum approval dimulai.

**Dependencies**
- P16 selesai.

**Pekerjaan / Scope**
- Aktifkan participant Knowing setelah submit.
- Implementasikan review + acknowledgment/signature action.
- Terapkan parallel completion dan aggregate status.
- Emit audit/outbox event pada completion.

**Deliverables**
- parallel acknowledgment + signature action.
- Evidence test/verification P17 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P17-T01 — Semua Knowing dapat bertindak paralel.
- [ ] P17-T02 — Approval pertama tidak ACTIVE sebelum seluruh Knowing selesai.
- [ ] P17-T03 — Duplicate acknowledgment idempotent.
- [ ] P17-T04 — Knowing bukan participant tidak dapat bertindak.

**Exit Criteria**  
Approval blocked sampai semua Knowing selesai.

### P18 — Sequential Approval (12 jam)

**Goal**  
Mengimplementasikan sequential approval dengan tepat satu approver ACTIVE pada satu waktu.

**Dependencies**
- P17 selesai.

**Pekerjaan / Scope**
- Implementasikan approve+sign atomic transaction.
- Aktifkan approver berikutnya hanya setelah current selesai.
- Gunakan constraint/locking untuk mencegah dua ACTIVE approver.
- Emit audit dan notification event.

**Deliverables**
- one ACTIVE approver, approve+sign transaction.
- Evidence test/verification P18 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P18-T01 — Approver N+1 tidak dapat approve sebelum N selesai.
- [ ] P18-T02 — Concurrency approve tidak menghasilkan dua ACTIVE approver.
- [ ] P18-T03 — Duplicate approve tidak membuat signature ganda.
- [ ] P18-T04 — Approver non-ACTIVE ditolak.

**Exit Criteria**  
Concurrency test tidak menghasilkan dua active approver.

### P19 — Reject & Withdraw (8 jam)

**Goal**  
Menyediakan jalur Reject dan Withdraw yang memiliki state guard dan alasan audit yang jelas.

**Dependencies**
- P16–P18 selesai.

**Pekerjaan / Scope**
- Implementasikan Reject pada stage yang diizinkan.
- Implementasikan Withdraw sebelum first approval sesuai rule.
- Wajibkan reason dan audit event.
- Pastikan terminal state menonaktifkan action lain.

**Deliverables**
- terminal reject, pre-first-approval withdraw.
- Evidence test/verification P19 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P19-T01 — Reject tanpa reason ditolak.
- [ ] P19-T02 — Withdraw setelah batas lifecycle ditolak.
- [ ] P19-T03 — Terminal document tidak dapat di-approve/sign lagi.
- [ ] P19-T04 — Reason dan actor muncul di audit.

**Exit Criteria**  
State guards + reason audit lolos.

### P20 — Runtime permission re-check (8 jam)

**Goal**  
Memastikan participant yang dipilih saat submit tetap harus memenuhi authorization terkini ketika bertindak.

**Dependencies**
- P06 dan P17–P19 selesai.

**Pekerjaan / Scope**
- Re-check employee active status pada setiap workflow action.
- Re-check effective permission pada runtime.
- Terapkan failure state yang memicu recovery bila participant tidak lagi eligible.
- Catat denial reason secara aman.

**Deliverables**
- active status + permission check at action time.
- Evidence test/verification P20 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P20-T01 — Permission dicabut setelah submit membuat action berikutnya ditolak.
- [ ] P20-T02 — Suspended employee tidak dapat sign/approve.
- [ ] P20-T03 — Participant assignment saja tidak cukup tanpa permission aktif.
- [ ] P20-T04 — Denial tidak mengubah signature/history.

**Exit Criteria**  
Revoked/suspended participant tidak dapat bertindak.

### P21 — Workflow Recovery (12 jam)

**Goal**  
Mencegah dokumen stuck permanen ketika participant tidak lagi dapat bertindak melalui recovery yang auditable.

**Dependencies**
- P20 selesai.

**Pekerjaan / Scope**
- Tambahkan BLOCKED/recovery state bila diperlukan.
- Implementasikan privileged Workflow.Repair.
- Ganti participant target tanpa mengubah signature/history terdahulu.
- Wajibkan reason, actor, before/after, dan notification.

**Deliverables**
- BLOCKED state + `Workflow.Repair` replacement action.
- Evidence test/verification P21 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P21-T01 — Hanya role berizin dapat melakukan repair.
- [ ] P21-T02 — Replacement mempertahankan completed participant/signature lama.
- [ ] P21-T03 — Replacement reason muncul pada audit.
- [ ] P21-T04 — Replacement baru harus memenuhi permission/active/SoD rules.

**Exit Criteria**  
Replacement teraudit, history/signature lama tidak berubah.

### P22 — Visual signature (8 jam)

**Goal**  
Mendukung visual signature evidence secara privat tanpa menjadikannya reusable profile asset yang berisiko.

**Dependencies**
- P15–P21 selesai.

**Pekerjaan / Scope**
- Implementasikan upload evidence visual signature pada konteks action.
- Bind evidence ke signature record/document manifest/version.
- Terapkan private access dan retention policy.
- Cegah penggunaan evidence lintas action tanpa consent/rule eksplisit.

**Deliverables**
- secure evidence upload + binding ke manifest.
- Evidence test/verification P22 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P22-T01 — Evidence tidak dapat diakses publik.
- [ ] P22-T02 — Evidence terhubung ke signature/document yang benar.
- [ ] P22-T03 — Evidence dari dokumen A tidak dapat dipakai ulang pada dokumen B melalui API tampering.
- [ ] P22-T04 — Invalid image/type/size ditolak.

**Exit Criteria**  
Evidence private dan tidak reusable sebagai profile.

### P23 — Internal signature PIN (12 jam)

**Goal**  
Menyediakan PIN signing internal dengan penyimpanan aman dan kontrol brute-force.

**Dependencies**
- P04 dan P22 selesai.

**Pekerjaan / Scope**
- Implementasikan register/change/revoke PIN.
- Hash PIN dengan algoritma password hashing yang sesuai.
- Tambahkan rate limit, failed-attempt counter/lockout, dan re-auth rule.
- Integrasikan PIN verification di dalam signing action, bukan generic oracle endpoint.

**Deliverables**
- register/change/revoke, hash, rate limit/lockout.
- Evidence test/verification P23 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P23-T01 — PIN tidak pernah disimpan plaintext.
- [ ] P23-T02 — Wrong PIN berulang memicu control sesuai policy.
- [ ] P23-T03 — PIN tidak muncul di log/audit payload.
- [ ] P23-T04 — Generic “is PIN valid” endpoint tidak tersedia.

**Exit Criteria**  
PIN tidak muncul di log; brute-force controls lolos.

### P24 — Signature verification (8 jam)

**Goal**  
Menyediakan verifikasi integrity signature terhadap version dan document_manifest_hash.

**Dependencies**
- P15, P16–P23 selesai.

**Pekerjaan / Scope**
- Buat verifier signature record ↔ signer ↔ version ↔ manifest hash.
- Tambahkan status valid/invalid/revoked sesuai domain.
- Expose verification internal yang aman.
- Tambahkan fixture tampering.

**Deliverables**
- verify signature record ↔ manifest hash ↔ version.
- Evidence test/verification P24 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P24-T01 — Signature valid lolos verifikasi.
- [ ] P24-T02 — File/attachment yang dimodifikasi menyebabkan manifest mismatch.
- [ ] P24-T03 — Signature yang menunjuk version lain ditolak.
- [ ] P24-T04 — Revoked/invalid signature ditampilkan dengan status yang benar.

**Exit Criteria**  
Tampered file/manifest gagal verifikasi.

### P25 — Number reservation (12 jam)

**Goal**  
Menyediakan reservasi nomor surat yang atomic, timezone-aware, dan aman terhadap concurrency.

**Dependencies**
- P05 dan P18–P24 selesai.

**Pekerjaan / Scope**
- Implementasikan numbering format/counter per scope yang disepakati.
- Gunakan offices.timezone IANA untuk period boundary.
- Reserve nomor dalam transaction dan simpan format snapshot.
- Tambahkan unique constraint/locking strategy.

**Deliverables**
- atomic counter, IANA timezone, snapshot format.
- Evidence test/verification P25 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P25-T01 — Parallel reservation menghasilkan nomor unik tanpa gap akibat duplicate race yang tidak valid.
- [ ] P25-T02 — Boundary bulan/tahun mengikuti timezone kantor penerbit.
- [ ] P25-T03 — Format change tidak mengubah nomor yang sudah di-reserve.
- [ ] P25-T04 — Retry idempotent mengembalikan reservation yang sama.

**Exit Criteria**  
High-concurrency numbering test unik.

### P26 — Finalization worker (12 jam)

**Goal**  
Membangun finalization worker yang menghasilkan PDF final dari version terkunci dan nomor yang sudah di-reserve.

**Dependencies**
- P11, P24, P25 selesai.

**Pekerjaan / Scope**
- Create finalization job setelah nomor berhasil di-reserve.
- Compose final PDF berisi nomor, signature visual/data yang diizinkan, dan QR placeholder/metadata sesuai desain.
- Hitung final PDF hash dan upload derivative.
- Callback internal memverifikasi job lalu menandai issued sesuai transaction.

**Deliverables**
- reservation→job→compose final PDF→hash→callback.
- Evidence test/verification P26 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P26-T01 — PDF final memakai nomor reservation yang sama persis.
- [ ] P26-T02 — Worker tidak mengambil file/version yang berubah setelah lock.
- [ ] P26-T03 — Callback forged/unknown job ditolak.
- [ ] P26-T04 — Final PDF hash tersimpan dan dapat diverifikasi.

**Exit Criteria**  
PDF final memakai nomor reservation yang benar.

### P27 — Finalization recovery (8 jam)

**Goal**  
Menjamin kegagalan finalization dapat dipulihkan tanpa membuat nomor baru atau mendaur ulang nomor VOID.

**Dependencies**
- P26 selesai.

**Pekerjaan / Scope**
- Implementasikan retry idempotent finalization.
- Definisikan permanent-failure threshold dan reservation VOID.
- Pastikan nomor VOID tidak reused.
- Sediakan admin retry/reconciliation operation yang teraudit.

**Deliverables**
- idempotent retry, VOID permanent failure.
- Evidence test/verification P27 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P27-T01 — Retry worker memakai reservation/job logical yang sama.
- [ ] P27-T02 — Permanent failure mengubah reservation ke VOID sesuai policy.
- [ ] P27-T03 — Counter tidak pernah mengalokasikan ulang nomor VOID.
- [ ] P27-T04 — Duplicate callback tidak mengubah state dua kali.

**Exit Criteria**  
Retry tidak membuat nomor baru; VOID tidak reused.

### P28 — Verification token/page (8 jam)

**Goal**  
Menyediakan public verification token/page yang memverifikasi dokumen tanpa membocorkan dokumen privat.

**Dependencies**
- P24–P27 selesai.

**Pekerjaan / Scope**
- Generate random purpose-scoped verification token dan simpan hash/identifier yang aman.
- Buat public verification endpoint/page dengan metadata allowlist.
- Tampilkan valid/issued/revoked status dan signature summary yang diperbolehkan.
- Tambahkan revoke/rotate behavior bila diperlukan.

**Deliverables**
- purpose-scoped verification token + metadata page.
- Evidence test/verification P28 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P28-T01 — Token valid menampilkan metadata allowlist yang benar.
- [ ] P28-T02 — Token random/expired/revoked tidak membocorkan keberadaan dokumen.
- [ ] P28-T03 — Page tidak mengungkap private PDF/file URL.
- [ ] P28-T04 — Token tidak dapat digunakan sebagai credential ke endpoint internal.

**Exit Criteria**  
Token tidak membocorkan dokumen privat.

## 4.D Notification, Archive & Audit

### P29 — Notifications (8 jam)

**Goal**  
Menyediakan notification domain event-driven tanpa duplicate user-visible notification.

**Dependencies**
- P11 dan workflow core selesai.

**Pekerjaan / Scope**
- Definisikan notification event types dan recipient resolver.
- Implementasikan in-app notification persistence/read state.
- Hubungkan outbox consumer ke notification creation.
- Tambahkan deduplication key.

**Deliverables**
- in-app + event-driven delivery skeleton.
- Evidence test/verification P29 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P29-T01 — Event workflow menghasilkan notification ke recipient yang benar.
- [ ] P29-T02 — Duplicate outbox delivery tidak menggandakan notification.
- [ ] P29-T03 — Unauthorized user tidak dapat membaca notification user lain.
- [ ] P29-T04 — Mark-as-read idempotent.

**Exit Criteria**  
Duplicate outbox tidak menggandakan user-visible notification.

### P30 — Email delivery (8 jam)

**Goal**  
Menyediakan email delivery adapter yang retryable dan tidak memblokir transaksi workflow.

**Dependencies**
- P29 selesai.

**Pekerjaan / Scope**
- Buat provider abstraction dan template dasar.
- Simpan delivery attempt/status/provider message ID.
- Implementasikan retry/backoff dan terminal failure.
- Pisahkan email failure dari workflow state.

**Deliverables**
- provider adapter, retry, delivery records.
- Evidence test/verification P30 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P30-T01 — Successful event mengirim email sesuai template.
- [ ] P30-T02 — Provider failure memicu retry tanpa rollback workflow.
- [ ] P30-T03 — Duplicate event tidak mengirim email ganda bila dedupe berlaku.
- [ ] P30-T04 — Email log tidak berisi token sensitif lebih dari kebutuhan link capability.

**Exit Criteria**  
Failure/retry tercatat tanpa blocking workflow.

### P31 — Archive & metadata search (12 jam)

**Goal**  
Menyediakan archive dan metadata search yang authorized dan performant untuk dokumen yang dapat diakses user.

**Dependencies**
- P08–P30 core data tersedia.

**Pekerjaan / Scope**
- Buat archive list, pagination, filter, sort, dan metadata search.
- Tambahkan index berdasarkan query pattern nyata.
- Terapkan authorization/RLS sebelum hasil search dikembalikan.
- Tetapkan p95 baseline awal.

**Deliverables**
- archive list/filter/search terindeks.
- Evidence test/verification P31 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P31-T01 — Search hanya mengembalikan dokumen yang user boleh lihat.
- [ ] P31-T02 — Pagination/sort stabil dan deterministic.
- [ ] P31-T03 — Query umum memenuhi target p95 baseline pada dataset test.
- [ ] P31-T04 — Search term malicious tidak menyebabkan injection/error leak.

**Exit Criteria**  
Authorization + p95 target awal tercapai.

### P32 — Audit hardening (8 jam)

**Goal**  
Mengeraskan audit log agar application-immutable, terstruktur, minim data sensitif, dan dapat diekspor oleh role berizin.

**Dependencies**
- Audit event core dari P03–P31 tersedia.

**Pekerjaan / Scope**
- Standarkan audit event schema dan resource correlation.
- Gunakan allowlist before/after, bukan raw request dump.
- Blokir update/delete dari role aplikasi normal.
- Implementasikan export dengan permission khusus.

**Deliverables**
- application-immutable audit, allowlisted before/after, export permission.
- Evidence test/verification P32 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P32-T01 — Role aplikasi tidak dapat update/delete audit row.
- [ ] P32-T02 — PIN, token, password, dan document content sensitif tidak masuk audit.
- [ ] P32-T03 — Export hanya tersedia untuk permission yang tepat.
- [ ] P32-T04 — Critical workflow event memiliki actor/time/resource correlation.

**Exit Criteria**  
PIN/token/content sensitif tidak masuk audit.

## 4.E Advanced Processing, Template & Form

### P33 — Office conversion POC (12 jam)

**Goal**  
Membuktikan kualitas dan batasan konversi Office sebelum jalur production diaktifkan.

**Dependencies**
- P10–P13 worker/processing foundation tersedia.

**Pekerjaan / Scope**
- Bangun fixture corpus DOC/DOCX/XLS/XLSX representatif.
- POC LibreOffice/engine conversion ke PDF.
- Catat fidelity issue: font, pagination, formula, print area, object/embed.
- Tetapkan acceptance threshold dan unsupported cases.

**Deliverables**
- DOC/DOCX/XLS/XLSX → PDF fixture corpus.
- Evidence test/verification P33 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P33-T01 — Corpus representative menghasilkan PDF tanpa crash.
- [ ] P33-T02 — Fidelity issue per fixture terdokumentasi.
- [ ] P33-T03 — Unsupported/unsafe file menghasilkan controlled error.
- [ ] P33-T04 — Resource usage baseline tercatat.

**Exit Criteria**  
Fidelity limitations terdokumentasi dan acceptable.

### P34 — Office processing production path (12 jam)

**Goal**  
Mengubah POC Office conversion menjadi pipeline production yang dibatasi resource dan dapat diretry.

**Dependencies**
- P33 selesai.

**Pekerjaan / Scope**
- Integrasikan conversion ke worker queue.
- Tambahkan CPU/memory/time/page/sheet limits.
- Simpan rendered PDF/preview derivative dan status.
- Implementasikan retry/dead-letter serta cleanup temp file.

**Deliverables**
- worker conversion + limits + preview.
- Evidence test/verification P34 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P34-T01 — Supported Office file selesai diproses end-to-end.
- [ ] P34-T02 — Over-limit file dihentikan tanpa mengganggu worker lain.
- [ ] P34-T03 — Retry tidak membuat derivative duplikat.
- [ ] P34-T04 — Dead-letter/recovery path dapat dioperasikan.

**Exit Criteria**  
Retry/dead-letter/resource limits diuji.

### P35 — OCR fallback (8 jam)

**Goal**  
Menyediakan OCR fallback untuk PDF scan dengan label human-review sehingga hasil OCR tidak dianggap authoritative.

**Dependencies**
- P12 dan worker production path tersedia.

**Pekerjaan / Scope**
- Deteksi PDF dengan text layer minim/tidak ada.
- Jalankan OCR fallback dengan language/config baseline.
- Simpan confidence/metadata dan label requires review.
- Batasi OCR resource/time/page.

**Deliverables**
- PDF scan detection + OCR + human-review label.
- Evidence test/verification P35 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P35-T01 — PDF digital tidak menjalankan OCR yang tidak perlu.
- [ ] P35-T02 — PDF scan menghasilkan OCR text dan label review.
- [ ] P35-T03 — Low-confidence OCR tidak otomatis dianggap data authoritative.
- [ ] P35-T04 — OCR timeout mengikuti retry/failure policy.

**Exit Criteria**  
OCR result tidak dianggap authoritative.

### P36 — Extraction/full-text (12 jam)

**Goal**  
Menyediakan full-text extraction/search yang tetap tunduk pada authorization dokumen.

**Dependencies**
- P12, P34, P35 selesai.

**Pekerjaan / Scope**
- Normalisasi dan simpan extracted text/index.
- Implementasikan content search endpoint/query.
- Terapkan authorization sebelum/snippet retrieval.
- Definisikan re-index/reprocessing behavior.

**Deliverables**
- extraction storage + authorized content search.
- Evidence test/verification P36 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P36-T01 — Search menemukan istilah dari extracted content fixture.
- [ ] P36-T02 — User tanpa akses dokumen tidak mendapat hit/snippet.
- [ ] P36-T03 — Re-index tidak menghasilkan duplicate index state.
- [ ] P36-T04 — Sensitive extracted text tidak masuk log.

**Exit Criteria**  
Extracted text tidak bocor lintas permission.

### P37 — Template versioning (12 jam)

**Goal**  
Menyediakan template yang versioned dan provenance-nya tersimpan pada dokumen.

**Dependencies**
- P08 dan processing/document model stabil.

**Pekerjaan / Scope**
- Implementasikan template CRUD, draft/version/publish lifecycle.
- Immutable published version atau versioning rule yang jelas.
- Hubungkan document version ke template_version yang digunakan.
- Tambahkan permission template management.

**Deliverables**
- template CRUD/version/publish.
- Evidence test/verification P37 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P37-T01 — Publish menghasilkan version yang dapat direferensikan dokumen.
- [ ] P37-T02 — Update template tidak mengubah provenance dokumen lama.
- [ ] P37-T03 — Unauthorized user tidak dapat publish/edit.
- [ ] P37-T04 — Invalid template lifecycle transition ditolak.

**Exit Criteria**  
Document menyimpan template-version provenance.

### P38 — Basic editor (12 jam)

**Goal**  
Menyediakan basic editor dengan content model yang dapat disanitasi dan dipreview secara aman.

**Dependencies**
- P37 selesai.

**Pekerjaan / Scope**
- Pilih/implement editor content model minimum.
- Sanitize HTML/rich content pada server dan/atau render boundary.
- Generate preview yang konsisten dengan content model.
- Batasi embedded content/external link sesuai security policy.

**Deliverables**
- editor content model + sanitize + preview.
- Evidence test/verification P38 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P38-T01 — Stored XSS fixture disanitasi/ditolak.
- [ ] P38-T02 — Content valid round-trip tanpa corruption.
- [ ] P38-T03 — Preview tidak mengeksekusi script/external unsafe content.
- [ ] P38-T04 — Permission edit/publish dipatuhi.

**Exit Criteria**  
Stored XSS tests lolos.

### P39 — Form Builder (12 jam)

**Goal**  
Menyediakan Form Builder versioned yang submission-nya dapat ditelusuri ke dokumen/version hasil.

**Dependencies**
- P37–P38 selesai.

**Pekerjaan / Scope**
- Implementasikan form definition/version/field types minimum.
- Validasi submission terhadap schema/version.
- Generate/link document dari submission.
- Simpan provenance form_submission → form_version → document/version.

**Deliverables**
- form version/fields/submission→document provenance.
- Evidence test/verification P39 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P39-T01 — Submission valid menghasilkan data/document sesuai mapping.
- [ ] P39-T02 — Invalid required/type constraint ditolak.
- [ ] P39-T03 — Edit form baru tidak mengubah submission lama.
- [ ] P39-T04 — Provenance dapat ditelusuri dua arah.

**Exit Criteria**  
Submission dapat ditelusuri ke version/document.

## 4.F Hardening, UAT & Pilot

### P40 — Security hardening (12 jam)

**Goal**  
Menutup Critical/High security gap pada seluruh attack surface Core/Full MVP.

**Dependencies**
- Feature set P00–P39 tersedia.

**Pekerjaan / Scope**
- Lakukan IDOR/BOLA testing endpoint sensitif.
- Review CSP, iframe sandbox, upload/download, token/capability, CORS/CSRF.
- Jalankan dependency/secret scan dan abuse-case testing.
- Triase/fix Critical/High atau dokumentasikan formal acceptance.

**Deliverables**
- IDOR, CSP/sandbox, secret scan, abuse tests.
- Evidence test/verification P40 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P40-T01 — IDOR test lintas user/office/company scope gagal secara aman.
- [ ] P40-T02 — Secret scanner tidak menemukan production credential.
- [ ] P40-T03 — XSS/capability-token abuse fixture tidak menghasilkan privilege escalation.
- [ ] P40-T04 — Tidak ada Critical/High open tanpa acceptance formal.

**Exit Criteria**  
Tidak ada Critical/High open.

### P41 — Performance & capacity (8 jam)

**Goal**  
Membuktikan API/search utama memenuhi baseline latency dan capacity yang dapat dioperasikan.

**Dependencies**
- P31 dan feature set utama tersedia.

**Pekerjaan / Scope**
- Definisikan workload representative dan test dataset.
- Load test auth, document list/detail, search, workflow action, verification.
- Profiling query/index/connection pool.
- Tune bottleneck dan dokumentasikan capacity envelope.

**Deliverables**
- load tests common API/search, indexes.
- Evidence test/verification P41 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P41-T01 — Common API memenuhi p95 target baseline atau exception formal.
- [ ] P41-T02 — Error rate tetap di bawah threshold pada target concurrency.
- [ ] P41-T03 — Tidak ada unbounded query/N+1 kritis pada hot path.
- [ ] P41-T04 — Capacity result reproducible dan tersimpan sebagai evidence.

**Exit Criteria**  
NFR p95 baseline tercapai atau exception disetujui.

### P42 — Backup/restore (8 jam)

**Goal**  
Membuktikan backup dapat direstore sesuai target RPO/RTO, bukan hanya dikonfigurasi.

**Dependencies**
- Database/storage schema cukup stabil.

**Pekerjaan / Scope**
- Tetapkan backup schedule/retention untuk DB dan file metadata/storage strategy.
- Lakukan restore drill ke environment terisolasi.
- Verifikasi relational integrity, file references, dan critical records.
- Dokumentasikan RPO/RTO evidence dan runbook.

**Deliverables**
- backup policy + restore drill.
- Evidence test/verification P42 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P42-T01 — Restore database berhasil dari backup yang dipilih.
- [ ] P42-T02 — Sample document/file/signature/ledger references konsisten setelah restore.
- [ ] P42-T03 — Measured RPO/RTO memenuhi baseline atau exception formal.
- [ ] P42-T04 — Runbook dapat diikuti oleh operator selain author.

**Exit Criteria**  
RPO/RTO baseline dibuktikan dengan evidence.

### P43 — Observability (8 jam)

**Goal**  
Menyediakan observability dan alert yang cukup untuk mendeteksi kegagalan queue, outbox, finalization, auth, dan storage.

**Dependencies**
- P11, P26, P30, P41–P42 tersedia.

**Pekerjaan / Scope**
- Definisikan metrics/log correlation/health checks.
- Tambahkan alert untuk queue age, outbox backlog, finalization failures, auth anomalies, storage errors.
- Buat dashboard dan runbook per alert utama.
- Uji alert routing.

**Deliverables**
- metrics/alerts queue, outbox, finalization, auth, storage.
- Evidence test/verification P43 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P43-T01 — Synthetic queue/outbox failure memicu alert.
- [ ] P43-T02 — Request/job dapat ditelusuri melalui correlation ID.
- [ ] P43-T03 — Alert memiliki actionable runbook.
- [ ] P43-T04 — Sensitive data tidak terekspos pada observability payload.

**Exit Criteria**  
Alert test dan runbook tersedia.

### P44 — End-to-end regression (12 jam)

**Goal**  
Menyediakan regression suite end-to-end untuk critical path, concurrency, dan failure injection sebelum UAT.

**Dependencies**
- P00–P43 feature/hardening selesai.

**Pekerjaan / Scope**
- Automasi critical user journey dari login hingga issued/verified.
- Gabungkan concurrency test numbering/workflow/outbox.
- Tambahkan failure injection queue/worker/storage/provider.
- Stabilkan fixture dan environment test.

**Deliverables**
- critical path E2E + concurrency + failure injection.
- Evidence test/verification P44 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P44-T01 — Core happy path E2E hijau.
- [ ] P44-T02 — Reject/Withdraw/Recovery path E2E hijau.
- [ ] P44-T03 — Concurrency suite numbering/approval hijau.
- [ ] P44-T04 — Failure injection tidak menghasilkan corrupt/duplicate business state.

**Exit Criteria**  
Release suite hijau.

### P45 — UAT (12 jam)

**Goal**  
Memvalidasi sistem terhadap proses bisnis nyata melalui UAT yang memiliki owner dan sign-off.

**Dependencies**
- P44 hijau.

**Pekerjaan / Scope**
- Siapkan UAT script per persona dan business scenario.
- Jalankan core workflow, advanced processing, recovery, search/audit.
- Catat defect dengan severity/owner.
- Dapatkan sign-off atau daftar blocker formal.

**Deliverables**
- UAT core + advanced processing + recovery.
- Evidence test/verification P45 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P45-T01 — Seluruh UAT Must scenario memiliki hasil Pass/Fail.
- [ ] P45-T02 — UAT blocker memiliki owner dan disposition.
- [ ] P45-T03 — Sign-off pemilik proses terdokumentasi.

**Exit Criteria**  
Sign-off pemilik proses.

### P46 — Release remediation (8 jam)

**Goal**  
Menutup seluruh release blocker hasil UAT/security/performance tanpa memperkenalkan regression baru.

**Dependencies**
- P40–P45 selesai.

**Pekerjaan / Scope**
- Fix blocker berdasarkan severity.
- Tambahkan regression test untuk setiap defect kritis.
- Re-run affected security/performance/E2E suite.
- Freeze release candidate.

**Deliverables**
- fix blocker UAT/security/performance.
- Evidence test/verification P46 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P46-T01 — Tidak ada release blocker open.
- [ ] P46-T02 — Setiap blocker fixed memiliki regression test/evidence.
- [ ] P46-T03 — Release candidate lulus suite yang terdampak.

**Exit Criteria**  
Tidak ada release blocker terbuka.

### P47 — Pilot readiness (8 jam)

**Goal**  
Menyiapkan deployment, support, dan user enablement untuk pilot yang dapat dioperasikan.

**Dependencies**
- P46 selesai.

**Pekerjaan / Scope**
- Lengkapi deployment/go-live checklist.
- Finalisasi support escalation dan operational runbook.
- Siapkan training/admin/user material.
- Pastikan monitoring, backup, rollback, migration plan siap.

**Deliverables**
- deployment checklist, support/runbook, training material.
- Evidence test/verification P47 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P47-T01 — Go/no-go checklist lengkap dan owner ditetapkan.
- [ ] P47-T02 — Dry-run deployment/migration mengikuti runbook.
- [ ] P47-T03 — Support escalation contact/process tervalidasi.

**Exit Criteria**  
Go/no-go checklist lengkap.

### P48 — Core pilot validation (12 jam)

**Goal**  
Membuktikan Core MVP bekerja di pilot environment dengan monitoring dan rollback evidence nyata.

**Dependencies**
- P47 selesai dan go decision tersedia.

**Pekerjaan / Scope**
- Deploy pilot release.
- Jalankan production smoke test dan sample workflow.
- Monitor error/latency/queue/storage.
- Validasi rollback/recovery readiness dan catat pilot acceptance.

**Deliverables**
- production smoke, monitoring, rollback evidence.
- Evidence test/verification P48 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P48-T01 — Production smoke critical path berhasil.
- [ ] P48-T02 — Monitoring menerima metrics/log pilot.
- [ ] P48-T03 — Rollback procedure telah dibuktikan atau dry-run evidence tersedia.
- [ ] P48-T04 — Pilot acceptance/issues terdokumentasi.

**Exit Criteria**  
Core pilot acceptance tercatat.

## 4.G External Signing & Credit Commercialization

### P49 — External Signing domain (8 jam)

**Goal**  
Membuat capability External Signing yang aman tanpa memberi external recipient akses internal.

**Dependencies**
- P28 public capability pattern dan core signature model tersedia.

**Pekerjaan / Scope**
- Tambahkan external_signing_request domain dan lifecycle.
- Generate high-entropy token; simpan token hash/lookup identifier sesuai desain.
- Implementasikan expiry, revoke, recipient binding, dan resend policy.
- Pisahkan public capability route dari internal auth route.

**Deliverables**
- request/token model, hashed token, expiry/revoke, permission.
- Evidence test/verification P49 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P49-T01 — Token valid hanya mengakses request/document yang dituju.
- [ ] P49-T02 — Token expired/revoked/random ditolak tanpa data leak.
- [ ] P49-T03 — Token tidak dapat digunakan pada API internal.
- [ ] P49-T04 — Brute-force/enumeration test memenuhi rate-limit policy.

**Exit Criteria**  
Capability tidak memberi internal access; token security tests lolos.

### P50 — External Signing execution (12 jam)

**Goal**  
Menyelesaikan External Signing end-to-end dengan challenge/consent dan signature yang terikat ke version terkunci.

**Dependencies**
- P49 dan signature integrity core selesai.

**Pekerjaan / Scope**
- Buat public review flow dan recipient consent.
- Integrasikan OTP/challenge adapter sesuai policy.
- Implementasikan atomic external sign transaction.
- Simpan authentication context/evidence minimum dan audit.

**Deliverables**
- challenge/OTP adapter, public review, consent, atomic sign.
- Evidence test/verification P50 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P50-T01 — Successful signer menghasilkan signature pada locked version/manifest yang benar.
- [ ] P50-T02 — Wrong/expired OTP/challenge ditolak.
- [ ] P50-T03 — Duplicate submit idempotent dan tidak membuat signature ganda.
- [ ] P50-T04 — Recipient tidak dapat mengganti target signer/document melalui request tampering.

**Exit Criteria**  
Successful sign binds locked version/manifest; retry idempotent.

### P51 — External Sign + verification integration (8 jam)

**Goal**  
Mengintegrasikan hasil External Signing ke final document dan QR verification tanpa mengenakan credit untuk scan QR.

**Dependencies**
- P28, P50 selesai.

**Pekerjaan / Scope**
- Tampilkan external signature summary pada final/verification representation sesuai privacy allowlist.
- Update verification status berdasarkan external signing lifecycle.
- Pastikan public QR scan tidak membuat debit/reservation credit.
- Tambahkan audit/metrics QR verification non-billing.

**Deliverables**
- final signature display, QR/public verification status.
- Evidence test/verification P51 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P51-T01 — Signature external valid terlihat pada verification sesuai policy.
- [ ] P51-T02 — QR scan 1x maupun berulang tidak mengubah credit ledger/balance.
- [ ] P51-T03 — Revoked/invalid external signing status direfleksikan dengan benar.
- [ ] P51-T04 — QR page tidak membocorkan OTP/token/contact sensitif.

**Exit Criteria**  
External signature dapat diverifikasi; QR scan zero-credit.

### P52 — Billing schema & plan catalog (8 jam)

**Goal**  
Menyediakan schema komersial yang eksplisit untuk plan, subscription, wallet, lot, ledger, reservation, dan billing transaction.

**Dependencies**
- Credit rules v1.3 disetujui.

**Pekerjaan / Scope**
- Tambahkan Prisma models/migrations billing.
- Definisikan monetary/credit precision dan enum lifecycle.
- Seed plan baseline sebagai commercial hypothesis.
- Tambahkan unique/foreign/check constraints yang relevan.

**Deliverables**
- plan/subscription/wallet/lot/ledger/reservation migrations.
- Evidence test/verification P52 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P52-T01 — Migration bersih pada DB kosong dan existing baseline.
- [ ] P52-T02 — Seed plan idempotent.
- [ ] P52-T03 — Invalid negative/duplicate balance relation ditolak constraint/domain rule.
- [ ] P52-T04 — Historical ledger tidak bergantung pada plan price yang dapat berubah.

**Exit Criteria**  
Migration + constraints + seed plan baseline lolos.

### P53 — Credit ledger & lot engine (12 jam)

**Goal**  
Membangun credit ledger dan lot engine yang deterministic, auditable, dan dapat direbuild menjadi balance projection.

**Dependencies**
- P52 selesai.

**Pekerjaan / Scope**
- Implementasikan ledger entry immutable dari aplikasi.
- Implementasikan credit lots dengan source/expiry.
- Gunakan konsumsi FIFO-by-expiry atau rule resmi yang terdokumentasi.
- Bangun balance projection/reconciliation dari ledger+lots.

**Deliverables**
- allocation, FIFO-by-expiry consumption, projection/reconcile.
- Evidence test/verification P53 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P53-T01 — Allocation dan consumption menghasilkan saldo deterministik.
- [ ] P53-T02 — Rebuild projection dari ledger menghasilkan saldo yang sama.
- [ ] P53-T03 — Expired lot tidak dapat dikonsumsi.
- [ ] P53-T04 — Ledger entry tidak dapat diedit/dihapus role aplikasi normal.

**Exit Criteria**  
Ledger deterministic dan projection dapat direbuild.

### P54 — Credit reservation engine (12 jam)

**Goal**  
Menjamin credit tidak double-spend pada concurrency dengan lifecycle reserve → consume/release yang idempotent.

**Dependencies**
- P53 selesai.

**Pekerjaan / Scope**
- Implementasikan reservation dengan available/reserved balance.
- Implementasikan consume pada successful business event dan release pada failure/cancel.
- Gunakan transaction/locking/idempotency key.
- Tambahkan expiry/cleanup reservation orphaned.

**Deliverables**
- reserve/consume/release + transaction/idempotency/concurrency.
- Evidence test/verification P54 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P54-T01 — Dua request berebut last credit menghasilkan tepat satu success.
- [ ] P54-T02 — Retry idempotent tidak double debit.
- [ ] P54-T03 — Failed operation me-release credit sesuai rule.
- [ ] P54-T04 — Consume/release terminal tidak dapat dieksekusi dua kali.

**Exit Criteria**  
Last-credit race menghasilkan satu success; no double debit.

### P55 — Subscription allocation & rollover (8 jam)

**Goal**  
Mengotomasi monthly allocation, rollover 2-cycle/2× cap, dan trial 50 credit/30 hari secara idempotent.

**Dependencies**
- P52–P54 selesai.

**Pekerjaan / Scope**
- Implementasikan billing-cycle allocation scheduler.
- Implementasikan subscription credit expiry dua billing cycle dan max balance/cap sesuai pricing doc.
- Implementasikan trial eligibility, 50 credit, dan 30-day expiry.
- Catat allocation/expiry sebagai ledger event.

**Deliverables**
- monthly allocation, 2-cycle expiry, 2× cap, trial 50/30d.
- Evidence test/verification P55 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P55-T01 — Scheduler dijalankan ulang pada cycle sama tidak menggandakan allocation.
- [ ] P55-T02 — Rollover tidak melebihi cap yang ditentukan.
- [ ] P55-T03 — Credit cycle lama expire sesuai waktu dan ledger tercatat.
- [ ] P55-T04 — Trial berakhir pada kondisi waktu/credit yang benar.

**Exit Criteria**  
Scheduler idempotent; rollover/expiry/trial tests lolos.

### P56 — Top-up & expiry (8 jam)

**Goal**  
Menyediakan top-up 12 bulan serta admin grant/reversal yang auditable dan tidak merusak ledger.

**Dependencies**
- P53–P55 selesai.

**Pekerjaan / Scope**
- Implementasikan top-up credit lot dengan expiry 12 bulan.
- Implementasikan admin grant dengan reason/permission.
- Implementasikan reversal sebagai compensating ledger entry, bukan edit history.
- Tentukan consumption priority antar lot.

**Deliverables**
- top-up lot 12m, expiry, admin grant/reversal.
- Evidence test/verification P56 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P56-T01 — Top-up memiliki expiry tepat sesuai policy.
- [ ] P56-T02 — Reversal menghasilkan compensating entry dan saldo benar.
- [ ] P56-T03 — Unauthorized admin grant/reversal ditolak.
- [ ] P56-T04 — Consumption memilih lot sesuai priority rule secara deterministik.

**Exit Criteria**  
Expiry/reversal teraudit dan deterministic.

### P57 — Billing UX (8 jam)

**Goal**  
Membuat credit economy dapat dipahami user sebelum melakukan tindakan yang berbiaya.

**Dependencies**
- P52–P56 API tersedia.

**Pekerjaan / Scope**
- Tampilkan available, reserved, dan expiry credit.
- Buat ledger/history dan source/usage description yang human-readable.
- Tampilkan low-balance warning dan top-up entry point.
- Tampilkan cost/credit consequence sebelum action bila relevan.

**Deliverables**
- credit badge, ledger, expiry, low-balance, top-up screens.
- Evidence test/verification P57 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P57-T01 — UI balance sesuai projection API setelah allocation/consume/release.
- [ ] P57-T02 — User dapat menelusuri debit ke business reference.
- [ ] P57-T03 — Expiring credit dan low balance tampil sesuai threshold.
- [ ] P57-T04 — User tidak dapat melihat billing workspace lain.

**Exit Criteria**  
User memahami available/reserved dan cost sebelum action.

### P58 — Commercial E2E & reconciliation (12 jam)

**Goal**  
Membuktikan External Signing, QR, dan credit accounting konsisten pada happy path maupun failure/retry.

**Dependencies**
- P49–P57 selesai.

**Pekerjaan / Scope**
- Bangun commercial E2E suite dari request external sign hingga verification.
- Inject failure pada OTP/provider/DB/worker/payment boundary yang relevan.
- Jalankan reconciliation antara ledger, reservation, signing completion, dan wallet.
- Uji zero-credit QR invariant.

**Deliverables**
- external sign + QR + credits + failure injection.
- Evidence test/verification P58 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P58-T01 — Successful external signing mengonsumsi credit tepat sekali sesuai credit formula.
- [ ] P58-T02 — Failed/cancelled signing tidak meninggalkan debit final yang salah.
- [ ] P58-T03 — QR scan tidak pernah membuat ledger debit.
- [ ] P58-T04 — Reconciliation menghasilkan zero unexplained mismatch pada fixture suite.

**Exit Criteria**  
EXT/VER/BILL mandatory suite hijau; no reconciliation mismatch.

### P59 — Payment/operations adapter (8 jam)

**Goal**  
Menyiapkan adapter payment/operational flow yang idempotent dan aman untuk commercial launch.

**Dependencies**
- P52–P58 selesai.

**Pekerjaan / Scope**
- Buat abstraction payment/manual-confirm agar provider dapat diganti.
- Implementasikan signed/idempotent callback handler sesuai provider pattern.
- Hubungkan successful payment ke top-up/subscription operation melalui ledger.
- Buat billing operations/reconciliation/refund/manual intervention runbook.

**Deliverables**
- payment/manual-confirm abstraction, idempotent callback, billing runbook.
- Evidence test/verification P59 dan perubahan dokumentasi kontrak yang terdampak.

**Test / Verification**
- [ ] P59-T01 — Duplicate payment callback tidak menggandakan credit.
- [ ] P59-T02 — Forged/invalid callback signature ditolak.
- [ ] P59-T03 — Payment success yang diproses ulang tetap menghasilkan satu logical transaction.
- [ ] P59-T04 — Commercial operations checklist dan reconciliation runbook dapat dijalankan.

**Exit Criteria**  
Duplicate/forged callback tests; commercial ops checklist lengkap.

## 5. Release Checkpoints

### Checkpoint A — Architecture Proven
Setelah P07. Auth gateway, Prisma runtime role, migration path, Group Policy, dan strategi RLS harus telah dibuktikan melalui test/evidence phase.

### Checkpoint B — Core Workflow Integrity
Setelah P27. PDF-only core flow harus mampu: draft → review → atomic Sign+Submit → Knowing → sequential Approval → numbering reservation → final PDF → retry/VOID dengan manifest/signature integrity.

### Checkpoint C — Core MVP
Setelah P32. Core workflow ditambah notification, archive/search metadata, public verification, dan hardened audit siap untuk internal pilot terbatas.

### Checkpoint D — Full MVP Feature Complete
Setelah P39. Office processing/OCR, content extraction, template/editor, dan Form Builder selesai sesuai phase tests.

### Checkpoint E — Core Production Candidate
Setelah P46. Security, performance, restore, observability, E2E, UAT, dan remediation memenuhi release gate.

### Checkpoint F — Core Pilot Validated
Setelah P48. Deployment pilot, smoke test, monitoring, rollback evidence, dan acceptance tercatat.

### Checkpoint G — Verify & Sign Commercial Candidate
Setelah P59. External Signing, QR Verification, credit ledger/reservation, rollover/top-up/trial, reconciliation, billing UX, dan payment operations melewati commercial release gate.

## 6. Definition of Done per Phase

Sebuah phase dianggap selesai hanya jika seluruh kondisi berikut terpenuhi:

1. Goal phase tercapai dan seluruh scope wajib selesai atau secara eksplisit dipindahkan melalui perubahan roadmap/Decision Log.
2. Deliverable dapat dijalankan pada environment development/staging sesuai kebutuhan.
3. Seluruh test/verification phase memiliki evidence dan berstatus pass, atau exception formal dengan owner/risk acceptance.
4. Unit/integration/E2E/security/performance test yang relevan ditambahkan ke test suite bila dapat diautomasi.
5. API/OpenAPI, Prisma schema/migration, UI contract, dan environment contract diperbarui bila terdampak.
6. Authorization negative path diuji untuk resource sensitif.
7. Decision Log/ADR diperbarui jika phase menutup atau mengubah keputusan.
8. Requirements Traceability Matrix diperbarui untuk requirement yang berubah/terimplementasi.
9. Tidak ada secret, PIN, OTP, token, atau document content sensitif yang bocor ke log/audit.
10. Code review selesai dan migration forward/rollback/recovery strategy dipahami.

## 7. Evidence yang Diterima

Evidence phase dapat berupa satu atau lebih dari berikut sesuai kebutuhan:

- Automated unit/integration/E2E/security/concurrency test result.
- CI run yang dapat ditelusuri ke commit.
- Prisma migration output dan database constraint verification.
- Benchmark/load-test report.
- Screenshot/video singkat untuk UI behavior yang tidak efektif dibuktikan hanya dengan test log.
- Query/result reconciliation untuk ledger, numbering, outbox, atau audit.
- ADR/Decision Log untuk keputusan arsitektur.
- UAT/pilot sign-off untuk acceptance bisnis.

Evidence harus cukup untuk menjawab: **apa yang dibangun, bagaimana diuji, dan mengapa phase dinyatakan selesai**.

## 8. Release Gates

Production/commercial release diblokir jika salah satu kondisi berikut terjadi:

- Critical/High security issue belum dimitigasi atau belum memiliki risk acceptance formal.
- Manifest/signature integrity test gagal.
- Numbering concurrency/retry test gagal.
- Workflow dapat bypass Knowing/Approver sequence atau runtime permission re-check.
- Malware scanning dapat dilewati sebelum parser/converter.
- Outbox backlog tidak dapat direconcile atau duplicate side effect belum idempotent.
- Restore drill belum berhasil.
- RLS diklaim aktif tetapi runtime role/context test menunjukkan bypass yang tidak disetujui.
- NFR baseline belum diukur atau exception belum disetujui.
- UAT/pilot gate yang diwajibkan belum ditandatangani.
- Credit reservation/consumption memiliki race, double debit, unexplained mismatch, atau ledger tidak dapat direbuild.
- External Signing token/capability security gagal.
- QR scan mengubah credit balance/ledger.
- Payment callback belum idempotent atau forged callback masih dapat diproses.
