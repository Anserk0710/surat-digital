import { useCallback, useEffect, useState } from 'react';
import { FileTextIcon as FileText } from '@phosphor-icons/react/dist/csr/FileText';
import { PencilSimpleIcon as Pencil } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PlusIcon as Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { Link } from 'react-router-dom';
import { listMyDocuments } from '../features/documents/document-api.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatErrorMessage } from '../lib/error.js';
import { Alert } from '../ui/alert.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Card, CardHeader } from '../ui/card.js';
import { TableSkeleton } from '../ui/skeleton.js';
import type { DocumentItem } from '../types/index.js';

function statusVariant(status: string): 'primary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'DRAFT':
      return 'warning';
    case 'ISSUED':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger';
    default:
      return 'primary';
  }
}

export function DocumentsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('Document.Create');
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems([]);
    setNextCursor(null);
    setLoading(true);
    setError('');
    try {
      const result = await listMyDocuments();
      setItems(result.items);
      setNextCursor(result.nextCursor ?? null);
    } catch (reason) {
      setError(formatErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    if (!nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const result = await listMyDocuments({ cursor: nextCursor });
      setItems((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor ?? null);
    } catch (reason) {
      setError(formatErrorMessage(reason));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
            <FileText className="h-6 w-6 text-brand" />
            Dokumen Saya
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Dokumen yang Anda buat dan status terbarunya.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/documents/new">
              <Plus size={16} />
              Buat Dokumen
            </Link>
          </Button>
        )}
      </div>
      <Card>
        <CardHeader
          title="Daftar Dokumen"
          description="Tracking ID, metadata, dan status dokumen yang Anda buat"
        />
        {loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">Belum ada dokumen</p>
            <p className="mt-1 text-sm text-slate-500">Draft yang Anda buat akan muncul di sini.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Tracking ID</th>
                    <th className="px-3 py-3">Dokumen</th>
                    <th className="px-3 py-3">Penerbit</th>
                    <th className="px-3 py-3">Dibuat</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-4 align-top">
                        <code className="text-xs text-slate-600">{item.id}</code>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.documentType.name} · {item.documentSubtype.name}
                        </p>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <p>{item.issuerOffice.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.issuerDivision.name}</p>
                      </td>
                      <td className="px-3 py-4 align-top text-slate-600">
                        {new Intl.DateTimeFormat('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(item.createdAt))}
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="px-3 py-4 text-right align-top">
                        {item.status === 'DRAFT' && canCreate ? (
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/documents/${item.id}/edit`}>
                              <Pencil size={14} />
                              Edit
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {nextCursor && (
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? 'Memuat…' : 'Muat lainnya'}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
