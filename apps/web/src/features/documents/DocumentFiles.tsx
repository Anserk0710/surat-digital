import { useAuth } from '../../context/AuthContext.js';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useToast } from '../../hooks/useToast.js';
import { formatErrorMessage } from '../../lib/error.js';
import type { DocumentFileItem } from '../../types/index.js';
import { Alert } from '../../ui/alert.js';
import { Button } from '../../ui/button.js';
import { Card, CardHeader } from '../../ui/card.js';
import { downloadDocumentFile, listDocumentFiles, uploadDocumentFile } from './document-api.js';

const accepted = '.pdf,.docx,.doc,.xlsx,.xls';

export function DocumentFiles({
  documentId,
  onUploaded,
}: {
  documentId: string;
  onUploaded: () => void;
}) {
  const { hasPermission } = useAuth();
  const canDownload = hasPermission('Document.Download') || hasPermission('Document.DownloadAll');
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<DocumentFileItem[]>([]);
  const [selected, setSelected] = useState<File | null>(null);
  const [role, setRole] = useState<'MAIN' | 'ATTACHMENT'>('MAIN');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void listDocumentFiles(documentId)
      .then((result) => {
        if (active) {
          setFiles(result);
          if (result.some((file) => file.fileRole === 'MAIN')) {
            setRole('ATTACHMENT');
          }
        }
      })
      .catch((reason) => {
        if (active) {
          setError(formatErrorMessage(reason));
        }
      });
    return () => {
      active = false;
    };
  }, [documentId]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setSelected(event.target.files?.[0] ?? null);
    setProgress(null);
    setError('');
  }

  async function upload() {
    if (!selected) {
      return;
    }
    setBusy(true);
    setProgress(0);
    setError('');
    try {
      const uploaded = await uploadDocumentFile(documentId, selected, role, setProgress);
      setFiles((current) => [...current, uploaded]);
      onUploaded();
      if (role === 'MAIN') {
        setRole('ATTACHMENT');
      }
      setSelected(null);
      if (fileInput.current) {
        fileInput.current.value = '';
      }
      setProgress(null);
      toast.success('File berhasil diunggah secara privat.');
    } catch (reason) {
      setError(formatErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function download(file: DocumentFileItem) {
    setError('');
    try {
      await downloadDocumentFile(documentId, file);
    } catch (reason) {
      setError(formatErrorMessage(reason));
    }
  }

  const hasMain = files.some((file) => file.fileRole === 'MAIN');
  return (
    <Card>
      <CardHeader
        title="File privat"
        description="Unggah satu file per aksi. Batas 4 MiB; PDF, DOCX, DOC, XLSX, atau XLS."
      />
      {error && (
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      )}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="space-y-1.5">
          <span className="label">Pilih satu file</span>
          <input
            ref={fileInput}
            type="file"
            accept={accepted}
            aria-label="Pilih satu file"
            className="field"
            onChange={selectFile}
            disabled={busy}
          />
        </label>
        <label className="space-y-1.5">
          <span className="label">Peran file</span>
          <select
            className="field"
            aria-label="Peran file"
            value={role}
            onChange={(event) => setRole(event.target.value as 'MAIN' | 'ATTACHMENT')}
            disabled={busy}
          >
            <option value="MAIN" disabled={hasMain}>
              File utama
            </option>
            <option value="ATTACHMENT">Lampiran</option>
          </select>
        </label>
        <Button
          type="button"
          disabled={!selected || busy || (role === 'MAIN' && hasMain)}
          onClick={() => void upload()}
        >
          {busy ? 'Mengunggah…' : 'Unggah file'}
        </Button>
      </div>
      {selected && (
        <p className="mt-2 text-sm text-slate-600">
          {selected.name} · {selected.size.toLocaleString('id-ID')} byte
        </p>
      )}
      {progress !== null && (
        <div className="mt-3" role="status" aria-label="Progress upload">
          <progress value={progress} max="100" className="w-full" />
          {progress}%
        </div>
      )}
      <div className="mt-6 space-y-3">
        {files.length === 0 && <p className="text-sm text-slate-500">Belum ada file.</p>}
        {files.map((file) => (
          <div
            key={file.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
          >
            <div className="min-w-0">
              <p className="break-all font-medium text-slate-800">{file.originalFilename}</p>
              <p className="text-xs text-slate-500">
                {file.fileRole} · {file.sizeBytes.toLocaleString('id-ID')} byte ·{' '}
                {file.processingStatus}
              </p>
              <p className="break-all font-mono text-xs text-slate-500" title="SHA-256">
                SHA-256: {file.sha256}
              </p>
            </div>
            {canDownload ? (
              <Button type="button" variant="outline" onClick={() => void download(file)}>
                Unduh
              </Button>
            ) : (
              <span className="text-xs text-slate-500">Tidak memiliki izin unduh</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
