import { useEffect, useState } from 'react';
import { ArrowLeftIcon as ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { NotePencilIcon as FilePenLine } from '@phosphor-icons/react/dist/csr/NotePencil';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DocumentDraftForm } from '../features/documents/DocumentDraftForm.js';
import { DocumentFiles } from '../features/documents/DocumentFiles.js';
import { getDocument } from '../features/documents/document-api.js';
import { formatErrorMessage } from '../lib/error.js';
import { Alert } from '../ui/alert.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import type { DocumentItem } from '../types/index.js';

export function DocumentDraftPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!documentId) {
      return;
    }
    let active = true;
    setDocument(null);
    setError('');
    setLoading(true);
    void getDocument(documentId)
      .then((result) => {
        if (active) {
          setDocument(result);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(formatErrorMessage(reason));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [documentId]);

  if (loading) {
    return (
      <div role="status" className="text-sm text-slate-500">
        Memuat Draft…
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="danger">{error}</Alert>
        <Button variant="outline" asChild>
          <Link to="/documents">Kembali ke Dokumen Saya</Link>
        </Button>
      </div>
    );
  }
  if (document && document.status !== 'DRAFT') {
    return (
      <div className="space-y-4">
        <Alert variant="warning" title="Dokumen tidak lagi Draft">
          Metadata tidak dapat diubah melalui halaman Draft.
        </Alert>
        <Button variant="outline" asChild>
          <Link to="/documents">Kembali</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            to="/documents"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand"
          >
            <ArrowLeft size={15} /> Dokumen Saya
          </Link>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
            <FilePenLine className="h-6 w-6 text-brand" />
            {document ? 'Edit Draft' : 'Buat Dokumen'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Lengkapi informasi dasar, lalu unggah file dokumen secara privat.
          </p>
        </div>
        {document && <Badge variant="warning">DRAFT · Revision {document.revision}</Badge>}
      </div>
      <DocumentDraftForm
        key={documentId ?? 'new'}
        document={document}
        onSaved={(saved) => {
          setDocument(saved);
          if (!documentId) {
            navigate(`/documents/${saved.id}/edit`, { replace: true });
          }
        }}
      />
      {document && (
        <DocumentFiles
          documentId={document.id}
          onUploaded={() =>
            setDocument((current) =>
              current ? { ...current, revision: current.revision + 1 } : current,
            )
          }
        />
      )}
    </div>
  );
}
