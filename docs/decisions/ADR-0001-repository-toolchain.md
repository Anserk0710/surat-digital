# ADR-0001 — Repository Toolchain

Status: Accepted
Date: 2026-11-09
Phase: P01

## Context

Surat Digital membutuhkan repository yang reproducible dan quality gate konsisten sebelum implementation phase berikutnya dimulai.

## Decision

Repository menggunakan:

- npm workspaces
- package-lock.json sebagai official lockfile
- Node.js 26.13.0 LTS
- npm 12.2.2
- TypeScript 6.0.2
- ESLint 10
- Prettier 3
- Vitest 5
- GitHub Actions sebagai CI adapter awal

Workspace utama:

- apps/web
- apps/api
- apps/document-worker
- packages/*

## TypeScript Decision

TypeScript 7 tidak digunakan pada baseline P01 karena typescript-eslint stable belum memberikan official support untuk TypeScript 7. TypeScript 6.0.2 dipilih sebagai compatibility baseline.

## CI Contract

Setiap CI wajib menjalankan:

1. npm ci
2. lockfile verification
3. formatting check
4. lint
5. typecheck
6. test
7. build

Failure pada salah satu command harus membuat CI gagal.

## Consequences

Positive:

- Local dan CI menggunakan toolchain yang sama.
- Dependency resolution reproducible.
- Failure terlihat sebelum merge.
- Workspace dapat berkembang tanpa mengganti package manager.

Trade-off:

- Upgrade toolchain harus dilakukan secara eksplisit.
- Exact version pinning membutuhkan maintenance berkala.

## Follow-up

Framework-specific configuration untuk React, NestJS, Prisma, dan worker ditambahkan pada phase masing-masing.
