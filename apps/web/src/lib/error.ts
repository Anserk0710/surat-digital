import { ApiHttpError } from '../auth/auth-api.js';

export function formatErrorMessage(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.code === 'DOCUMENT_REVISION_CONFLICT') {
      return 'Draft telah berubah. Muat ulang data terbaru sebelum menyimpan kembali.';
    }
    if (error.code === 'DOCUMENT_NOT_DRAFT') {
      return 'Dokumen tidak lagi berstatus Draft dan tidak dapat diedit.';
    }
    if (error.code === 'INVALID_DOCUMENT_CLASSIFICATION') {
      return 'Kombinasi jenis dan subjenis dokumen tidak valid.';
    }
    if (error.code === 'INVALID_DOCUMENT_ISSUER_SCOPE') {
      return 'Kantor dan divisi penerbit tidak tersedia untuk penempatan Anda.';
    }
    if (error.status === 401) {
      return 'Sesi berakhir. Silakan masuk kembali.';
    }
    if (error.status === 403) {
      return 'Akses ditolak atau permintaan tidak aman. Muat ulang halaman dan coba kembali.';
    }
    if (error.status === 429) {
      return 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.';
    }
    if (error.status === 409) {
      return 'Data sedang digunakan atau telah berubah. Muat ulang dan coba kembali.';
    }
    if (error.status === 400) {
      return 'Data yang dimasukkan tidak valid. Periksa kembali form isian Anda.';
    }
    if (error.status === 404) {
      return 'Data yang dicari tidak ditemukan.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Permintaan gagal. Silakan coba kembali.';
}
