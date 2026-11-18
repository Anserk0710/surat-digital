# Development Roadmap

## Surat Digital
**Versi:** 1.6 — Phase Execution Roadmap terintegrasi Backend & Frontend (1 hari penuh per phase)  
**Status:** Implementation roadmap & execution guide
## 1. Tujuan roadmap

Roadmap v1.6 menjadwalkan **Backend dan Frontend dalam setiap phase P00–P59**, dengan estimasi **1 hari pengerjaan penuh per phase**. Ini adalah satu unit perencanaan, bukan janji bahwa seluruh acceptance dapat dipenuhi otomatis dalam satu hari. Setiap phase memiliki **Goal, Dependencies, Pekerjaan/Scope, Deliverables, Test/Verification, dan Exit Criteria** sehingga developer dapat mengetahui dengan jelas apa yang harus dibuat dan bukti apa yang diperlukan sebelum phase dianggap selesai.

Satu hari penuh adalah unit perencanaan, bukan janji kalender. Code review lintas tim, approval bisnis, waktu menunggu provider/procurement, incident, dan blocked dependency tidak dihitung sebagai fokus engineering kecuali memang menjadi scope phase tersebut. Jika scope phase tidak selesai dalam satu hari, statusnya tetap In Progress/Blocked, estimasi aktual dan penyebab dicatat; owner dapat memecah task di dalam phase tanpa membuat jalur phase lain. Phase hanya selesai ketika seluruh exit criteria backend dan frontend lulus.
## 2. Aturan eksekusi phase

- Setiap phase P00–P59 memiliki tujuan backend dan frontend yang saling terkait; frontend terhubung ke API nyata sebelum phase ditutup (kecuali phase fondasi yang belum memiliki endpoint).
- Semua item Backend dan Frontend pada **Pekerjaan/Scope** wajib dikerjakan dalam phase yang sama; tidak ada jalur W terpisah.
- Semua **Test/Verification** wajib memiliki evidence: automated test, query/result, screenshot, benchmark, migration log, atau sign-off sesuai jenis test.
- Phase berikutnya boleh berjalan paralel hanya jika dependency dan shared migration/API contract tidak konflik.
- Phase blocker tidak boleh ditutup dengan TODO yang memengaruhi integrity, security, billing correctness, atau data loss.
- Perubahan API/OpenAPI, Prisma schema/migration, UI contract, Decision Log, dan RTM harus diperbarui pada phase yang mengubahnya.
- Temuan Critical/High security/integrity atau mismatch ledger memblokir release sampai dimitigasi atau diterima secara formal sesuai governance.
## 3. Roadmap ringkas

Setiap phase memiliki estimasi **1 hari penuh**. Angka ini perlu divalidasi dari velocity nyata, terutama pada phase yang memuat worker, editor, keamanan, dan integrasi browser. P00–P06 yang telah dikerjakan tidak dinyatakan otomatis memenuhi frontend; gunakan gap check dan selesaikan kekurangannya sebelum checkpoint terkait.


| Phase | Estimasi | Fokus | Goal singkat | Exit criteria |
|---|---:|---|---|---|
| P00 | 1 hari penuh | Baseline & traceability | Membekukan baseline requirement dan memastikan seluruh pekerjaan implementasi dapat ditelusuri dari requirement hingga test. | Semua Must requirement memiliki owner/trace awal |
| P01 | 1 hari penuh | Repository bootstrap | Menyediakan repository yang reproducible dan CI minimum agar seluruh phase berikutnya memiliki quality gate yang konsisten. | Build/lint/test berjalan di CI |
| P02 | 1 hari penuh | Prisma/Supabase foundation | Membangun fondasi database Prisma/Supabase yang dapat dimigrasikan, di-seed, dan dipisahkan antara role runtime dan migrat... | Migration clean pada DB kosong + seed idempotent |
| P03 | 1 hari penuh | Auth gateway POC | Membuktikan NestJS dapat menjadi satu-satunya auth gateway browser ke Supabase Auth. | Browser tidak memerlukan direct Supabase Auth; session lifecycle diuji |
| P04 | 1 hari penuh | Auth hardening | Mengeraskan boundary autentikasi terhadap brute force, session abuse, dan konfigurasi browser yang salah. | Negative auth tests lolos |
| P05 | 1 hari penuh | Organization master | Menyediakan master organisasi yang valid sebagai dasar authorization, numbering, dan workflow. | CRUD + integrity tests lolos |
| P06 | 1 hari penuh | Group Policy | Membangun evaluator Group Policy yang deterministik dengan precedence Deny di atas Allow. | Deny precedence + permission tests lolos |
| P07 | 1 hari penuh | RLS runtime POC | Membuktikan strategi RLS tambahan pada Prisma aman dan layak secara performa/kompleksitas sebelum dijadikan baseline. | Hasil security/performance/complexity terdokumentasi; ADR strategi RLS ditutup |
| P08 | 1 hari penuh | Document master | Menyediakan domain dokumen minimum untuk membuat, membaca, dan mengubah Draft sebelum file/workflow ditambahkan. | Draft create/read/update sesuai permission |
| P09 | 1 hari penuh | Storage upload | Membangun upload file privat yang memiliki metadata integrity dan tidak dapat diakses tanpa authorization. | Unauthorized file access gagal |
| P10 | 1 hari penuh | Malware gate | Memastikan tidak ada parser/converter memproses file sebelum malware scanning dinyatakan PASS. | Parser tidak berjalan sebelum scan PASS |
| P11 | 1 hari penuh | Queue + transactional outbox | Menjamin event/job tidak hilang saat transaksi database berhasil tetapi queue/dispatcher gagal. | DB commit + queue outage dapat dipulihkan tanpa duplicate effect |
| P12 | 1 hari penuh | PDF digital processing | Mendukung PDF digital sebagai format Core MVP dengan ekstraksi teks dan preview yang stabil. | Fixture PDF digital lolos |
| P13 | 1 hari penuh | Document review UI | Memberi pengguna mekanisme review eksplisit agar file hasil processing dikonfirmasi sebelum digunakan untuk submit. | File wajib reviewed sebelum submit |
| P14 | 1 hari penuh | Participant selection | Membangun konfigurasi participant workflow yang valid sebelum dokumen dikunci. | Overlap/self-assignment ditolak |
| P15 | 1 hari penuh | Canonical Document Manifest | Mendefinisikan identitas integrity dokumen secara deterministik melalui Canonical Document Manifest. | Hash deterministic pada fixture dan berubah jika file/metadata integrity berubah |
| P16 | 1 hari penuh | Creator Sign + Submit | Menghilangkan race window antara Creator signature dan submit dengan satu transaksi bisnis atomik. | Tidak ada state “signed Draft”; duplicate request idempotent |
| P17 | 1 hari penuh | Knowing workflow | Mengimplementasikan Knowing acknowledgment paralel yang wajib selesai sebelum approval dimulai. | Approval blocked sampai semua Knowing selesai |
| P18 | 1 hari penuh | Sequential Approval | Mengimplementasikan sequential approval dengan tepat satu approver ACTIVE pada satu waktu. | Concurrency test tidak menghasilkan dua active approver |
| P19 | 1 hari penuh | Reject & Withdraw | Menyediakan jalur Reject dan Withdraw yang memiliki state guard dan alasan audit yang jelas. | State guards + reason audit lolos |
| P20 | 1 hari penuh | Runtime permission re-check | Memastikan participant yang dipilih saat submit tetap harus memenuhi authorization terkini ketika bertindak. | Revoked/suspended participant tidak dapat bertindak |
| P21 | 1 hari penuh | Workflow Recovery | Mencegah dokumen stuck permanen ketika participant tidak lagi dapat bertindak melalui recovery yang auditable. | Replacement teraudit, history/signature lama tidak berubah |
| P22 | 1 hari penuh | Visual signature | Mendukung visual signature evidence secara privat tanpa menjadikannya reusable profile asset yang berisiko. | Evidence private dan tidak reusable sebagai profile |
| P23 | 1 hari penuh | Internal signature PIN | Menyediakan PIN signing internal dengan penyimpanan aman dan kontrol brute-force. | PIN tidak muncul di log; brute-force controls lolos |
| P24 | 1 hari penuh | Signature verification | Menyediakan verifikasi integrity signature terhadap version dan document_manifest_hash. | Tampered file/manifest gagal verifikasi |
| P25 | 1 hari penuh | Number reservation | Menyediakan reservasi nomor surat yang atomic, timezone-aware, dan aman terhadap concurrency. | High-concurrency numbering test unik |
| P26 | 1 hari penuh | Finalization worker | Membangun finalization worker yang menghasilkan PDF final dari version terkunci dan nomor yang sudah di-reserve. | PDF final memakai nomor reservation yang benar |
| P27 | 1 hari penuh | Finalization recovery | Menjamin kegagalan finalization dapat dipulihkan tanpa membuat nomor baru atau mendaur ulang nomor VOID. | Retry tidak membuat nomor baru; VOID tidak reused |
| P28 | 1 hari penuh | Verification token/page | Menyediakan public verification token/page yang memverifikasi dokumen tanpa membocorkan dokumen privat. | Token tidak membocorkan dokumen privat |
| P29 | 1 hari penuh | Notifications | Menyediakan notification domain event-driven tanpa duplicate user-visible notification. | Duplicate outbox tidak menggandakan user-visible notification |
| P30 | 1 hari penuh | Email delivery | Menyediakan email delivery adapter yang retryable dan tidak memblokir transaksi workflow. | Failure/retry tercatat tanpa blocking workflow |
| P31 | 1 hari penuh | Archive & metadata search | Menyediakan archive dan metadata search yang authorized dan performant untuk dokumen yang dapat diakses user. | Authorization + p95 target awal tercapai |
| P32 | 1 hari penuh | Audit hardening | Mengeraskan audit log agar application-immutable, terstruktur, minim data sensitif, dan dapat diekspor oleh role berizin. | PIN/token/content sensitif tidak masuk audit |
| P33 | 1 hari penuh | Office conversion POC | Membuktikan kualitas dan batasan konversi Office sebelum jalur production diaktifkan. | Fidelity limitations terdokumentasi dan acceptable |
| P34 | 1 hari penuh | Office processing production path | Mengubah POC Office conversion menjadi pipeline production yang dibatasi resource dan dapat diretry. | Retry/dead-letter/resource limits diuji |
| P35 | 1 hari penuh | OCR fallback | Menyediakan OCR fallback untuk PDF scan dengan label human-review sehingga hasil OCR tidak dianggap authoritative. | OCR result tidak dianggap authoritative |
| P36 | 1 hari penuh | Extraction/full-text | Menyediakan full-text extraction/search yang tetap tunduk pada authorization dokumen. | Extracted text tidak bocor lintas permission |
| P37 | 1 hari penuh | Template versioning | Menyediakan template yang versioned dan provenance-nya tersimpan pada dokumen. | Document menyimpan template-version provenance |
| P38 | 1 hari penuh | Basic editor | Menyediakan basic editor dengan content model yang dapat disanitasi dan dipreview secara aman. | Stored XSS tests lolos |
| P39 | 1 hari penuh | Form Builder | Menyediakan Form Builder versioned yang submission-nya dapat ditelusuri ke dokumen/version hasil. | Submission dapat ditelusuri ke version/document |
| P40 | 1 hari penuh | Security hardening | Menutup Critical/High security gap pada seluruh attack surface Core/Full MVP. | Tidak ada Critical/High open |
| P41 | 1 hari penuh | Performance & capacity | Membuktikan API/search utama memenuhi baseline latency dan capacity yang dapat dioperasikan. | NFR p95 baseline tercapai atau exception disetujui |
| P42 | 1 hari penuh | Backup/restore | Membuktikan backup dapat direstore sesuai target RPO/RTO, bukan hanya dikonfigurasi. | RPO/RTO baseline dibuktikan dengan evidence |
| P43 | 1 hari penuh | Observability | Menyediakan observability dan alert yang cukup untuk mendeteksi kegagalan queue, outbox, finalization, auth, dan storage. | Alert test dan runbook tersedia |
| P44 | 1 hari penuh | End-to-end regression | Menyediakan regression suite end-to-end untuk critical path, concurrency, dan failure injection sebelum UAT. | Release suite hijau |
| P45 | 1 hari penuh | UAT | Memvalidasi sistem terhadap proses bisnis nyata melalui UAT yang memiliki owner dan sign-off. | Sign-off pemilik proses |
| P46 | 1 hari penuh | Release remediation | Menutup seluruh release blocker hasil UAT/security/performance tanpa memperkenalkan regression baru. | Tidak ada release blocker terbuka |
| P47 | 1 hari penuh | Pilot readiness | Menyiapkan deployment, support, dan user enablement untuk pilot yang dapat dioperasikan. | Go/no-go checklist lengkap |
| P48 | 1 hari penuh | Core pilot validation | Membuktikan Core MVP bekerja di pilot environment dengan monitoring dan rollback evidence nyata. | Core pilot acceptance tercatat |
| P49 | 1 hari penuh | External Signing domain | Membuat capability External Signing yang aman tanpa memberi external recipient akses internal. | Capability tidak memberi internal access; token security tests lolos |
| P50 | 1 hari penuh | External Signing execution | Menyelesaikan External Signing end-to-end dengan challenge/consent dan signature yang terikat ke version terkunci. | Successful sign binds locked version/manifest; retry idempotent |
| P51 | 1 hari penuh | External Sign + verification integration | Mengintegrasikan hasil External Signing ke final document dan QR verification tanpa mengenakan credit untuk scan QR. | External signature dapat diverifikasi; QR scan zero-credit |
| P52 | 1 hari penuh | Billing schema & plan catalog | Menyediakan schema komersial yang eksplisit untuk plan, subscription, wallet, lot, ledger, reservation, dan billing transa... | Migration + constraints + seed plan baseline lolos |
| P53 | 1 hari penuh | Credit ledger & lot engine | Membangun credit ledger dan lot engine yang deterministic, auditable, dan dapat direbuild menjadi balance projection. | Ledger deterministic dan projection dapat direbuild |
| P54 | 1 hari penuh | Credit reservation engine | Menjamin credit tidak double-spend pada concurrency dengan lifecycle reserve → consume/release yang idempotent. | Last-credit race menghasilkan satu success; no double debit |
| P55 | 1 hari penuh | Subscription allocation & rollover | Mengotomasi monthly allocation, rollover 2-cycle/2× cap, dan trial 50 credit/30 hari secara idempotent. | Scheduler idempotent; rollover/expiry/trial tests lolos |
| P56 | 1 hari penuh | Top-up & expiry | Menyediakan top-up 12 bulan serta admin grant/reversal yang auditable dan tidak merusak ledger. | Expiry/reversal teraudit dan deterministic |
| P57 | 1 hari penuh | Billing UX | Membuat credit economy dapat dipahami user sebelum melakukan tindakan yang berbiaya. | User memahami available/reserved dan cost sebelum action |
| P58 | 1 hari penuh | Commercial E2E & reconciliation | Membuktikan External Signing, QR, dan credit accounting konsisten pada happy path maupun failure/retry. | EXT/VER/BILL mandatory suite hijau; no reconciliation mismatch |
| P59 | 1 hari penuh | Payment/operations adapter | Menyiapkan adapter payment/operational flow yang idempotent dan aman untuk commercial launch. | Duplicate/forged callback tests; commercial ops checklist lengkap |

**Estimasi perencanaan:** 60 phase × 1 hari penuh = 60 hari kerja fokus secara sekuensial. Ini bukan estimasi kalender atau jaminan waktu selesai; bila exit criteria belum tercapai phase tetap terbuka. Estimasi jam versi sebelumnya tidak berlaku untuk perencanaan v1.6.

## 4. Phase Execution Cards

## 4.A Foundation & Architecture

### P00 — Baseline & traceability (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membekukan baseline requirement dan memastikan seluruh pekerjaan implementasi dapat ditelusuri dari requirement hingga test.

**Frontend:** Kebutuhan layar dan alur dapat ditelusuri

**Dependencies**
- Dokumentasi produk dan UI/UX tersedia sebagai baseline awal.

**Scope / Pekerjaan**

**Backend:**
- Review seluruh requirement Must/Should dan tandai owner domain teknisnya.
- Sinkronkan PRD, SRS, backlog, Decision Log, dan Requirements Traceability Matrix (RTM).
- Definisikan release gates, severity blocker, dan format evidence per phase.
- Catat gap requirement yang belum punya API/data/test coverage.

**Frontend:**
- Petakan requirement ke layar, permission, state dan UAT frontend

**Deliverables**

**Backend:**
- Baseline kebutuhan, RTM awal, release gates.
- Evidence test/verification P00 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Matriks layar dan alur inti

**Test / Verification**

**Backend:**
- [ ] P00-T01 — Setiap requirement Must memiliki minimal satu owner dan trace ke backlog/test atau alasan eksplisit belum tersedia.
- [ ] P00-T02 — Tidak ada duplicate requirement ID atau Decision ID.
- [ ] P00-T03 — Release gate dan blocker criteria dapat ditemukan dari roadmap tanpa interpretasi tambahan.

**Frontend:**
- [ ] P00-FE-T01: setiap Must yang membutuhkan interaksi memiliki layar dan jalur uji

**Exit Criteria (Backend & Frontend)**  
**Backend:** Semua Must requirement memiliki owner/trace awal.

**Frontend:** Matriks layar dan alur inti selesai dan P00-FE-T01 lulus.

### P01 — Repository bootstrap (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan repository yang reproducible dan CI minimum agar seluruh phase berikutnya memiliki quality gate yang konsisten.

**Frontend:** Aplikasi React dapat dibangun di CI

**Dependencies**
- P00 selesai; fondasi API dan UI dapat dimulai bersama.

**Scope / Pekerjaan**

**Backend:**
- Bootstrap npm workspace/monorepo sesuai struktur proyek.
- Konfigurasikan TypeScript, lint, formatter, unit test runner, dan environment template.
- Buat CI skeleton untuk install, build, lint, dan test.
- Pastikan package-lock.json menjadi lockfile resmi.

**Frontend:**
- Bootstrap apps/web, routing, Tailwind CSS, shadcn/ui, token desain, generator klien API dengan fixture kontrak awal dan env publik; klien API nyata dibuat saat kontrak tersedia

**Deliverables**

**Backend:**
- npm workspace, lint, test, CI skeleton.
- Evidence test/verification P01 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- React shell dan komponen dasar

**Test / Verification**

**Backend:**
- [ ] P01-T01 — Fresh clone + npm ci berhasil tanpa perubahan lockfile.
- [ ] P01-T02 — Build, lint, dan test berjalan sukses di CI.
- [ ] P01-T03 — Commit dengan lint/test failure membuat CI gagal.

**Frontend:**
- [ ] P01-FE-T01: fresh install, lint, build dan smoke route web lulus di CI tanpa memerlukan endpoint yang belum dibuat

**Exit Criteria (Backend & Frontend)**  
**Backend:** Build/lint/test berjalan di CI.

**Frontend:** React shell dan komponen dasar selesai dan P01-FE-T01 lulus.

### P02 — Prisma/Supabase foundation (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membangun fondasi database Prisma/Supabase yang dapat dimigrasikan, di-seed, dan dipisahkan antara role runtime dan migration.

**Frontend:** Frontend siap memakai kontrak bertipe tanpa secret

**Dependencies**
- P01 selesai; generator OpenAPI/web dapat disiapkan bersama Prisma foundation.

**Scope / Pekerjaan**

**Backend:**
- Buat schema Prisma awal untuk entitas fondasi.
- Konfigurasikan DATABASE_URL/DIRECT_URL dan role migration/runtime.
- Buat migration awal serta seed master data yang idempotent.
- Dokumentasikan local/staging reset dan migration workflow.

**Frontend:**
- Siapkan generator tipe OpenAPI dan konfigurasi API per environment; buat fixture data nonrahasia

**Deliverables**

**Backend:**
- schema awal, migration, seed, runtime/migration roles.
- Evidence test/verification P02 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- API client pipeline dan env example web

**Test / Verification**

**Backend:**
- [ ] P02-T01 — Database kosong dapat dimigrasikan hingga latest tanpa manual patch.
- [ ] P02-T02 — Seed dapat dijalankan dua kali tanpa duplikasi/constraint failure.
- [ ] P02-T03 — Runtime role tidak memiliki privilege schema migration.
- [ ] P02-T04 — Prisma generate dan smoke query berhasil.

**Frontend:**
- [ ] P02-FE-T01: generated client reproducible dan tidak ada secret server di bundle

**Exit Criteria (Backend & Frontend)**  
**Backend:** Migration clean pada DB kosong + seed idempotent.

**Frontend:** API client pipeline dan env example web selesai dan P02-FE-T01 lulus.

### P03 — Auth gateway POC (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membuktikan NestJS dapat menjadi satu-satunya auth gateway browser ke Supabase Auth.

**Frontend:** Pengguna dapat login lewat web

**Dependencies**
- P02 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan login, refresh, logout, dan /me pada NestJS.
- Implementasikan resolver Email/Username/NIP ke identity Supabase Auth.
- Tentukan storage session/cookie atau bearer flow sesuai ADR.
- Petakan auth_user_id ke employee internal.

**Frontend:**
- Bangun login Email/Username/NIP, /me, refresh, logout dan protected route melalui NestJS

**Deliverables**

**Backend:**
- NestJS login/refresh/logout/me ke Supabase Auth.
- Evidence test/verification P03 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Halaman login dan sesi web

**Test / Verification**

**Backend:**
- [ ] P03-T01 — Login valid mengembalikan session yang dapat digunakan ke endpoint /me.
- [ ] P03-T02 — Browser tidak membutuhkan Supabase credential/SDK untuk login aplikasi.
- [ ] P03-T03 — Refresh menghasilkan session baru dan logout/revoke membuat session lama tidak berlaku.
- [ ] P03-T04 — Username/NIP invalid tidak membocorkan apakah account ada.

**Frontend:**
- [ ] P03-FE-T01: login, refresh dan logout browser terhadap API nyata lulus

**Exit Criteria (Backend & Frontend)**  
**Backend:** Browser tidak memerlukan direct Supabase Auth; session lifecycle diuji.

**Frontend:** Halaman login dan sesi web selesai dan P03-FE-T01 lulus.

### P04 — Auth hardening (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mengeraskan boundary autentikasi terhadap brute force, session abuse, dan konfigurasi browser yang salah.

**Frontend:** Sesi dan error autentikasi aman di browser

**Dependencies**
- P03 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Tambahkan rate limit dan generic authentication errors.
- Implementasikan suspend/revoke behavior dan session invalidation.
- Tetapkan CORS, CSRF, cookie flags, session expiry, dan trusted origins.
- Tambahkan structured auth logging tanpa secret/token.

**Frontend:**
- Tambahkan CSRF bootstrap, cookie credentials, 401/403, session expiry dan generic error UX

**Deliverables**

**Backend:**
- rate limit, generic errors, revoke/suspend behavior, CSRF/CORS policy.
- Evidence test/verification P04 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Auth error dan session boundary web

**Test / Verification**

**Backend:**
- [ ] P04-T01 — Brute-force/rate-limit test memblokir request berlebih sesuai policy.
- [ ] P04-T02 — Suspended employee tidak dapat membuat session baru dan session aktif ditolak sesuai policy.
- [ ] P04-T03 — CORS/CSRF negative tests gagal secara aman.
- [ ] P04-T04 — Log tidak mengandung password, refresh token, access token, atau PIN.

**Frontend:**
- [ ] P04-FE-T01: browser negative CSRF/CORS/session dan generic errors lulus

**Exit Criteria (Backend & Frontend)**  
**Backend:** Negative auth tests lolos.

**Frontend:** Auth error dan session boundary web selesai dan P04-FE-T01 lulus.

### P05 — Organization master (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan master organisasi yang valid sebagai dasar authorization, numbering, dan workflow.

**Frontend:** Admin dapat mengelola organisasi lewat web

**Dependencies**
- P02 selesai; P03/P04 tersedia untuk authorization endpoint.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan Company, Office, Division, dan employee assignment.
- Tambahkan offices.timezone menggunakan IANA timezone.
- Buat CRUD API dan validation untuk relasi organisasi.
- Tambahkan seed organisasi development.
- Lengkapi API registrasi/aktivasi/import/profil pengguna sesuai FR-USER-001–006 dan OpenAPI; jika scope belum selesai dalam sehari, phase tetap terbuka.

**Frontend:**
- Bangun daftar dan form company, office, division, assignment dan timezone; lengkapi UI registrasi, aktivasi, import pengguna dan profil

**Deliverables**

**Backend:**
- company/offices/divisions/assignments + `offices.timezone`.
- API onboarding pengguna dan profil yang diimplementasikan.
- Evidence test/verification P05 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Halaman administrasi organisasi, registrasi/aktivasi/import pengguna dan profil

**Test / Verification**

**Backend:**
- [ ] P05-T01 — CRUD valid mengikuti permission.
- [ ] P05-T02 — Invalid office/division relation ditolak constraint/domain validation.
- [ ] P05-T03 — Timezone non-IANA ditolak.
- [ ] P05-T04 — Deaktivasi master yang masih direferensikan mengikuti rule yang didokumentasikan.
- [ ] P05-T05 — Registrasi, aktivasi dan import Excel diuji dengan validasi baris dan izin admin.

**Frontend:**
- [ ] P05-FE-T01: CRUD organisasi, registrasi, aktivasi/import dan profil diuji melalui browser; validasi serta permission denial lulus

**Exit Criteria (Backend & Frontend)**  
**Backend:** CRUD + integrity tests lolos.

**Frontend:** Halaman organisasi, registrasi/aktivasi/import pengguna dan profil selesai; P05-FE-T01 lulus.

### P06 — Group Policy (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membangun evaluator Group Policy yang deterministik dengan precedence Deny di atas Allow.

**Frontend:** Admin dapat mengelola Group Policy lewat web

**Dependencies**
- P05 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan groups, group memberships, permissions, Allow/Deny policy.
- Buat effective-permission evaluator yang reusable pada backend guard/service.
- Tambahkan permission cache hanya jika correctness tetap terjaga.
- Dokumentasikan permission naming convention.

**Frontend:**
- Bangun group, membership, Allow/Deny dan tampilan permission efektif dari server

**Deliverables**

**Backend:**
- groups, Allow/Deny, effective permission evaluator.
- Evidence test/verification P06 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Halaman Group Policy

**Test / Verification**

**Backend:**
- [ ] P06-T01 — Allow tunggal memberi akses.
- [ ] P06-T02 — Deny mengalahkan Allow dari group lain.
- [ ] P06-T03 — User tanpa policy tidak mendapat akses default.
- [ ] P06-T04 — Perubahan membership/policy tercermin sesuai cache invalidation strategy.

**Frontend:**
- [ ] P06-FE-T01: Deny mengalahkan Allow dan UI menanggapi perubahan izin

**Exit Criteria (Backend & Frontend)**  
**Backend:** Deny precedence + permission tests lolos.

**Frontend:** Halaman Group Policy selesai dan P06-FE-T01 lulus.

### P07 — RLS runtime POC (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membuktikan strategi RLS tambahan pada Prisma aman dan layak secara performa/kompleksitas sebelum dijadikan baseline.

**Frontend:** UI menangani batas akses RLS tanpa kebocoran

**Dependencies**
- P02 dan P06 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Buat runtime DB role non-BYPASSRLS.
- Implementasikan transaction-local identity context untuk query yang dilindungi RLS.
- Tulis policy minimum dan cross-user/cross-office test.
- Benchmark authorization-only vs authorization+RLS dan tutup ADR berdasarkan evidence.

**Frontend:**
- Uji protected route, 403 dan data lintas user/office pada aplikasi web

**Deliverables**

**Backend:**
- runtime DB role, tx-local identity context, cross-user tests, benchmark authz-only vs authz+RLS.
- Evidence test/verification P07 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Negative-path akses web

**Test / Verification**

**Backend:**
- [ ] P07-T01 — Runtime role tidak memiliki BYPASSRLS.
- [ ] P07-T02 — User A tidak dapat membaca resource User B melalui query Prisma yang dilindungi.
- [ ] P07-T03 — Context request tidak bocor ke request berikutnya pada connection pool.
- [ ] P07-T04 — Benchmark p95 dan complexity trade-off terdokumentasi.

**Frontend:**
- [ ] P07-FE-T01: browser tidak menampilkan data user/office lain setelah penolakan

**Exit Criteria (Backend & Frontend)**  
**Backend:** Hasil security/performance/complexity terdokumentasi; ADR strategi RLS ditutup.

**Frontend:** Negative-path akses web selesai dan P07-FE-T01 lulus.

## 4.B Document Core & Integrity

### P08 — Document master (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan domain dokumen minimum untuk membuat, membaca, dan mengubah Draft sebelum file/workflow ditambahkan.

**Frontend:** Creator dapat membuat dan membuka Draft

**Dependencies**
- P05–P07 selesai atau authorization strategy sudah diputuskan.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan document types/subtypes dan document draft entity.
- Buat create/read/update draft API dan DTO/OpenAPI.
- Terapkan ownership/office/division permission.
- Tambahkan optimistic concurrency/version field bila diperlukan.

**Frontend:**
- Bangun daftar Dokumen Saya, langkah metadata dokumen dan edit Draft

**Deliverables**

**Backend:**
- types/subtypes + draft document API.
- Evidence test/verification P08 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Daftar dan form Draft

**Test / Verification**

**Backend:**
- [ ] P08-T01 — User berizin dapat membuat dan mengubah Draft.
- [ ] P08-T02 — User tanpa akses menerima 403/404 sesuai policy anti-enumeration.
- [ ] P08-T03 — Invalid type/subtype combination ditolak.
- [ ] P08-T04 — Non-Draft document tidak dapat diedit melalui draft endpoint.

**Frontend:**
- [ ] P08-FE-T01: create/read/update Draft via browser sesuai izin

**Exit Criteria (Backend & Frontend)**  
**Backend:** Draft create/read/update sesuai permission.

**Frontend:** Daftar dan form Draft selesai dan P08-FE-T01 lulus.

### P09 — Storage upload (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membangun upload file privat yang memiliki metadata integrity dan tidak dapat diakses tanpa authorization.

**Frontend:** Creator dapat mengunggah file secara aman

**Dependencies**
- P08 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan upload satu-per-satu ke Vercel Blob/private storage abstraction.
- Validasi filename, extension, MIME/signature, size, dan hash SHA-256.
- Simpan metadata file dan ownership/version relation.
- Implementasikan authenticated download/preview access path.

**Frontend:**
- Bangun pemilih satu file per aksi, progress, metadata dan akses file terautentikasi

**Deliverables**

**Backend:**
- private Blob metadata, upload one-by-one, hash.
- Evidence test/verification P09 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Upload web dan status file awal

**Test / Verification**

**Backend:**
- [ ] P09-T01 — File valid tersimpan beserta hash dan metadata.
- [ ] P09-T02 — Extension/MIME/signature mismatch ditolak.
- [ ] P09-T03 — Unauthorized user tidak dapat mengakses file lewat URL/API.
- [ ] P09-T04 — Hash hasil download sama dengan metadata yang disimpan.

**Frontend:**
- [ ] P09-FE-T01: upload dan akses privat/unauthorized diuji di browser

**Exit Criteria (Backend & Frontend)**  
**Backend:** Unauthorized file access gagal.

**Frontend:** Upload web dan status file awal selesai dan P09-FE-T01 lulus.

### P10 — Malware gate (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Memastikan tidak ada parser/converter memproses file sebelum malware scanning dinyatakan PASS.

**Frontend:** User memahami file yang gagal scan

**Dependencies**
- P09 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Buat scanner adapter dan status PENDING/PASS/QUARANTINED/FAILED.
- Implementasikan quarantine/fail-closed behavior.
- Blokir processing pipeline sebelum scan PASS.
- Tambahkan retry/timeout dan audit event scan.

**Frontend:**
- Tampilkan quarantine, scan pending/fail, alasan aman dan tindakan replace

**Deliverables**

**Backend:**
- scanner adapter, quarantine, fail-closed policy.
- Evidence test/verification P10 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Status malware/replace file

**Test / Verification**

**Backend:**
- [ ] P10-T01 — Fixture aman berstatus PASS dan dapat diproses.
- [ ] P10-T02 — Fixture EICAR/test-malware masuk quarantine dan tidak diteruskan ke parser.
- [ ] P10-T03 — Scanner timeout/error tidak fail-open.
- [ ] P10-T04 — Manual bypass tanpa permission tidak tersedia.

**Frontend:**
- [ ] P10-FE-T01: file belum PASS tidak dapat direview atau disubmit

**Exit Criteria (Backend & Frontend)**  
**Backend:** Parser tidak berjalan sebelum scan PASS.

**Frontend:** Status malware/replace file selesai dan P10-FE-T01 lulus.

### P11 — Queue + transactional outbox (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menjamin event/job tidak hilang saat transaksi database berhasil tetapi queue/dispatcher gagal.

**Frontend:** Status job async dapat dipantau

**Dependencies**
- P02 selesai; domain event pertama tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Tambahkan outbox_events dan publisher/dispatcher.
- Tuliskan outbox di transaksi yang sama dengan perubahan domain.
- Implementasikan retry, status, attempt_count, last_error, dan reconciliation.
- Buat idempotency key pada consumer yang relevan.

**Frontend:**
- Tampilkan queued, retry dan failure yang aman untuk processing/finalization; polling dibatasi

**Deliverables**

**Backend:**
- outbox table, dispatcher, reconciliation, idempotency.
- Evidence test/verification P11 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Status dan recovery job web

**Test / Verification**

**Backend:**
- [ ] P11-T01 — DB commit saat queue down tetap meninggalkan event yang dapat dipublish kemudian.
- [ ] P11-T02 — Duplicate publish tidak menghasilkan duplicate side effect.
- [ ] P11-T03 — Failed event dapat direconcile setelah dependency pulih.
- [ ] P11-T04 — Outbox stuck/age dapat diobservasi.

**Frontend:**
- [ ] P11-FE-T01: queue outage/retry tidak menggandakan aksi user

**Exit Criteria (Backend & Frontend)**  
**Backend:** DB commit + queue outage dapat dipulihkan tanpa duplicate effect.

**Frontend:** Status dan recovery job web selesai dan P11-FE-T01 lulus.

### P12 — PDF digital processing (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mendukung PDF digital sebagai format Core MVP dengan ekstraksi teks dan preview yang stabil.

**Frontend:** PDF digital dapat diperiksa pengguna

**Dependencies**
- P09–P11 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Validasi PDF dan page count/size limits.
- Ekstrak text layer untuk PDF digital.
- Buat preview derivative yang aman.
- Simpan processing status/result tanpa mengubah original.

**Frontend:**
- Bangun preview PDF berizin, loading dan error/corrupt state

**Deliverables**

**Backend:**
- validate/extract/preview PDF.
- Evidence test/verification P12 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Preview PDF digital

**Test / Verification**

**Backend:**
- [ ] P12-T01 — Corpus PDF digital valid selesai diproses.
- [ ] P12-T02 — PDF corrupt/encrypted/over-limit mengikuti policy error.
- [ ] P12-T03 — Original hash tidak berubah setelah processing.
- [ ] P12-T04 — Preview hanya dapat diakses user berizin.

**Frontend:**
- [ ] P12-FE-T01: fixture valid tampil; corrupt/unauthorized gagal aman

**Exit Criteria (Backend & Frontend)**  
**Backend:** Fixture PDF digital lolos.

**Frontend:** Preview PDF digital selesai dan P12-FE-T01 lulus.

### P13 — Document review UI (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menegakkan status review file sebelum submit dan menyediakan action Accept/Replace berizin.

**Frontend:** File dipreview dan diterima eksplisit

**Dependencies**
- P12 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Sediakan endpoint status processing, preview metadata dan action Accept/Replace dengan authorization.
- Blokir submit jika file wajib belum reviewed; replace membatalkan acceptance lama.
- Berikan metadata warning aman jika preview/extraction terbatas.

**Frontend:**
- Bangun status, preview, Accept/Replace dan warning ekstraksi pada wizard

**Deliverables**

**Backend:**
- API status/preview/accept/replace dan guard submit.
- Evidence test/verification P13 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Review file terintegrasi

**Test / Verification**

**Backend:**
- [ ] P13-T01 — Submit ditolak bila file mandatory belum Accepted.
- [ ] P13-T02 — Replace menginvalidasi review/status file lama.
- [ ] P13-T03 — Processing failure mengembalikan status dan recovery action yang aman.
- [ ] P13-T04 — User tanpa document access tidak dapat membuka review.

**Frontend:**
- [ ] P13-FE-T01: submit ditolak bila file belum diterima; replace membatalkan review lama

**Exit Criteria (Backend & Frontend)**  
**Backend:** File wajib berstatus reviewed sebelum submit, diverifikasi oleh server.

**Frontend:** Review file terintegrasi selesai dan P13-FE-T01 lulus.

### P14 — Participant selection (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membangun konfigurasi participant workflow yang valid sebelum dokumen dikunci.

**Frontend:** Creator dapat memilih participant valid

**Dependencies**
- P06, P08, P13 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan pemilihan Knowing dan Approver.
- Tambahkan sequence_no untuk Approver dan parallel set untuk Knowing.
- Terapkan segregation-of-duties, self-assignment, duplicate, dan active employee rules.
- Simpan participant snapshot yang diperlukan untuk audit.

**Frontend:**
- Bangun pencarian Knowing/Approver, urutan keyboard dan umpan balik konflik

**Deliverables**

**Backend:**
- Knowing/Approver selection, sequence, SoD rules.
- Evidence test/verification P14 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Participant selector

**Test / Verification**

**Backend:**
- [ ] P14-T01 — Approver sequence tersimpan deterministik.
- [ ] P14-T02 — Duplicate participant dan overlap yang dilarang ditolak.
- [ ] P14-T03 — Self-approval/SoD violation ditolak.
- [ ] P14-T04 — Employee inactive tidak dapat dipilih.

**Frontend:**
- [ ] P14-FE-T01: overlap, duplicate dan self-assignment ditolak server dan tampil jelas

**Exit Criteria (Backend & Frontend)**  
**Backend:** Overlap/self-assignment ditolak.

**Frontend:** Participant selector selesai dan P14-FE-T01 lulus.

### P15 — Canonical Document Manifest (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mendefinisikan identitas integrity dokumen secara deterministik melalui Canonical Document Manifest.

**Frontend:** Review akhir menampilkan identitas versi terkunci

**Dependencies**
- P08–P14 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Definisikan schema manifest dan canonical serialization.
- Masukkan version, issuer, canonical PDF/original file hash, attachment hash, dan metadata integrity yang disepakati.
- Hitung document_manifest_hash dengan SHA-256.
- Simpan/rekalkulasi manifest hanya pada lifecycle yang diizinkan.

**Frontend:**
- Tampilkan file/attachment, issuer dan ringkasan versi sebelum submit

**Deliverables**

**Backend:**
- canonical serialization + manifest hash.
- Evidence test/verification P15 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Panel review manifest

**Test / Verification**

**Backend:**
- [ ] P15-T01 — Input identik selalu menghasilkan canonical bytes/hash identik.
- [ ] P15-T02 — Perubahan file/attachment/metadata integrity mengubah hash.
- [ ] P15-T03 — Reordering field yang semantik sama tidak mengubah canonical output.
- [ ] P15-T04 — Fixture canonicalization lintas environment menghasilkan hash sama.

**Frontend:**
- [ ] P15-FE-T01: perubahan file/metadata memaksa review ulang sebelum tanda tangan

**Exit Criteria (Backend & Frontend)**  
**Backend:** Hash deterministic pada fixture dan berubah jika file/metadata integrity berubah.

**Frontend:** Panel review manifest selesai dan P15-FE-T01 lulus.

## 4.C Workflow, Signature & Issuance

### P16 — Creator Sign + Submit (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menghilangkan race window antara Creator signature dan submit dengan satu transaksi bisnis atomik.

**Frontend:** Creator dapat Sign & Submit sekali

**Dependencies**
- P14–P15 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan endpoint Sign+Submit tunggal.
- Validasi file reviewed, participants, permission, dan credit rules yang belum berlaku pada core internal submit.
- Hitung/freeze manifest, lock version, create Creator signature, transition state, dan audit dalam transaction.
- Tambahkan idempotency key.

**Frontend:**
- Bangun aksi tunggal, idempotency key, progress dan pencegahan double-click

**Deliverables**

**Backend:**
- atomic manifest→lock→signature→state→audit transaction.
- Evidence test/verification P16 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Alur Creator Sign & Submit

**Test / Verification**

**Backend:**
- [ ] P16-T01 — Tidak ada state persistent “Creator signed tetapi masih Draft”.
- [ ] P16-T02 — Duplicate request dengan idempotency key tidak membuat signature/audit ganda.
- [ ] P16-T03 — Perubahan file setelah lock ditolak.
- [ ] P16-T04 — Salah satu step gagal menyebabkan seluruh transaction rollback.

**Frontend:**
- [ ] P16-FE-T01: retry/double-click tidak menciptakan signed Draft atau submit ganda

**Exit Criteria (Backend & Frontend)**  
**Backend:** Tidak ada state “signed Draft”; duplicate request idempotent.

**Frontend:** Alur Creator Sign & Submit selesai dan P16-FE-T01 lulus.

### P17 — Knowing workflow (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mengimplementasikan Knowing acknowledgment paralel yang wajib selesai sebelum approval dimulai.

**Frontend:** Knowing dapat membaca, konfirmasi dan sign

**Dependencies**
- P16 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Aktifkan participant Knowing setelah submit.
- Implementasikan review + acknowledgment/signature action.
- Terapkan parallel completion dan aggregate status.
- Emit audit/outbox event pada completion.

**Frontend:**
- Bangun daftar/detail tugas dan aksi acknowledgment+signature

**Deliverables**

**Backend:**
- parallel acknowledgment + signature action.
- Evidence test/verification P17 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Halaman tugas Knowing

**Test / Verification**

**Backend:**
- [ ] P17-T01 — Semua Knowing dapat bertindak paralel.
- [ ] P17-T02 — Approval pertama tidak ACTIVE sebelum seluruh Knowing selesai.
- [ ] P17-T03 — Duplicate acknowledgment idempotent.
- [ ] P17-T04 — Knowing bukan participant tidak dapat bertindak.

**Frontend:**
- [ ] P17-FE-T01: approval tetap terkunci sampai seluruh Knowing selesai

**Exit Criteria (Backend & Frontend)**  
**Backend:** Approval blocked sampai semua Knowing selesai.

**Frontend:** Halaman tugas Knowing selesai dan P17-FE-T01 lulus.

### P18 — Sequential Approval (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mengimplementasikan sequential approval dengan tepat satu approver ACTIVE pada satu waktu.

**Frontend:** Approver aktif dapat memproses urutan

**Dependencies**
- P17 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan approve+sign atomic transaction.
- Aktifkan approver berikutnya hanya setelah current selesai.
- Gunakan constraint/locking untuk mencegah dua ACTIVE approver.
- Emit audit dan notification event.

**Frontend:**
- Bangun detail tugas, urutan, tombol Approve & Sign hanya untuk giliran aktif

**Deliverables**

**Backend:**
- one ACTIVE approver, approve+sign transaction.
- Evidence test/verification P18 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Halaman tugas Approver

**Test / Verification**

**Backend:**
- [ ] P18-T01 — Approver N+1 tidak dapat approve sebelum N selesai.
- [ ] P18-T02 — Concurrency approve tidak menghasilkan dua ACTIVE approver.
- [ ] P18-T03 — Duplicate approve tidak membuat signature ganda.
- [ ] P18-T04 — Approver non-ACTIVE ditolak.

**Frontend:**
- [ ] P18-FE-T01: browser tidak dapat mengeksekusi approver yang belum aktif

**Exit Criteria (Backend & Frontend)**  
**Backend:** Concurrency test tidak menghasilkan dua active approver.

**Frontend:** Halaman tugas Approver selesai dan P18-FE-T01 lulus.

### P19 — Reject & Withdraw (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan jalur Reject dan Withdraw yang memiliki state guard dan alasan audit yang jelas.

**Frontend:** Creator/Approver memahami finalitas reject/withdraw

**Dependencies**
- P16–P18 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan Reject pada stage yang diizinkan.
- Implementasikan Withdraw sebelum first approval sesuai rule.
- Wajibkan reason dan audit event.
- Pastikan terminal state menonaktifkan action lain.

**Frontend:**
- Bangun dialog alasan wajib, konfirmasi permanen dan status hasil

**Deliverables**

**Backend:**
- terminal reject, pre-first-approval withdraw.
- Evidence test/verification P19 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Dialog Reject dan Withdraw

**Test / Verification**

**Backend:**
- [ ] P19-T01 — Reject tanpa reason ditolak.
- [ ] P19-T02 — Withdraw setelah batas lifecycle ditolak.
- [ ] P19-T03 — Terminal document tidak dapat di-approve/sign lagi.
- [ ] P19-T04 — Reason dan actor muncul di audit.

**Frontend:**
- [ ] P19-FE-T01: alasan kosong dan withdraw sesudah approval ditolak

**Exit Criteria (Backend & Frontend)**  
**Backend:** State guards + reason audit lolos.

**Frontend:** Dialog Reject dan Withdraw selesai dan P19-FE-T01 lulus.

### P20 — Runtime permission re-check (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Memastikan participant yang dipilih saat submit tetap harus memenuhi authorization terkini ketika bertindak.

**Frontend:** Permission yang berubah segera tercermin pada aksi

**Dependencies**
- P06 dan P17–P19 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Re-check employee active status pada setiap workflow action.
- Re-check effective permission pada runtime.
- Terapkan failure state yang memicu recovery bila participant tidak lagi eligible.
- Catat denial reason secara aman.

**Frontend:**
- Refresh state tugas pada action dan tampilkan akses dicabut/blocked

**Deliverables**

**Backend:**
- active status + permission check at action time.
- Evidence test/verification P20 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Permission re-check UX

**Test / Verification**

**Backend:**
- [ ] P20-T01 — Permission dicabut setelah submit membuat action berikutnya ditolak.
- [ ] P20-T02 — Suspended employee tidak dapat sign/approve.
- [ ] P20-T03 — Participant assignment saja tidak cukup tanpa permission aktif.
- [ ] P20-T04 — Denial tidak mengubah signature/history.

**Frontend:**
- [ ] P20-FE-T01: sesi lama tidak dapat bertindak setelah izin dicabut

**Exit Criteria (Backend & Frontend)**  
**Backend:** Revoked/suspended participant tidak dapat bertindak.

**Frontend:** Permission re-check UX selesai dan P20-FE-T01 lulus.

### P21 — Workflow Recovery (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mencegah dokumen stuck permanen ketika participant tidak lagi dapat bertindak melalui recovery yang auditable.

**Frontend:** Admin berizin dapat memulihkan workflow

**Dependencies**
- P20 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Tambahkan BLOCKED/recovery state bila diperlukan.
- Implementasikan privileged Workflow.Repair.
- Ganti participant target tanpa mengubah signature/history terdahulu.
- Wajibkan reason, actor, before/after, dan notification.

**Frontend:**
- Bangun tampilan BLOCKED, pemilihan replacement, alasan dan riwayat

**Deliverables**

**Backend:**
- BLOCKED state + `Workflow.Repair` replacement action.
- Evidence test/verification P21 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Recovery workflow web

**Test / Verification**

**Backend:**
- [ ] P21-T01 — Hanya role berizin dapat melakukan repair.
- [ ] P21-T02 — Replacement mempertahankan completed participant/signature lama.
- [ ] P21-T03 — Replacement reason muncul pada audit.
- [ ] P21-T04 — Replacement baru harus memenuhi permission/active/SoD rules.

**Frontend:**
- [ ] P21-FE-T01: pengguna tanpa Workflow.Repair ditolak dan histori tetap terlihat

**Exit Criteria (Backend & Frontend)**  
**Backend:** Replacement teraudit, history/signature lama tidak berubah.

**Frontend:** Recovery workflow web selesai dan P21-FE-T01 lulus.

### P22 — Visual signature (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mendukung visual signature evidence secara privat tanpa menjadikannya reusable profile asset yang berisiko.

**Frontend:** Signer dapat memberi evidence visual sesaat

**Dependencies**
- P15–P21 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan upload evidence visual signature pada konteks action.
- Bind evidence ke signature record/document manifest/version.
- Terapkan private access dan retention policy.
- Cegah penggunaan evidence lintas action tanpa consent/rule eksplisit.

**Frontend:**
- Bangun kanvas/upload signature visual pada aksi dan review evidence

**Deliverables**

**Backend:**
- secure evidence upload + binding ke manifest.
- Evidence test/verification P22 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Input signature visual

**Test / Verification**

**Backend:**
- [ ] P22-T01 — Evidence tidak dapat diakses publik.
- [ ] P22-T02 — Evidence terhubung ke signature/document yang benar.
- [ ] P22-T03 — Evidence dari dokumen A tidak dapat dipakai ulang pada dokumen B melalui API tampering.
- [ ] P22-T04 — Invalid image/type/size ditolak.

**Frontend:**
- [ ] P22-FE-T01: evidence privat dan tidak muncul sebagai profil reusable

**Exit Criteria (Backend & Frontend)**  
**Backend:** Evidence private dan tidak reusable sebagai profile.

**Frontend:** Input signature visual selesai dan P22-FE-T01 lulus.

### P23 — Internal signature PIN (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan PIN signing internal dengan penyimpanan aman dan kontrol brute-force.

**Frontend:** Signer dapat registrasi dan memakai PIN dengan aman

**Dependencies**
- P04 dan P22 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan register/change/revoke PIN.
- Hash PIN dengan algoritma password hashing yang sesuai.
- Tambahkan rate limit, failed-attempt counter/lockout, dan re-auth rule.
- Integrasikan PIN verification di dalam signing action, bukan generic oracle endpoint.

**Frontend:**
- Bangun profil TTE internal, pembuatan PIN dan dialog PIN pada action signing

**Deliverables**

**Backend:**
- register/change/revoke, hash, rate limit/lockout.
- Evidence test/verification P23 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Registrasi dan dialog PIN

**Test / Verification**

**Backend:**
- [ ] P23-T01 — PIN tidak pernah disimpan plaintext.
- [ ] P23-T02 — Wrong PIN berulang memicu control sesuai policy.
- [ ] P23-T03 — PIN tidak muncul di log/audit payload.
- [ ] P23-T04 — Generic “is PIN valid” endpoint tidak tersedia.

**Frontend:**
- [ ] P23-FE-T01: brute-force error ditangani; PIN tidak tersimpan di browser/log

**Exit Criteria (Backend & Frontend)**  
**Backend:** PIN tidak muncul di log; brute-force controls lolos.

**Frontend:** Registrasi dan dialog PIN selesai dan P23-FE-T01 lulus.

### P24 — Signature verification (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan verifikasi integrity signature terhadap version dan document_manifest_hash.

**Frontend:** User dapat melihat hasil verifikasi integritas

**Dependencies**
- P15, P16–P23 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Buat verifier signature record ↔ signer ↔ version ↔ manifest hash.
- Tambahkan status valid/invalid/revoked sesuai domain.
- Expose verification internal yang aman.
- Tambahkan fixture tampering.

**Frontend:**
- Bangun status valid/invalid signature dan detail manifest yang aman

**Deliverables**

**Backend:**
- verify signature record ↔ manifest hash ↔ version.
- Evidence test/verification P24 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Signature verification UX

**Test / Verification**

**Backend:**
- [ ] P24-T01 — Signature valid lolos verifikasi.
- [ ] P24-T02 — File/attachment yang dimodifikasi menyebabkan manifest mismatch.
- [ ] P24-T03 — Signature yang menunjuk version lain ditolak.
- [ ] P24-T04 — Revoked/invalid signature ditampilkan dengan status yang benar.

**Frontend:**
- [ ] P24-FE-T01: tampilan tampered vs valid sesuai verifikasi server

**Exit Criteria (Backend & Frontend)**  
**Backend:** Tampered file/manifest gagal verifikasi.

**Frontend:** Signature verification UX selesai dan P24-FE-T01 lulus.

### P25 — Number reservation (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan reservasi nomor surat yang atomic, timezone-aware, dan aman terhadap concurrency.

**Frontend:** User melihat status nomor secara benar

**Dependencies**
- P05 dan P18–P24 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan numbering format/counter per scope yang disepakati.
- Gunakan offices.timezone IANA untuk period boundary.
- Reserve nomor dalam transaction dan simpan format snapshot.
- Tambahkan unique constraint/locking strategy.

**Frontend:**
- Tampilkan nomor hanya setelah reservation/issuance sesuai status; admin dapat melihat konfigurasi berizin

**Deliverables**

**Backend:**
- atomic counter, IANA timezone, snapshot format.
- Evidence test/verification P25 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Numbering status dan konfigurasi web

**Test / Verification**

**Backend:**
- [ ] P25-T01 — Parallel reservation menghasilkan nomor unik tanpa gap akibat duplicate race yang tidak valid.
- [ ] P25-T02 — Boundary bulan/tahun mengikuti timezone kantor penerbit.
- [ ] P25-T03 — Format change tidak mengubah nomor yang sudah di-reserve.
- [ ] P25-T04 — Retry idempotent mengembalikan reservation yang sama.

**Frontend:**
- [ ] P25-FE-T01: tidak ada nomor terbit palsu; akses konfigurasi ditolak tanpa izin

**Exit Criteria (Backend & Frontend)**  
**Backend:** High-concurrency numbering test unik.

**Frontend:** Numbering status dan konfigurasi web selesai dan P25-FE-T01 lulus.

### P26 — Finalization worker (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membangun finalization worker yang menghasilkan PDF final dari version terkunci dan nomor yang sudah di-reserve.

**Frontend:** User dapat memantau finalisasi dan membuka PDF

**Dependencies**
- P11, P24, P25 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Create finalization job setelah nomor berhasil di-reserve.
- Compose final PDF berisi nomor, signature visual/data yang diizinkan, dan QR placeholder/metadata sesuai desain.
- Hitung final PDF hash dan upload derivative.
- Callback internal memverifikasi job lalu menandai issued sesuai transaction.

**Frontend:**
- Bangun FINALIZING/ISSUED state dan akses PDF final berizin

**Deliverables**

**Backend:**
- reservation→job→compose final PDF→hash→callback.
- Evidence test/verification P26 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Finalization/issued view

**Test / Verification**

**Backend:**
- [ ] P26-T01 — PDF final memakai nomor reservation yang sama persis.
- [ ] P26-T02 — Worker tidak mengambil file/version yang berubah setelah lock.
- [ ] P26-T03 — Callback forged/unknown job ditolak.
- [ ] P26-T04 — Final PDF hash tersimpan dan dapat diverifikasi.

**Frontend:**
- [ ] P26-FE-T01: PDF yang ditampilkan memakai nomor reservation yang benar

**Exit Criteria (Backend & Frontend)**  
**Backend:** PDF final memakai nomor reservation yang benar.

**Frontend:** Finalization/issued view selesai dan P26-FE-T01 lulus.

### P27 — Finalization recovery (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menjamin kegagalan finalization dapat dipulihkan tanpa membuat nomor baru atau mendaur ulang nomor VOID.

**Frontend:** User memahami retry/VOID tanpa nomor baru

**Dependencies**
- P26 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan retry idempotent finalization.
- Definisikan permanent-failure threshold dan reservation VOID.
- Pastikan nomor VOID tidak reused.
- Sediakan admin retry/reconciliation operation yang teraudit.

**Frontend:**
- Bangun status retry, failed dan VOID dengan tindakan operasional berizin

**Deliverables**

**Backend:**
- idempotent retry, VOID permanent failure.
- Evidence test/verification P27 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Finalization recovery UX

**Test / Verification**

**Backend:**
- [ ] P27-T01 — Retry worker memakai reservation/job logical yang sama.
- [ ] P27-T02 — Permanent failure mengubah reservation ke VOID sesuai policy.
- [ ] P27-T03 — Counter tidak pernah mengalokasikan ulang nomor VOID.
- [ ] P27-T04 — Duplicate callback tidak mengubah state dua kali.

**Frontend:**
- [ ] P27-FE-T01: retry tidak menampilkan nomor baru; VOID tidak dapat dipakai ulang

**Exit Criteria (Backend & Frontend)**  
**Backend:** Retry tidak membuat nomor baru; VOID tidak reused.

**Frontend:** Finalization recovery UX selesai dan P27-FE-T01 lulus.

### P28 — Verification token/page (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan public verification token/page yang memverifikasi dokumen tanpa membocorkan dokumen privat.

**Frontend:** Penerima dapat memverifikasi QR secara publik

**Dependencies**
- P24–P27 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Generate random purpose-scoped verification token dan simpan hash/identifier yang aman.
- Buat public verification endpoint/page dengan metadata allowlist.
- Tampilkan valid/issued/revoked status dan signature summary yang diperbolehkan.
- Tambahkan revoke/rotate behavior bila diperlukan.

**Frontend:**
- Bangun halaman verification token dengan metadata yang dibatasi

**Deliverables**

**Backend:**
- purpose-scoped verification token + metadata page.
- Evidence test/verification P28 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Public verification page

**Test / Verification**

**Backend:**
- [ ] P28-T01 — Token valid menampilkan metadata allowlist yang benar.
- [ ] P28-T02 — Token random/expired/revoked tidak membocorkan keberadaan dokumen.
- [ ] P28-T03 — Page tidak mengungkap private PDF/file URL.
- [ ] P28-T04 — Token tidak dapat digunakan sebagai credential ke endpoint internal.

**Frontend:**
- [ ] P28-FE-T01: expired/invalid token dan dokumen privat tidak bocor

**Exit Criteria (Backend & Frontend)**  
**Backend:** Token tidak membocorkan dokumen privat.

**Frontend:** Public verification page selesai dan P28-FE-T01 lulus.

## 4.D Notification, Archive & Audit

### P29 — Notifications (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan notification domain event-driven tanpa duplicate user-visible notification.

**Frontend:** User melihat notifikasi tanpa duplikasi

**Dependencies**
- P11 dan workflow core selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Definisikan notification event types dan recipient resolver.
- Implementasikan in-app notification persistence/read state.
- Hubungkan outbox consumer ke notification creation.
- Tambahkan deduplication key.
- Sediakan endpoint ringkasan dashboard yang menghitung tugas/dokumen hanya dalam cakupan izin pengguna.

**Frontend:**
- Bangun notification bell/list, unread/read, dashboard tugas/dokumen yang authorized dan navigasi berizin

**Deliverables**

**Backend:**
- in-app + event-driven delivery skeleton.
- Dashboard summary API yang authorized.
- Evidence test/verification P29 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Notifikasi in-app dan dashboard web

**Test / Verification**

**Backend:**
- [ ] P29-T01 — Event workflow menghasilkan notification ke recipient yang benar.
- [ ] P29-T02 — Duplicate outbox delivery tidak menggandakan notification.
- [ ] P29-T03 — Unauthorized user tidak dapat membaca notification user lain.
- [ ] P29-T04 — Mark-as-read idempotent.
- [ ] P29-T05 — Ringkasan dashboard tidak mengungkap jumlah/judul dokumen tanpa izin.

**Frontend:**
- [ ] P29-FE-T01: duplicate event tidak menggandakan notifikasi; dashboard tidak menampilkan tugas/dokumen tanpa akses

**Exit Criteria (Backend & Frontend)**  
**Backend:** Duplicate outbox tidak menggandakan user-visible notification.

**Frontend:** Notifikasi in-app dan dashboard web selesai dan P29-FE-T01 lulus.

### P30 — Email delivery (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan email delivery adapter yang retryable dan tidak memblokir transaksi workflow.

**Frontend:** Email membawa user ke halaman yang tepat

**Dependencies**
- P29 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Buat provider abstraction dan template dasar.
- Simpan delivery attempt/status/provider message ID.
- Implementasikan retry/backoff dan terminal failure.
- Pisahkan email failure dari workflow state.

**Frontend:**
- Bangun deep-link tujuan notifikasi dengan session/capability checks dan error state

**Deliverables**

**Backend:**
- provider adapter, retry, delivery records.
- Evidence test/verification P30 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Email landing UX

**Test / Verification**

**Backend:**
- [ ] P30-T01 — Successful event mengirim email sesuai template.
- [ ] P30-T02 — Provider failure memicu retry tanpa rollback workflow.
- [ ] P30-T03 — Duplicate event tidak mengirim email ganda bila dedupe berlaku.
- [ ] P30-T04 — Email log tidak berisi token sensitif lebih dari kebutuhan link capability.

**Frontend:**
- [ ] P30-FE-T01: link valid/expired tidak melewati auth dan tidak bocor ke layar lain

**Exit Criteria (Backend & Frontend)**  
**Backend:** Failure/retry tercatat tanpa blocking workflow.

**Frontend:** Email landing UX selesai dan P30-FE-T01 lulus.

### P31 — Archive & metadata search (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan archive dan metadata search yang authorized dan performant untuk dokumen yang dapat diakses user.

**Frontend:** User dapat mencari dokumen yang boleh diakses

**Dependencies**
- P08–P30 core data tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Buat archive list, pagination, filter, sort, dan metadata search.
- Tambahkan index berdasarkan query pattern nyata.
- Terapkan authorization/RLS sebelum hasil search dikembalikan.
- Tetapkan p95 baseline awal.

**Frontend:**
- Bangun arsip, filter, pagination, pencarian dan aksi view/download/export terpisah

**Deliverables**

**Backend:**
- archive list/filter/search terindeks.
- Evidence test/verification P31 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Archive/search web

**Test / Verification**

**Backend:**
- [ ] P31-T01 — Search hanya mengembalikan dokumen yang user boleh lihat.
- [ ] P31-T02 — Pagination/sort stabil dan deterministic.
- [ ] P31-T03 — Query umum memenuhi target p95 baseline pada dataset test.
- [ ] P31-T04 — Search term malicious tidak menyebabkan injection/error leak.

**Frontend:**
- [ ] P31-FE-T01: hasil pencarian dan tindakan mengikuti permission masing-masing

**Exit Criteria (Backend & Frontend)**  
**Backend:** Authorization + p95 target awal tercapai.

**Frontend:** Archive/search web selesai dan P31-FE-T01 lulus.

### P32 — Audit hardening (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mengeraskan audit log agar application-immutable, terstruktur, minim data sensitif, dan dapat diekspor oleh role berizin.

**Frontend:** Auditor berizin dapat melihat log

**Dependencies**
- Audit event core dari P03–P31 tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Standarkan audit event schema dan resource correlation.
- Gunakan allowlist before/after, bukan raw request dump.
- Blokir update/delete dari role aplikasi normal.
- Implementasikan export dengan permission khusus.

**Frontend:**
- Bangun audit viewer/filter/export serta redaksi detail sensitif

**Deliverables**

**Backend:**
- application-immutable audit, allowlisted before/after, export permission.
- Evidence test/verification P32 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Audit log web

**Test / Verification**

**Backend:**
- [ ] P32-T01 — Role aplikasi tidak dapat update/delete audit row.
- [ ] P32-T02 — PIN, token, password, dan document content sensitif tidak masuk audit.
- [ ] P32-T03 — Export hanya tersedia untuk permission yang tepat.
- [ ] P32-T04 — Critical workflow event memiliki actor/time/resource correlation.

**Frontend:**
- [ ] P32-FE-T01: unauthorized export ditolak dan PIN/token tidak ditampilkan

**Exit Criteria (Backend & Frontend)**  
**Backend:** PIN/token/content sensitif tidak masuk audit.

**Frontend:** Audit log web selesai dan P32-FE-T01 lulus.

## 4.E Advanced Processing, Template & Form

### P33 — Office conversion POC (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membuktikan kualitas dan batasan konversi Office sebelum jalur production diaktifkan.

**Frontend:** User dapat menilai fidelity Office pada POC

**Dependencies**
- P10–P13 worker/processing foundation tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Bangun fixture corpus DOC/DOCX/XLS/XLSX representatif.
- POC LibreOffice/engine conversion ke PDF.
- Catat fidelity issue: font, pagination, formula, print area, object/embed.
- Tetapkan acceptance threshold dan unsupported cases.

**Frontend:**
- Bangun preview fixture DOC/XLS, warning layout dan pilihan sheet yang perlu dibuktikan

**Deliverables**

**Backend:**
- DOC/DOCX/XLS/XLSX → PDF fixture corpus.
- Evidence test/verification P33 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Office preview POC web

**Test / Verification**

**Backend:**
- [ ] P33-T01 — Corpus representative menghasilkan PDF tanpa crash.
- [ ] P33-T02 — Fidelity issue per fixture terdokumentasi.
- [ ] P33-T03 — Unsupported/unsafe file menghasilkan controlled error.
- [ ] P33-T04 — Resource usage baseline tercatat.

**Frontend:**
- [ ] P33-FE-T01: mismatch layout ditunjukkan kepada reviewer sebelum acceptance

**Exit Criteria (Backend & Frontend)**  
**Backend:** Fidelity limitations terdokumentasi dan acceptable.

**Frontend:** Office preview POC web selesai dan P33-FE-T01 lulus.

### P34 — Office processing production path (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mengubah POC Office conversion menjadi pipeline production yang dibatasi resource dan dapat diretry.

**Frontend:** User dapat review hasil konversi Office

**Dependencies**
- P33 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Integrasikan conversion ke worker queue.
- Tambahkan CPU/memory/time/page/sheet limits.
- Simpan rendered PDF/preview derivative dan status.
- Implementasikan retry/dead-letter serta cleanup temp file.

**Frontend:**
- Integrasikan progress, preview, replace dan failure/retry jalur produksi

**Deliverables**

**Backend:**
- worker conversion + limits + preview.
- Evidence test/verification P34 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Office processing UI

**Test / Verification**

**Backend:**
- [ ] P34-T01 — Supported Office file selesai diproses end-to-end.
- [ ] P34-T02 — Over-limit file dihentikan tanpa mengganggu worker lain.
- [ ] P34-T03 — Retry tidak membuat derivative duplikat.
- [ ] P34-T04 — Dead-letter/recovery path dapat dioperasikan.

**Frontend:**
- [ ] P34-FE-T01: file Office valid dapat dipreview/review end-to-end

**Exit Criteria (Backend & Frontend)**  
**Backend:** Retry/dead-letter/resource limits diuji.

**Frontend:** Office processing UI selesai dan P34-FE-T01 lulus.

### P35 — OCR fallback (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan OCR fallback untuk PDF scan dengan label human-review sehingga hasil OCR tidak dianggap authoritative.

**Frontend:** User tahu hasil OCR perlu diperiksa

**Dependencies**
- P12 dan worker production path tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Deteksi PDF dengan text layer minim/tidak ada.
- Jalankan OCR fallback dengan language/config baseline.
- Simpan confidence/metadata dan label requires review.
- Batasi OCR resource/time/page.

**Frontend:**
- Tampilkan badge OCR, confidence/keterbatasan dan review manual

**Deliverables**

**Backend:**
- PDF scan detection + OCR + human-review label.
- Evidence test/verification P35 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- OCR review UX

**Test / Verification**

**Backend:**
- [ ] P35-T01 — PDF digital tidak menjalankan OCR yang tidak perlu.
- [ ] P35-T02 — PDF scan menghasilkan OCR text dan label review.
- [ ] P35-T03 — Low-confidence OCR tidak otomatis dianggap data authoritative.
- [ ] P35-T04 — OCR timeout mengikuti retry/failure policy.

**Frontend:**
- [ ] P35-FE-T01: OCR low-confidence tidak tampil sebagai nilai authoritative

**Exit Criteria (Backend & Frontend)**  
**Backend:** OCR result tidak dianggap authoritative.

**Frontend:** OCR review UX selesai dan P35-FE-T01 lulus.

### P36 — Extraction/full-text (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan full-text extraction/search yang tetap tunduk pada authorization dokumen.

**Frontend:** Pencarian isi hanya mengungkap yang berizin

**Dependencies**
- P12, P34, P35 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Normalisasi dan simpan extracted text/index.
- Implementasikan content search endpoint/query.
- Terapkan authorization sebelum/snippet retrieval.
- Definisikan re-index/reprocessing behavior.

**Frontend:**
- Bangun query/snippet dan state indeks tertunda pada arsip

**Deliverables**

**Backend:**
- extraction storage + authorized content search.
- Evidence test/verification P36 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Full-text search web

**Test / Verification**

**Backend:**
- [ ] P36-T01 — Search menemukan istilah dari extracted content fixture.
- [ ] P36-T02 — User tanpa akses dokumen tidak mendapat hit/snippet.
- [ ] P36-T03 — Re-index tidak menghasilkan duplicate index state.
- [ ] P36-T04 — Sensitive extracted text tidak masuk log.

**Frontend:**
- [ ] P36-FE-T01: query dari user tanpa izin tidak menampilkan hit/snippet

**Exit Criteria (Backend & Frontend)**  
**Backend:** Extracted text tidak bocor lintas permission.

**Frontend:** Full-text search web selesai dan P36-FE-T01 lulus.

### P37 — Template versioning (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan template yang versioned dan provenance-nya tersimpan pada dokumen.

**Frontend:** Admin dapat menerbitkan template versioned

**Dependencies**
- P08 dan processing/document model stabil.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan template CRUD, draft/version/publish lifecycle.
- Immutable published version atau versioning rule yang jelas.
- Hubungkan document version ke template_version yang digunakan.
- Tambahkan permission template management.

**Frontend:**
- Bangun daftar, edit metadata, publish dan pemilihan template pada wizard

**Deliverables**

**Backend:**
- template CRUD/version/publish.
- Evidence test/verification P37 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Template management web

**Test / Verification**

**Backend:**
- [ ] P37-T01 — Publish menghasilkan version yang dapat direferensikan dokumen.
- [ ] P37-T02 — Update template tidak mengubah provenance dokumen lama.
- [ ] P37-T03 — Unauthorized user tidak dapat publish/edit.
- [ ] P37-T04 — Invalid template lifecycle transition ditolak.

**Frontend:**
- [ ] P37-FE-T01: versi lama tetap dapat ditelusuri dan publish tanpa izin ditolak

**Exit Criteria (Backend & Frontend)**  
**Backend:** Document menyimpan template-version provenance.

**Frontend:** Template management web selesai dan P37-FE-T01 lulus.

### P38 — Basic editor (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan basic editor dengan content model yang dapat disanitasi dan dipreview secara aman.

**Frontend:** Creator dapat mengedit dan mempreview konten

**Dependencies**
- P37 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Pilih/implement editor content model minimum.
- Sanitize HTML/rich content pada server dan/atau render boundary.
- Generate preview yang konsisten dengan content model.
- Batasi embedded content/external link sesuai security policy.

**Frontend:**
- Bangun editor React dengan Tailwind CSS/shadcn/ui, toolbar keyboard, sanitasi tampilan dan preview responsif

**Deliverables**

**Backend:**
- content model, sanitasi server dan preview contract.
- Evidence test/verification P38 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Basic editor web

**Test / Verification**

**Backend:**
- [ ] P38-T01 — Stored XSS fixture disanitasi/ditolak.
- [ ] P38-T02 — Content valid round-trip tanpa corruption.
- [ ] P38-T03 — Preview tidak mengeksekusi script/external unsafe content.
- [ ] P38-T04 — Permission edit/publish dipatuhi.

**Frontend:**
- [ ] P38-FE-T01: XSS dan round-trip diuji dari browser terhadap API nyata

**Exit Criteria (Backend & Frontend)**  
**Backend:** Stored XSS, round-trip dan preview contract tests lolos.

**Frontend:** Basic editor web selesai dan P38-FE-T01 lulus.

### P39 — Form Builder (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan Form Builder versioned yang submission-nya dapat ditelusuri ke dokumen/version hasil.

**Frontend:** Admin dapat membuat form dan user dapat mengisi

**Dependencies**
- P37–P38 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan form definition/version/field types minimum.
- Validasi submission terhadap schema/version.
- Generate/link document dari submission.
- Simpan provenance form_submission → form_version → document/version.

**Frontend:**
- Bangun form builder versioned, field validation dan submission

**Deliverables**

**Backend:**
- form version/fields/submission→document provenance dan validation API.
- Evidence test/verification P39 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Form Builder dan form fill web

**Test / Verification**

**Backend:**
- [ ] P39-T01 — Submission valid menghasilkan data/document sesuai mapping.
- [ ] P39-T02 — Invalid required/type constraint ditolak.
- [ ] P39-T03 — Edit form baru tidak mengubah submission lama.
- [ ] P39-T04 — Provenance dapat ditelusuri dua arah.

**Frontend:**
- [ ] P39-FE-T01: submission valid/invalid dan provenance diuji via browser

**Exit Criteria (Backend & Frontend)**  
**Backend:** Submission dapat ditelusuri ke version/document melalui API dan data model.

**Frontend:** Form Builder dan form fill web selesai dan P39-FE-T01 lulus.

## 4.F Hardening, UAT & Pilot

### P40 — Security hardening (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menutup Critical/High security gap pada seluruh attack surface Core/Full MVP.

**Frontend:** Web terlindung dari permukaan serangan utama

**Dependencies**
- Feature set P00–P39 tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Lakukan IDOR/BOLA testing endpoint sensitif.
- Review CSP, iframe sandbox, upload/download, token/capability, CORS/CSRF.
- Jalankan dependency/secret scan dan abuse-case testing.
- Triase/fix Critical/High atau dokumentasikan formal acceptance.

**Frontend:**
- Periksa CSP, XSS, CSRF, clickjacking, token leakage, IDOR melalui UI

**Deliverables**

**Backend:**
- IDOR, CSP/sandbox, secret scan, abuse tests.
- Evidence test/verification P40 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Remediasi security frontend

**Test / Verification**

**Backend:**
- [ ] P40-T01 — IDOR test lintas user/office/company scope gagal secara aman.
- [ ] P40-T02 — Secret scanner tidak menemukan production credential.
- [ ] P40-T03 — XSS/capability-token abuse fixture tidak menghasilkan privilege escalation.
- [ ] P40-T04 — Tidak ada Critical/High open tanpa acceptance formal.

**Frontend:**
- [ ] P40-FE-T01: security regression browser lulus tanpa blocker Critical/High

**Exit Criteria (Backend & Frontend)**  
**Backend:** Tidak ada Critical/High open.

**Frontend:** Remediasi security frontend selesai dan P40-FE-T01 lulus.

### P41 — Performance & capacity (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membuktikan API/search utama memenuhi baseline latency dan capacity yang dapat dioperasikan.

**Frontend:** Alur web memenuhi target performa

**Dependencies**
- P31 dan feature set utama tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Definisikan workload representative dan test dataset.
- Load test auth, document list/detail, search, workflow action, verification.
- Profiling query/index/connection pool.
- Tune bottleneck dan dokumentasikan capacity envelope.

**Frontend:**
- Ukur bundle, render, daftar/pencarian, serta kondisi jaringan realistis

**Deliverables**

**Backend:**
- load tests common API/search, indexes.
- Evidence test/verification P41 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Benchmark frontend dan optimasi

**Test / Verification**

**Backend:**
- [ ] P41-T01 — Common API memenuhi p95 target baseline atau exception formal.
- [ ] P41-T02 — Error rate tetap di bawah threshold pada target concurrency.
- [ ] P41-T03 — Tidak ada unbounded query/N+1 kritis pada hot path.
- [ ] P41-T04 — Capacity result reproducible dan tersimpan sebagai evidence.

**Frontend:**
- [ ] P41-FE-T01: target UI p95 ditetapkan/dibuktikan atau exception disetujui

**Exit Criteria (Backend & Frontend)**  
**Backend:** NFR p95 baseline tercapai atau exception disetujui.

**Frontend:** Benchmark frontend dan optimasi selesai dan P41-FE-T01 lulus.

### P42 — Backup/restore (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membuktikan backup dapat direstore sesuai target RPO/RTO, bukan hanya dikonfigurasi.

**Frontend:** Web tetap benar setelah restore data

**Dependencies**
- Database/storage schema cukup stabil.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Tetapkan backup schedule/retention untuk DB dan file metadata/storage strategy.
- Lakukan restore drill ke environment terisolasi.
- Verifikasi relational integrity, file references, dan critical records.
- Dokumentasikan RPO/RTO evidence dan runbook.

**Frontend:**
- Jalankan smoke login, dokumen dan arsip terhadap database hasil restore

**Deliverables**

**Backend:**
- backup policy + restore drill.
- Evidence test/verification P42 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Restore smoke frontend

**Test / Verification**

**Backend:**
- [ ] P42-T01 — Restore database berhasil dari backup yang dipilih.
- [ ] P42-T02 — Sample document/file/signature/ledger references konsisten setelah restore.
- [ ] P42-T03 — Measured RPO/RTO memenuhi baseline atau exception formal.
- [ ] P42-T04 — Runbook dapat diikuti oleh operator selain author.

**Frontend:**
- [ ] P42-FE-T01: UI membaca data restored konsisten dengan API

**Exit Criteria (Backend & Frontend)**  
**Backend:** RPO/RTO baseline dibuktikan dengan evidence.

**Frontend:** Restore smoke frontend selesai dan P42-FE-T01 lulus.

### P43 — Observability (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan observability dan alert yang cukup untuk mendeteksi kegagalan queue, outbox, finalization, auth, dan storage.

**Frontend:** Kegagalan client terpantau tanpa data sensitif

**Dependencies**
- P11, P26, P30, P41–P42 tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Definisikan metrics/log correlation/health checks.
- Tambahkan alert untuk queue age, outbox backlog, finalization failures, auth anomalies, storage errors.
- Buat dashboard dan runbook per alert utama.
- Uji alert routing.

**Frontend:**
- Tambahkan error boundary, correlation/request ID dan metrik error frontend

**Deliverables**

**Backend:**
- metrics/alerts queue, outbox, finalization, auth, storage.
- Evidence test/verification P43 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Observability web

**Test / Verification**

**Backend:**
- [ ] P43-T01 — Synthetic queue/outbox failure memicu alert.
- [ ] P43-T02 — Request/job dapat ditelusuri melalui correlation ID.
- [ ] P43-T03 — Alert memiliki actionable runbook.
- [ ] P43-T04 — Sensitive data tidak terekspos pada observability payload.

**Frontend:**
- [ ] P43-FE-T01: simulasi error memunculkan alert tanpa token/PIN/isi dokumen

**Exit Criteria (Backend & Frontend)**  
**Backend:** Alert test dan runbook tersedia.

**Frontend:** Observability web selesai dan P43-FE-T01 lulus.

### P44 — End-to-end regression (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan regression suite end-to-end untuk critical path, concurrency, dan failure injection sebelum UAT.

**Frontend:** Alur inti browser tahan regression

**Dependencies**
- P00–P43 feature/hardening selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Automasi critical user journey dari login hingga issued/verified.
- Gabungkan concurrency test numbering/workflow/outbox.
- Tambahkan failure injection queue/worker/storage/provider.
- Stabilkan fixture dan environment test.

**Frontend:**
- Jalankan E2E create-to-issued, unauthorized, concurrency dan retry

**Deliverables**

**Backend:**
- critical path E2E + concurrency + failure injection.
- Evidence test/verification P44 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- E2E web suite

**Test / Verification**

**Backend:**
- [ ] P44-T01 — Core happy path E2E hijau.
- [ ] P44-T02 — Reject/Withdraw/Recovery path E2E hijau.
- [ ] P44-T03 — Concurrency suite numbering/approval hijau.
- [ ] P44-T04 — Failure injection tidak menghasilkan corrupt/duplicate business state.

**Frontend:**
- [ ] P44-FE-T01: suite browser real-API hijau di CI/staging

**Exit Criteria (Backend & Frontend)**  
**Backend:** Release suite hijau.

**Frontend:** E2E web suite selesai dan P44-FE-T01 lulus.

### P45 — UAT (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Memvalidasi sistem terhadap proses bisnis nyata melalui UAT yang memiliki owner dan sign-off.

**Frontend:** Pengguna bisnis menerima pengalaman web

**Dependencies**
- P44 hijau.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Siapkan UAT script per persona dan business scenario.
- Jalankan core workflow, advanced processing, recovery, search/audit.
- Catat defect dengan severity/owner.
- Dapatkan sign-off atau daftar blocker formal.

**Frontend:**
- Jalankan UAT desktop/mobile untuk Creator, Knowing, Approver, Admin, auditor

**Deliverables**

**Backend:**
- UAT core + advanced processing + recovery.
- Evidence test/verification P45 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- UAT antarmuka dan sign-off

**Test / Verification**

**Backend:**
- [ ] P45-T01 — Seluruh UAT Must scenario memiliki hasil Pass/Fail.
- [ ] P45-T02 — UAT blocker memiliki owner dan disposition.
- [ ] P45-T03 — Sign-off pemilik proses terdokumentasi.

**Frontend:**
- [ ] P45-FE-T01: skenario UAT ditandatangani owner bisnis

**Exit Criteria (Backend & Frontend)**  
**Backend:** Sign-off pemilik proses.

**Frontend:** UAT antarmuka dan sign-off selesai dan P45-FE-T01 lulus.

### P46 — Release remediation (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menutup seluruh release blocker hasil UAT/security/performance tanpa memperkenalkan regression baru.

**Frontend:** Defect web release-blocking ditutup

**Dependencies**
- P40–P45 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Fix blocker berdasarkan severity.
- Tambahkan regression test untuk setiap defect kritis.
- Re-run affected security/performance/E2E suite.
- Freeze release candidate.

**Frontend:**
- Perbaiki UI/API contract mismatch dan regression hasil UAT/security

**Deliverables**

**Backend:**
- fix blocker UAT/security/performance.
- Evidence test/verification P46 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Frontend remediation

**Test / Verification**

**Backend:**
- [ ] P46-T01 — Tidak ada release blocker open.
- [ ] P46-T02 — Setiap blocker fixed memiliki regression test/evidence.
- [ ] P46-T03 — Release candidate lulus suite yang terdampak.

**Frontend:**
- [ ] P46-FE-T01: regression browser hijau tanpa blocker terbuka

**Exit Criteria (Backend & Frontend)**  
**Backend:** Tidak ada release blocker terbuka.

**Frontend:** Frontend remediation selesai dan P46-FE-T01 lulus.

### P47 — Pilot readiness (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyiapkan deployment, support, dan user enablement untuk pilot yang dapat dioperasikan.

**Frontend:** Web siap di-deploy untuk pilot

**Dependencies**
- P46 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Lengkapi deployment/go-live checklist.
- Finalisasi support escalation dan operational runbook.
- Siapkan training/admin/user material.
- Pastikan monitoring, backup, rollback, migration plan siap.

**Frontend:**
- Siapkan build cPanel, SPA fallback, domain, HTTPS, CORS/cookie/CSRF smoke

**Deliverables**

**Backend:**
- deployment checklist, support/runbook, training material.
- Evidence test/verification P47 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Pilot web release package

**Test / Verification**

**Backend:**
- [ ] P47-T01 — Go/no-go checklist lengkap dan owner ditetapkan.
- [ ] P47-T02 — Dry-run deployment/migration mengikuti runbook.
- [ ] P47-T03 — Support escalation contact/process tervalidasi.

**Frontend:**
- [ ] P47-FE-T01: staging domain browser login/refresh/deep-link lulus

**Exit Criteria (Backend & Frontend)**  
**Backend:** Go/no-go checklist lengkap.

**Frontend:** Pilot web release package selesai dan P47-FE-T01 lulus.

### P48 — Core pilot validation (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membuktikan Core MVP bekerja di pilot environment dengan monitoring dan rollback evidence nyata.

**Frontend:** Alur web terbukti pada pilot nyata

**Dependencies**
- P47 selesai dan go decision tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Deploy pilot release.
- Jalankan production smoke test dan sample workflow.
- Monitor error/latency/queue/storage.
- Validasi rollback/recovery readiness dan catat pilot acceptance.

**Frontend:**
- Pantau penggunaan alur inti, error, mobile dan rollback frontend

**Deliverables**

**Backend:**
- production smoke, monitoring, rollback evidence.
- Evidence test/verification P48 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Pilot UI evidence

**Test / Verification**

**Backend:**
- [ ] P48-T01 — Production smoke critical path berhasil.
- [ ] P48-T02 — Monitoring menerima metrics/log pilot.
- [ ] P48-T03 — Rollback procedure telah dibuktikan atau dry-run evidence tersedia.
- [ ] P48-T04 — Pilot acceptance/issues terdokumentasi.

**Frontend:**
- [ ] P48-FE-T01: pilot acceptance/rollback smoke tercatat

**Exit Criteria (Backend & Frontend)**  
**Backend:** Core pilot acceptance tercatat.

**Frontend:** Pilot UI evidence selesai dan P48-FE-T01 lulus.

## 4.G External Signing & Credit Commercialization

### P49 — External Signing domain (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membuat capability External Signing yang aman tanpa memberi external recipient akses internal.

**Frontend:** Internal user dapat mengundang external signer

**Dependencies**
- P28 public capability pattern dan core signature model tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Tambahkan external_signing_request domain dan lifecycle.
- Generate high-entropy token; simpan token hash/lookup identifier sesuai desain.
- Implementasikan expiry, revoke, recipient binding, dan resend policy.
- Pisahkan public capability route dari internal auth route.

**Frontend:**
- Bangun form penerima, status request dan konfirmasi konsekuensi credit

**Deliverables**

**Backend:**
- request/token model, hashed token, expiry/revoke, permission.
- Evidence test/verification P49 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- External request UI

**Test / Verification**

**Backend:**
- [ ] P49-T01 — Token valid hanya mengakses request/document yang dituju.
- [ ] P49-T02 — Token expired/revoked/random ditolak tanpa data leak.
- [ ] P49-T03 — Token tidak dapat digunakan pada API internal.
- [ ] P49-T04 — Brute-force/enumeration test memenuhi rate-limit policy.

**Frontend:**
- [ ] P49-FE-T01: capability token tidak tampil di UI/log dan izin internal diuji

**Exit Criteria (Backend & Frontend)**  
**Backend:** Capability tidak memberi internal access; token security tests lolos.

**Frontend:** External request UI selesai dan P49-FE-T01 lulus.

### P50 — External Signing execution (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyelesaikan External Signing end-to-end dengan challenge/consent dan signature yang terikat ke version terkunci.

**Frontend:** Penerima luar dapat sign melalui tautan terbatas

**Dependencies**
- P49 dan signature integrity core selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Buat public review flow dan recipient consent.
- Integrasikan OTP/challenge adapter sesuai policy.
- Implementasikan atomic external sign transaction.
- Simpan authentication context/evidence minimum dan audit.

**Frontend:**
- Bangun review, challenge, consent dan sign publik dengan error expired/revoked

**Deliverables**

**Backend:**
- challenge/OTP adapter, public review, consent, atomic sign.
- Evidence test/verification P50 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Public external sign web

**Test / Verification**

**Backend:**
- [ ] P50-T01 — Successful signer menghasilkan signature pada locked version/manifest yang benar.
- [ ] P50-T02 — Wrong/expired OTP/challenge ditolak.
- [ ] P50-T03 — Duplicate submit idempotent dan tidak membuat signature ganda.
- [ ] P50-T04 — Recipient tidak dapat mengganti target signer/document melalui request tampering.

**Frontend:**
- [ ] P50-FE-T01: valid/expired/used token diuji tanpa sesi internal

**Exit Criteria (Backend & Frontend)**  
**Backend:** Successful sign binds locked version/manifest; retry idempotent.

**Frontend:** Public external sign web selesai dan P50-FE-T01 lulus.

### P51 — External Sign + verification integration (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mengintegrasikan hasil External Signing ke final document dan QR verification tanpa mengenakan credit untuk scan QR.

**Frontend:** Hasil external sign dapat diverifikasi

**Dependencies**
- P28, P50 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Tampilkan external signature summary pada final/verification representation sesuai privacy allowlist.
- Update verification status berdasarkan external signing lifecycle.
- Pastikan public QR scan tidak membuat debit/reservation credit.
- Tambahkan audit/metrics QR verification non-billing.

**Frontend:**
- Tampilkan evidence/status external signer pada dokumen dan verification page

**Deliverables**

**Backend:**
- final signature display, QR/public verification status.
- Evidence test/verification P51 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- External sign verification UX

**Test / Verification**

**Backend:**
- [ ] P51-T01 — Signature external valid terlihat pada verification sesuai policy.
- [ ] P51-T02 — QR scan 1x maupun berulang tidak mengubah credit ledger/balance.
- [ ] P51-T03 — Revoked/invalid external signing status direfleksikan dengan benar.
- [ ] P51-T04 — QR page tidak membocorkan OTP/token/contact sensitif.

**Frontend:**
- [ ] P51-FE-T01: signature valid tampil; QR scan tidak mengubah credit

**Exit Criteria (Backend & Frontend)**  
**Backend:** External signature dapat diverifikasi; QR scan zero-credit.

**Frontend:** External sign verification UX selesai dan P51-FE-T01 lulus.

### P52 — Billing schema & plan catalog (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan schema komersial yang eksplisit untuk plan, subscription, wallet, lot, ledger, reservation, dan billing transaction.

**Frontend:** Admin memahami katalog plan dan subscription

**Dependencies**
- Credit rules v1.3 disetujui.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Tambahkan Prisma models/migrations billing.
- Definisikan monetary/credit precision dan enum lifecycle.
- Seed plan baseline sebagai commercial hypothesis.
- Tambahkan unique/foreign/check constraints yang relevan.

**Frontend:**
- Bangun tampilan plan/entitlement dari API tanpa harga/saldo dari client

**Deliverables**

**Backend:**
- plan/subscription/wallet/lot/ledger/reservation migrations.
- Evidence test/verification P52 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Plan catalog web

**Test / Verification**

**Backend:**
- [ ] P52-T01 — Migration bersih pada DB kosong dan existing baseline.
- [ ] P52-T02 — Seed plan idempotent.
- [ ] P52-T03 — Invalid negative/duplicate balance relation ditolak constraint/domain rule.
- [ ] P52-T04 — Historical ledger tidak bergantung pada plan price yang dapat berubah.

**Frontend:**
- [ ] P52-FE-T01: plan UI mengikuti data server dan workspace isolation

**Exit Criteria (Backend & Frontend)**  
**Backend:** Migration + constraints + seed plan baseline lolos.

**Frontend:** Plan catalog web selesai dan P52-FE-T01 lulus.

### P53 — Credit ledger & lot engine (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membangun credit ledger dan lot engine yang deterministic, auditable, dan dapat direbuild menjadi balance projection.

**Frontend:** User dapat melihat sumber dan riwayat credit

**Dependencies**
- P52 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan ledger entry immutable dari aplikasi.
- Implementasikan credit lots dengan source/expiry.
- Gunakan konsumsi FIFO-by-expiry atau rule resmi yang terdokumentasi.
- Bangun balance projection/reconciliation dari ledger+lots.

**Frontend:**
- Bangun wallet/lot/ledger read-only projection dan empty/error state

**Deliverables**

**Backend:**
- allocation, FIFO-by-expiry consumption, projection/reconcile.
- Evidence test/verification P53 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Credit history web

**Test / Verification**

**Backend:**
- [ ] P53-T01 — Allocation dan consumption menghasilkan saldo deterministik.
- [ ] P53-T02 — Rebuild projection dari ledger menghasilkan saldo yang sama.
- [ ] P53-T03 — Expired lot tidak dapat dikonsumsi.
- [ ] P53-T04 — Ledger entry tidak dapat diedit/dihapus role aplikasi normal.

**Frontend:**
- [ ] P53-FE-T01: tampilan ledger sesuai proyeksi API yang direkonsiliasi

**Exit Criteria (Backend & Frontend)**  
**Backend:** Ledger deterministic dan projection dapat direbuild.

**Frontend:** Credit history web selesai dan P53-FE-T01 lulus.

### P54 — Credit reservation engine (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menjamin credit tidak double-spend pada concurrency dengan lifecycle reserve → consume/release yang idempotent.

**Frontend:** Aksi berbiaya memperlihatkan reservation

**Dependencies**
- P53 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan reservation dengan available/reserved balance.
- Implementasikan consume pada successful business event dan release pada failure/cancel.
- Gunakan transaction/locking/idempotency key.
- Tambahkan expiry/cleanup reservation orphaned.

**Frontend:**
- Tampilkan biaya sebelum konfirmasi, reserved dan insufficient credit

**Deliverables**

**Backend:**
- reserve/consume/release + transaction/idempotency/concurrency.
- Evidence test/verification P54 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Credit reservation UX

**Test / Verification**

**Backend:**
- [ ] P54-T01 — Dua request berebut last credit menghasilkan tepat satu success.
- [ ] P54-T02 — Retry idempotent tidak double debit.
- [ ] P54-T03 — Failed operation me-release credit sesuai rule.
- [ ] P54-T04 — Consume/release terminal tidak dapat dieksekusi dua kali.

**Frontend:**
- [ ] P54-FE-T01: last-credit race dan retry tampil tanpa debit ganda

**Exit Criteria (Backend & Frontend)**  
**Backend:** Last-credit race menghasilkan satu success; no double debit.

**Frontend:** Credit reservation UX selesai dan P54-FE-T01 lulus.

### P55 — Subscription allocation & rollover (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Mengotomasi monthly allocation, rollover 2-cycle/2× cap, dan trial 50 credit/30 hari secara idempotent.

**Frontend:** User memahami alokasi dan rollover

**Dependencies**
- P52–P54 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan billing-cycle allocation scheduler.
- Implementasikan subscription credit expiry dua billing cycle dan max balance/cap sesuai pricing doc.
- Implementasikan trial eligibility, 50 credit, dan 30-day expiry.
- Catat allocation/expiry sebagai ledger event.

**Frontend:**
- Tampilkan credit dari subscription, tanggal berlaku dan rollover

**Deliverables**

**Backend:**
- monthly allocation, 2-cycle expiry, 2× cap, trial 50/30d.
- Evidence test/verification P55 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Allocation/rollover view

**Test / Verification**

**Backend:**
- [ ] P55-T01 — Scheduler dijalankan ulang pada cycle sama tidak menggandakan allocation.
- [ ] P55-T02 — Rollover tidak melebihi cap yang ditentukan.
- [ ] P55-T03 — Credit cycle lama expire sesuai waktu dan ledger tercatat.
- [ ] P55-T04 — Trial berakhir pada kondisi waktu/credit yang benar.

**Frontend:**
- [ ] P55-FE-T01: expiry/rollover mengikuti saldo authoritative API

**Exit Criteria (Backend & Frontend)**  
**Backend:** Scheduler idempotent; rollover/expiry/trial tests lolos.

**Frontend:** Allocation/rollover view selesai dan P55-FE-T01 lulus.

### P56 — Top-up & expiry (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan top-up 12 bulan serta admin grant/reversal yang auditable dan tidak merusak ledger.

**Frontend:** User dapat melihat top-up dan expiry

**Dependencies**
- P53–P55 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Implementasikan top-up credit lot dengan expiry 12 bulan.
- Implementasikan admin grant dengan reason/permission.
- Implementasikan reversal sebagai compensating ledger entry, bukan edit history.
- Tentukan consumption priority antar lot.

**Frontend:**
- Bangun riwayat top-up, expiry, serta koreksi admin yang berizin

**Deliverables**

**Backend:**
- top-up lot 12m, expiry, admin grant/reversal.
- Evidence test/verification P56 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Top-up/expiry view

**Test / Verification**

**Backend:**
- [ ] P56-T01 — Top-up memiliki expiry tepat sesuai policy.
- [ ] P56-T02 — Reversal menghasilkan compensating entry dan saldo benar.
- [ ] P56-T03 — Unauthorized admin grant/reversal ditolak.
- [ ] P56-T04 — Consumption memilih lot sesuai priority rule secara deterministik.

**Frontend:**
- [ ] P56-FE-T01: expired credit dan reversal tampil sesuai ledger server

**Exit Criteria (Backend & Frontend)**  
**Backend:** Expiry/reversal teraudit dan deterministic.

**Frontend:** Top-up/expiry view selesai dan P56-FE-T01 lulus.

### P57 — Billing UX (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyediakan proyeksi saldo, riwayat, expiry, dan biaya authoritative untuk UI billing.

**Frontend:** Billing UX transparan pada tindakan berbiaya

**Dependencies**
- P52–P56 API tersedia.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Sediakan DTO saldo available/reserved, expiry, ledger/history dan sumber transaksi dari API.
- Hitung low-balance threshold serta biaya tindakan di server; lindungi akses per workspace.

**Frontend:**
- Bangun halaman billing React, badge, balance, ledger, warning, biaya sebelum action dan top-up entry point memakai Tailwind CSS/shadcn/ui

**Deliverables**

**Backend:**
- API billing projection, history, threshold dan cost preview.
- Evidence test/verification P57 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Billing page terintegrasi

**Test / Verification**

**Backend:**
- [ ] P57-T01 — Projection API benar setelah allocation/consume/release.
- [ ] P57-T02 — User dapat menelusuri debit ke business reference.
- [ ] P57-T03 — Expiring credit dan low balance dihitung sesuai threshold.
- [ ] P57-T04 — User tidak dapat melihat billing workspace lain.
- [ ] P57-T05 — Cost preview dan billing response tetap authoritative meski client mengirim nilai palsu.

**Frontend:**
- [ ] P57-FE-T01: browser balance/cost/low-balance sesuai API setelah consume/release

**Exit Criteria (Backend & Frontend)**  
**Backend:** Projection, history dan cost preview tervalidasi serta tidak dapat diubah oleh client.

**Frontend:** Billing page terintegrasi selesai dan P57-FE-T01 lulus.

### P58 — Commercial E2E & reconciliation (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Membuktikan External Signing, QR, dan credit accounting konsisten pada happy path maupun failure/retry.

**Frontend:** Alur commercial browser konsisten dengan ledger

**Dependencies**
- P49–P57 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Bangun commercial E2E suite dari request external sign hingga verification.
- Inject failure pada OTP/provider/DB/worker/payment boundary yang relevan.
- Jalankan reconciliation antara ledger, reservation, signing completion, dan wallet.
- Uji zero-credit QR invariant.

**Frontend:**
- Jalankan external sign, QR, payment failure/retry dan billing page E2E

**Deliverables**

**Backend:**
- external sign + QR + credits + failure injection.
- Evidence test/verification P58 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Commercial web regression

**Test / Verification**

**Backend:**
- [ ] P58-T01 — Successful external signing mengonsumsi credit tepat sekali sesuai credit formula.
- [ ] P58-T02 — Failed/cancelled signing tidak meninggalkan debit final yang salah.
- [ ] P58-T03 — QR scan tidak pernah membuat ledger debit.
- [ ] P58-T04 — Reconciliation menghasilkan zero unexplained mismatch pada fixture suite.

**Frontend:**
- [ ] P58-FE-T01: tidak ada mismatch saldo/UI setelah failure injection

**Exit Criteria (Backend & Frontend)**  
**Backend:** EXT/VER/BILL mandatory suite hijau; no reconciliation mismatch.

**Frontend:** Commercial web regression selesai dan P58-FE-T01 lulus.

### P59 — Payment/operations adapter (1 hari penuh)

**Goals (Backend & Frontend)**  
**Backend:** Menyiapkan adapter payment/operational flow yang idempotent dan aman untuk commercial launch.

**Frontend:** Operasional billing dapat dipantau

**Dependencies**
- P52–P58 selesai.
- Frontend memakai kontrak/backend phase ini; mock tidak memenuhi exit criteria integrasi bila API tersedia.

**Scope / Pekerjaan**

**Backend:**
- Buat abstraction payment/manual-confirm agar provider dapat diganti.
- Implementasikan signed/idempotent callback handler sesuai provider pattern.
- Hubungkan successful payment ke top-up/subscription operation melalui ledger.
- Buat billing operations/reconciliation/refund/manual intervention runbook.

**Frontend:**
- Bangun admin view payment/top-up status dan recovery berizin sesuai adapter

**Deliverables**

**Backend:**
- payment/manual-confirm abstraction, idempotent callback, billing runbook.
- Evidence test/verification P59 dan perubahan dokumentasi kontrak yang terdampak.

**Frontend:**
- Billing operations web

**Test / Verification**

**Backend:**
- [ ] P59-T01 — Duplicate payment callback tidak menggandakan credit.
- [ ] P59-T02 — Forged/invalid callback signature ditolak.
- [ ] P59-T03 — Payment success yang diproses ulang tetap menghasilkan satu logical transaction.
- [ ] P59-T04 — Commercial operations checklist dan reconciliation runbook dapat dijalankan.

**Frontend:**
- [ ] P59-FE-T01: duplicate/forged callback tidak menjadi credit ganda di UI

**Exit Criteria (Backend & Frontend)**  
**Backend:** Duplicate/forged callback tests; commercial ops checklist lengkap.

**Frontend:** Billing operations web selesai dan P59-FE-T01 lulus.

## 5. Release Checkpoints

### Checkpoint A — Architecture Proven
Setelah P07. Auth gateway, Prisma runtime role, migration path, Group Policy, dan strategi RLS harus telah dibuktikan melalui test/evidence phase.

### Checkpoint B — Core Workflow Integrity
Setelah P27 dengan frontend setiap phase terkait terintegrasi. PDF-only core flow melalui browser harus mampu: draft → review → atomic Sign+Submit → Knowing → sequential Approval → numbering reservation → final PDF → retry/VOID dengan manifest/signature integrity.

### Checkpoint C — Core MVP
Setelah P32 dengan auth, admin, workflow, verification, notifikasi dan arsip web terintegrasi. Core workflow ditambah notification, archive/search metadata, public verification, dan hardened audit siap untuk internal pilot terbatas.

### Checkpoint D — Full MVP Feature Complete
Setelah P39. Office processing/OCR, content extraction, template/editor React, dan Form Builder React selesai sesuai phase tests.

### Checkpoint E — Core Production Candidate
Setelah P46. Security, performance, restore, observability, E2E browser/API, UAT, dan remediation memenuhi release gate.

### Checkpoint F — Core Pilot Validated
Setelah P48. Deployment pilot, smoke test, monitoring, rollback evidence, dan acceptance tercatat.

### Checkpoint G — Verify & Sign Commercial Candidate
Setelah P59. External Signing publik di web, QR Verification, credit ledger/reservation, rollover/top-up/trial, reconciliation, billing UX, dan payment operations melewati commercial release gate.

## 6. Definition of Done per Phase

Sebuah phase dianggap selesai hanya jika seluruh kondisi berikut terpenuhi:

1. Goal Backend dan Frontend tercapai; seluruh scope wajib selesai atau dipindahkan melalui perubahan roadmap/Decision Log yang disetujui. Berlalu satu hari tidak membuat phase otomatis selesai.
2. Deliverable dapat dijalankan pada environment development/staging sesuai kebutuhan.
3. Seluruh test/verification phase memiliki evidence dan berstatus pass, atau exception formal dengan owner/risk acceptance.
4. Unit/integration/E2E/security/performance test yang relevan ditambahkan ke test suite bila dapat diautomasi.
5. API/OpenAPI, Prisma schema/migration, UI contract, dan environment contract diperbarui bila terdampak; fase UI wajib terintegrasi dengan API nyata sebelum dinyatakan selesai.
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
