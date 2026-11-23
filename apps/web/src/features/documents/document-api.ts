import { baseUrl, request } from '../../api.js';
import { ApiHttpError, getCsrfToken } from '../../auth/auth-api.js';
import type {
  CreateDocumentInput,
  DocumentIssuerScope,
  DocumentItem,
  DocumentFileItem,
  DocumentListResponse,
  DocumentSubtypeItem,
  DocumentTypeItem,
  UpdateDocumentInput,
} from '../../types/index.js';

export const listDocumentTypes = () => request<DocumentTypeItem[]>('/document-types');

export function listDocumentSubtypes(documentTypeId?: string) {
  const query = documentTypeId ? `?documentTypeId=${encodeURIComponent(documentTypeId)}` : '';
  return request<DocumentSubtypeItem[]>(`/document-subtypes${query}`);
}

export const listDocumentIssuerScopes = () =>
  request<DocumentIssuerScope[]>('/documents/issuer-scopes');

export function listMyDocuments(options: { cursor?: string; status?: string } = {}) {
  const params = new URLSearchParams({ scope: 'mine', limit: '50' });
  if (options.cursor) {
    params.set('cursor', options.cursor);
  }
  if (options.status) {
    params.set('status', options.status);
  }
  return request<DocumentListResponse>(`/documents?${params.toString()}`);
}

export const getDocument = (documentId: string) =>
  request<DocumentItem>(`/documents/${documentId}`);

export function createDocument(input: CreateDocumentInput) {
  return request<DocumentItem>('/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateDocument(documentId: string, input: UpdateDocumentInput) {
  return request<DocumentItem>(`/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export const listDocumentFiles = (documentId: string) =>
  request<DocumentFileItem[]>(`/documents/${documentId}/files`);

export async function uploadDocumentFile(
  documentId: string,
  file: File,
  role: 'MAIN' | 'ATTACHMENT',
  onProgress: (percent: number) => void,
): Promise<DocumentFileItem> {
  const csrf = await getCsrfToken(baseUrl);
  const data = new FormData();
  data.append('file', file);
  data.append('fileRole', role);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${baseUrl}/api/v1/documents/${documentId}/files/upload`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-CSRF-Token', csrf);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error('Koneksi upload terputus.'));
    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const code =
          body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
            ? body.code
            : undefined;
        reject(new ApiHttpError(xhr.status, code));
      } else {
        resolve(body as DocumentFileItem);
      }
    };
    xhr.send(data);
  });
}

export async function downloadDocumentFile(
  documentId: string,
  file: DocumentFileItem,
): Promise<void> {
  const response = await fetch(
    `${baseUrl}/api/v1/documents/${documentId}/files/${file.id}/download`,
    { credentials: 'include', cache: 'no-store' },
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const code =
      body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
        ? body.code
        : undefined;
    throw new ApiHttpError(response.status, code);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = file.originalFilename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
