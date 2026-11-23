import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FloppyDiskIcon as Save } from '@phosphor-icons/react/dist/csr/FloppyDisk';
import { ApiHttpError } from '../../auth/auth-api.js';
import { useToast } from '../../hooks/useToast.js';
import { formatErrorMessage } from '../../lib/error.js';
import { Alert } from '../../ui/alert.js';
import { Button } from '../../ui/button.js';
import { Card, CardHeader } from '../../ui/card.js';
import type {
  DocumentIssuerScope,
  DocumentItem,
  DocumentSubtypeItem,
  DocumentTypeItem,
} from '../../types/index.js';
import {
  createDocument,
  listDocumentIssuerScopes,
  listDocumentSubtypes,
  listDocumentTypes,
  updateDocument,
} from './document-api.js';

interface Props {
  document?: DocumentItem | null;
  onSaved: (document: DocumentItem) => void;
}

export function DocumentDraftForm({ document, onSaved }: Props) {
  const toast = useToast();
  const [types, setTypes] = useState<DocumentTypeItem[]>([]);
  const [subtypes, setSubtypes] = useState<DocumentSubtypeItem[]>([]);
  const [scopes, setScopes] = useState<DocumentIssuerScope[]>([]);
  const [documentTypeId, setDocumentTypeId] = useState(document?.documentTypeId ?? '');
  const [documentSubtypeId, setDocumentSubtypeId] = useState(document?.documentSubtypeId ?? '');
  const [issuerScopeId, setIssuerScopeId] = useState('');
  const [title, setTitle] = useState(document?.title ?? '');
  const [description, setDescription] = useState(document?.description ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredSubtypes = useMemo(
    () => subtypes.filter((subtype) => subtype.documentTypeId === documentTypeId),
    [subtypes, documentTypeId],
  );

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [nextTypes, nextSubtypes, nextScopes] = await Promise.all([
          listDocumentTypes(),
          listDocumentSubtypes(),
          listDocumentIssuerScopes(),
        ]);
        if (!active) {
          return;
        }
        setTypes(nextTypes);
        setSubtypes(nextSubtypes);
        setScopes(nextScopes);
        const scope = document
          ? nextScopes.find(
              (item) =>
                item.office.id === document.issuerOfficeId &&
                item.division.id === document.issuerDivisionId,
            )
          : (nextScopes.find((item) => item.isPrimary) ?? nextScopes[0]);
        setIssuerScopeId(scope?.officeDivisionId ?? '');
      } catch (reason) {
        if (active) {
          setError(formatErrorMessage(reason));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [document]);

  function handleTypeChange(value: string) {
    setDocumentTypeId(value);
    setDocumentSubtypeId(subtypes.find((item) => item.documentTypeId === value)?.id ?? '');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scope = scopes.find((item) => item.officeDivisionId === issuerScopeId);
    if (!scope) {
      setError('Pilih kantor dan divisi penerbit yang valid.');
      return;
    }
    if (!documentTypeId || !documentSubtypeId || !title.trim()) {
      setError('Jenis, subjenis, dan judul dokumen wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        documentTypeId,
        documentSubtypeId,
        issuerOfficeId: scope.office.id,
        issuerDivisionId: scope.division.id,
        title: title.trim(),
        description: description.trim() || null,
      };
      const saved = document
        ? await updateDocument(document.id, { ...payload, expectedRevision: document.revision })
        : await createDocument(payload);
      toast.success(document ? 'Draft berhasil diperbarui.' : 'Draft berhasil dibuat.');
      onSaved(saved);
    } catch (reason) {
      if (reason instanceof ApiHttpError && reason.code === 'DOCUMENT_REVISION_CONFLICT') {
        setError(
          'Draft telah berubah pada request lain. Muat ulang Draft sebelum menyimpan kembali.',
        );
      } else {
        setError(formatErrorMessage(reason));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <p role="status" className="text-sm text-slate-500">
          Memuat metadata dokumen…
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Informasi Dokumen"
        description={
          document
            ? `Tracking ID: ${document.id} · Revision ${document.revision}`
            : 'Langkah 1 — metadata Draft'
        }
      />
      {error && <Alert variant="danger">{error}</Alert>}
      {scopes.length === 0 && (
        <Alert variant="warning" className="mt-4">
          Anda belum memiliki penempatan kantor/divisi aktif yang dapat digunakan sebagai penerbit.
        </Alert>
      )}
      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="label">Jenis dokumen</span>
            <select
              className="field"
              aria-label="Jenis dokumen"
              value={documentTypeId}
              required
              onChange={(event) => handleTypeChange(event.target.value)}
            >
              <option value="">Pilih jenis</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="label">Subjenis</span>
            <select
              className="field"
              aria-label="Subjenis dokumen"
              value={documentSubtypeId}
              required
              disabled={!documentTypeId}
              onChange={(event) => setDocumentSubtypeId(event.target.value)}
            >
              <option value="">Pilih subjenis</option>
              {filteredSubtypes.map((subtype) => (
                <option key={subtype.id} value={subtype.id}>
                  {subtype.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="label">Kantor dan divisi penerbit</span>
          <select
            className="field"
            aria-label="Kantor dan divisi penerbit"
            value={issuerScopeId}
            required
            onChange={(event) => setIssuerScopeId(event.target.value)}
          >
            <option value="">Pilih penempatan</option>
            {scopes.map((scope) => (
              <option key={scope.officeDivisionId} value={scope.officeDivisionId}>
                {scope.office.name} — {scope.division.name}
                {scope.isPrimary ? ' (Utama)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="label">Judul</span>
          <input
            className="field"
            aria-label="Judul dokumen"
            value={title}
            required
            maxLength={300}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="label">Deskripsi</span>
          <textarea
            className="field min-h-28 resize-y"
            aria-label="Deskripsi dokumen"
            value={description}
            maxLength={5000}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || scopes.length === 0}>
            <Save size={16} aria-hidden="true" />
            {saving ? 'Menyimpan…' : document ? 'Simpan perubahan' : 'Buat Draft'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
