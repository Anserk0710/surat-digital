import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('P09 document download authorization', () => {
  it('requires Document.Download or Document.DownloadAll', () => {
    expect(read('apps/api/src/documents/document.controller.ts')).toMatch(
      /@Get\('documents\/:documentId\/files\/:fileId\/download'\)[\s\S]{0,200}@RequirePolicyAny\(\s*'Document\.Download',\s*'Document\.DownloadAll'\s*\)/,
    );
  });
  it('uses a dedicated transaction-local download purpose', () => {
    const source = read('apps/api/src/rls/rls-context.service.ts');
    expect(source).toContain('runDocumentDownload');
    expect(source).toMatch(
      /set_config\(\s*'app\.access_purpose'\s*,\s*\$\{accessPurpose\}\s*,\s*true\s*\)/,
    );
  });
  it('does not make DownloadAll equivalent to ViewAll', () => {
    const matches = fs
      .readdirSync(path.join(root, 'apps/api/prisma/migrations'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.endsWith('_p09_download_authorization'));
    expect(matches).toHaveLength(1);
    const migration = read(`apps/api/prisma/migrations/${matches[0]!.name}/migration.sql`);
    for (const value of ["'DOCUMENT_DOWNLOAD'", "'Document.DownloadAll'", "'Document.ViewAll'"]) {
      expect(migration).toContain(value);
    }
    expect(migration).toMatch(/current_setting\(\s*'app\.access_purpose'/);
  });
  it('uses download-purpose only for binary download', () => {
    const source = read('apps/api/src/documents/document.service.ts');
    expect(source).toContain('this.rls.runDocumentDownload(actor, lookup)');
    expect(source).toContain('this.rls.runIdentity(actor, lookup)');
  });
});
