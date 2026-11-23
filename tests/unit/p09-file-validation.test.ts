import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  MAX_DOCUMENT_FILE_BYTES,
  validateDocumentFile,
  type UploadFileLike,
} from '../../apps/api/src/documents/file-validation.js';

const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');

function fixture(name: string, mime: string, buffer = pdf) {
  return {
    originalname: name,
    mimetype: mime,
    buffer,
    size: buffer.length,
  } satisfies UploadFileLike;
}

describe('P09 file integrity validation', () => {
  it('rejects files larger than configured maximum', () => {
    const bytes = Buffer.alloc(MAX_DOCUMENT_FILE_BYTES + 1, 0x25);
    expect(() =>
      validateDocumentFile(fixture('oversize.pdf', 'application/pdf', bytes)),
    ).toThrowError(
      expect.objectContaining({ response: expect.objectContaining({ code: 'FILE_SIZE_INVALID' }) }),
    );
  });
  it('accepts a matching PDF and records SHA-256', () => {
    const result = validateDocumentFile(fixture('keputusan.pdf', 'application/pdf'));
    expect(result.sha256).toBe(createHash('sha256').update(pdf).digest('hex'));
    expect(result.sizeBytes).toBe(pdf.length);
  });

  it.each([
    ['../evil.pdf', 'application/pdf', pdf, 'FILE_NAME_INVALID'],
    ['evil.exe', 'application/pdf', pdf, 'FILE_EXTENSION_UNSUPPORTED'],
    ['evil.pdf', 'application/msword', pdf, 'FILE_MIME_MISMATCH'],
    ['evil.pdf', 'application/pdf', Buffer.from('not a PDF'), 'FILE_SIGNATURE_MISMATCH'],
    [
      'evil.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf,
      'FILE_SIGNATURE_MISMATCH',
    ],
  ])('rejects mismatched filename, MIME or signature: %s', (name, mime, bytes, code) => {
    expect(() => validateDocumentFile(fixture(name, mime, bytes))).toThrowError(
      expect.objectContaining({ response: expect.objectContaining({ code }) }),
    );
  });
});
