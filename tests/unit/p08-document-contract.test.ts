import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const migrationPath = 'apps/api/prisma/migrations/20261119095458_p08_document_master/migration.sql';

describe('P08 document master contract', () => {
  it('protects documents with RLS', () => {
    const migration = read(migrationPath);
    for (const text of [
      'ALTER TABLE public.documents',
      'ENABLE ROW LEVEL SECURITY',
      'documents_select_policy',
      'documents_insert_policy',
      'documents_update_policy',
      "'Document.ViewAll'",
      "'Document.Create'",
    ]) {
      expect(migration).toContain(text);
    }
  });

  it('has database-level type/subtype integrity', () => {
    const migration = read(migrationPath);
    expect(migration).toContain('documents_document_subtype_type_fkey');
    expect(migration).toContain('document_subtypes_id_document_type_id_key');
  });

  it('uses optimistic concurrency', () => {
    const source = read('apps/api/src/documents/document.service.ts');
    expect(source).toContain('expectedRevision');
    expect(source).toContain('DOCUMENT_REVISION_CONFLICT');
    expect(source).toMatch(/increment:\s*1/);
  });

  it('does not expose tenant delete endpoint', () => {
    const controller = read('apps/api/src/documents/document.controller.ts');
    expect(controller).not.toMatch(/@Delete\(/);
  });
});
