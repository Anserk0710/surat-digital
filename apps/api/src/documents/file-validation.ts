import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

export const MAX_DOCUMENT_FILE_BYTES = 4 * 1024 * 1024;

const formats = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
} as const;

export interface ValidatedFile {
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  buffer: Buffer;
}

export interface UploadFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function invalid(code: string): never {
  throw new BadRequestException({ code, message: 'File is invalid or unsupported.' });
}

function zipNames(buffer: Buffer): Set<string> {
  const start = Math.max(0, buffer.length - 65_557);
  let footer = -1;
  for (let i = buffer.length - 22; i >= start; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      footer = i;
      break;
    }
  }
  if (footer < 0 || footer + 22 > buffer.length) {
    invalid('FILE_SIGNATURE_MISMATCH');
  }
  const entries = buffer.readUInt16LE(footer + 10);
  let offset = buffer.readUInt32LE(footer + 16);
  const names = new Set<string>();
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > footer || buffer.readUInt32LE(offset) !== 0x02014b50) {
      invalid('FILE_SIGNATURE_MISMATCH');
    }
    const length = buffer.readUInt16LE(offset + 28);
    const extra = buffer.readUInt16LE(offset + 30);
    const comment = buffer.readUInt16LE(offset + 32);
    if (offset + 46 + length + extra + comment > footer) {
      invalid('FILE_SIGNATURE_MISMATCH');
    }
    names.add(buffer.toString('utf8', offset + 46, offset + 46 + length));
    offset += 46 + length + extra + comment;
  }
  return names;
}

export function validateDocumentFile(file?: UploadFileLike): ValidatedFile {
  if (
    !file?.buffer ||
    file.size < 1 ||
    file.size > MAX_DOCUMENT_FILE_BYTES ||
    file.size !== file.buffer.length
  ) {
    invalid('FILE_SIZE_INVALID');
  }
  const filename = file.originalname.normalize('NFC');
  if (
    filename.length < 1 ||
    Buffer.byteLength(filename, 'utf8') > 255 ||
    filename !== filename.trim() ||
    filename.lastIndexOf('.') < 1 ||
    /[\\/]/u.test(filename) ||
    [...filename].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    filename === '.' ||
    filename === '..'
  ) {
    invalid('FILE_NAME_INVALID');
  }
  const extension = filename.split('.').pop()?.toLowerCase() as keyof typeof formats;
  if (!extension || !(extension in formats)) {
    invalid('FILE_EXTENSION_UNSUPPORTED');
  }
  const contentType = formats[extension];
  if (file.mimetype.toLowerCase() !== contentType) {
    invalid('FILE_MIME_MISMATCH');
  }

  const bytes = file.buffer;
  if (bytes.length < 8) {
    invalid('FILE_SIGNATURE_MISMATCH');
  }
  const pdf = bytes.subarray(0, 5).equals(Buffer.from('%PDF-'));
  const ole = bytes.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'));
  if (extension === 'pdf' && !pdf) {
    invalid('FILE_SIGNATURE_MISMATCH');
  }
  if (extension === 'doc' || extension === 'xls') {
    if (!ole) {
      invalid('FILE_SIGNATURE_MISMATCH');
    }
    const streamName = extension === 'doc' ? 'WordDocument' : 'Workbook';
    const alternate = extension === 'xls' ? 'Book' : '';
    const name = Buffer.from(streamName, 'utf16le');
    if (
      !bytes.includes(name) &&
      (!alternate || !bytes.includes(Buffer.from(alternate, 'utf16le')))
    ) {
      invalid('FILE_SIGNATURE_MISMATCH');
    }
  }
  if (extension === 'docx' || extension === 'xlsx') {
    if (bytes.readUInt32LE(0) !== 0x04034b50) {
      invalid('FILE_SIGNATURE_MISMATCH');
    }
    const names = zipNames(bytes);
    const required = extension === 'docx' ? 'word/document.xml' : 'xl/workbook.xml';
    if (!names.has('[Content_Types].xml') || !names.has(required)) {
      invalid('FILE_SIGNATURE_MISMATCH');
    }
  }
  return {
    filename,
    contentType,
    sizeBytes: file.size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    buffer: bytes,
  };
}
