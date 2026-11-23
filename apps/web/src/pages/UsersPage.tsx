import { useState, type FormEvent } from 'react';
import { UploadSimpleIcon as FileUp } from '@phosphor-icons/react/dist/csr/UploadSimple';
import { PowerIcon as PowerOff } from '@phosphor-icons/react/dist/csr/Power';
import { ArrowCounterClockwiseIcon as RotateCcw } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { MagnifyingGlassIcon as Search } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { TrashIcon as Trash2 } from '@phosphor-icons/react/dist/csr/Trash';
import { UserCheckIcon as UserCheck } from '@phosphor-icons/react/dist/csr/UserCheck';
import { UserIcon as UserRound } from '@phosphor-icons/react/dist/csr/User';
import { UserMinusIcon as UserX } from '@phosphor-icons/react/dist/csr/UserMinus';
import { request } from '../api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useList } from '../hooks/useList.js';
import { useToast } from '../hooks/useToast.js';
import { formatErrorMessage } from '../lib/error.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Alert } from '../ui/alert.js';
import { Card, CardHeader } from '../ui/card.js';
import { TableSkeleton } from '../ui/skeleton.js';
import { ConfirmDialog } from '../ui/confirm-dialog.js';
import type { UserItem } from '../types/index.js';

interface ImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

export function UsersPage() {
  const { hasPermission } = useAuth();
  const manage = hasPermission('User.Manage');
  const { items, loading, error, reload } = useList<UserItem>('/users');
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [softDeleteTarget, setSoftDeleteTarget] = useState<UserItem | null>(null);
  const [softDeleteBusy, setSoftDeleteBusy] = useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<UserItem | null>(null);
  const [permanentDeleteBusy, setPermanentDeleteBusy] = useState(false);
  const toast = useToast();

  async function activate(id: string, status: string) {
    try {
      await request(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await reload();
      const statusLabel =
        status === 'ACTIVE'
          ? 'diaktifkan'
          : status === 'SUSPENDED'
            ? 'ditangguhkan'
            : status === 'INACTIVE'
              ? 'dinonaktifkan'
              : status;
      toast.success(`Pengguna berhasil ${statusLabel}.`);
    } catch (reason) {
      const err = formatErrorMessage(reason);
      setFeedback(err);
      toast.error(err);
    }
  }

  async function handleConfirmSoftDelete() {
    if (!softDeleteTarget) {
      return;
    }
    setSoftDeleteBusy(true);
    try {
      await activate(softDeleteTarget.id, 'INACTIVE');
      setSoftDeleteTarget(null);
    } finally {
      setSoftDeleteBusy(false);
    }
  }

  async function handleConfirmPermanentDelete() {
    if (!permanentDeleteTarget) {
      return;
    }
    setPermanentDeleteBusy(true);
    try {
      await request(`/users/${permanentDeleteTarget.id}?permanent=true`, {
        method: 'DELETE',
      });
      await reload();
      toast.success('Pengguna berhasil dihapus secara permanen.');
      setPermanentDeleteTarget(null);
    } catch (reason) {
      const err = formatErrorMessage(reason);
      setFeedback(err);
      toast.error(err);
    } finally {
      setPermanentDeleteBusy(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setUploading(true);
    setFeedback('');
    setImportResult(null);

    try {
      const result = await request<ImportResult>('/users/import', {
        method: 'POST',
        body: data,
      });

      const message = `${result.created} pengguna diimpor. ${result.errors.length} baris gagal: ${result.errors
        .map((e) => `${e.row}: ${e.message}`)
        .join(', ')}`;

      setFeedback(message);
      setImportResult(result);
      form.reset();
      await reload();

      if (result.created > 0) {
        toast.success(`${result.created} pengguna berhasil diimpor.`);
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} baris data import mengalami kendala.`);
      }
    } catch (reason) {
      const err = formatErrorMessage(reason);
      setFeedback(err);
      toast.error(err);
    } finally {
      setUploading(false);
    }
  }

  const filteredItems = items.filter((user) => {
    if (!filter) {
      return true;
    }
    const q = filter.toLowerCase();
    return (
      user.fullName?.toLowerCase().includes(q) ||
      user.employeeNumber?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <UserRound className="h-6 w-6 text-brand" aria-hidden="true" />
            <span>Pengguna</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Daftar karyawan, status aktivasi akun, dan import massal pengguna.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Directory */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Direktori Karyawan"
              description="Daftar seluruh akun karyawan dalam perusahaan"
              action={
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Cari nama / NIP / email…"
                    className="field pl-9 py-1.5 text-xs"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
              }
            />

            {loading ? (
              <TableSkeleton rows={4} />
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : filteredItems.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-3.5 hover:bg-slate-50/60 rounded-xl px-2 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{item.fullName}</p>
                        <Badge
                          variant={
                            item.status === 'ACTIVE'
                              ? 'success'
                              : item.status === 'PENDING'
                                ? 'warning'
                                : 'danger'
                          }
                          className="text-[10px]"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.employeeNumber} · {item.email} · {item.status}
                      </p>
                    </div>

                    {manage && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.status === 'PENDING' && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs h-8"
                            onClick={() => void activate(item.id, 'ACTIVE')}
                          >
                            <UserCheck size={13} /> Aktifkan
                          </Button>
                        )}
                        {item.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-700 border-amber-300 hover:bg-amber-50 gap-1 text-xs h-8"
                            onClick={() => void activate(item.id, 'SUSPENDED')}
                          >
                            <UserX size={13} /> Tangguhkan
                          </Button>
                        )}
                        {item.status === 'SUSPENDED' && (
                          <Button
                            size="sm"
                            className="gap-1 text-xs h-8"
                            onClick={() => void activate(item.id, 'ACTIVE')}
                          >
                            <UserCheck size={13} /> Pulihkan
                          </Button>
                        )}
                        {item.status === 'INACTIVE' && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs h-8"
                            onClick={() => void activate(item.id, 'ACTIVE')}
                          >
                            <RotateCcw size={13} /> Aktifkan
                          </Button>
                        )}
                        {item.status !== 'INACTIVE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 gap-1 text-xs h-8"
                            onClick={() => setSoftDeleteTarget(item)}
                            title="Nonaktifkan (Soft Delete)"
                          >
                            <PowerOff size={13} /> Nonaktifkan
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 text-xs h-8"
                          onClick={() => setPermanentDeleteTarget(item)}
                          title="Hapus Permanen"
                        >
                          <Trash2 size={13} /> Hapus
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                {filter
                  ? 'Tidak ada pengguna yang cocok dengan pencarian.'
                  : 'Belum ada pengguna terdaftar.'}
              </p>
            )}
          </Card>
        </div>

        {/* Import & Actions Panel */}
        <div className="space-y-6">
          {manage && (
            <Card>
              <CardHeader
                title="Import Excel"
                description="Upload berkas spreadsheet (.xlsx) untuk menambahkan banyak karyawan sekaligus"
              />

              <form onSubmit={upload} className="space-y-4">
                <div>
                  <label className="label" htmlFor="user-import-file">
                    Pilih Berkas Excel (.xlsx)
                  </label>
                  <input
                    id="user-import-file"
                    name="file"
                    type="file"
                    accept=".xlsx"
                    className="field file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-brand hover:file:bg-blue-100 cursor-pointer"
                    required
                  />
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Kolom wajib:{' '}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">nip</code>,{' '}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">username</code>,{' '}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">email</code>,{' '}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">nama</code>.
                  </p>
                </div>

                <Button className="w-full gap-2" disabled={uploading}>
                  <FileUp size={16} />
                  {uploading ? 'Mengimpor…' : 'Import'}
                </Button>
              </form>

              {/* Status display for test compatibility and user feedback */}
              {feedback && (
                <div
                  role="status"
                  className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900"
                >
                  <p className="font-medium leading-relaxed">{feedback}</p>
                </div>
              )}

              {importResult && importResult.errors.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold text-red-900 mb-1">Rincian Baris Gagal:</p>
                  <ul className="text-xs text-red-800 space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>
                        Baris {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <Card>
            <p className="font-semibold text-sm text-slate-800 mb-2">Panduan Status Akun</p>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="text-[10px]">
                  PENDING
                </Badge>
                <span>Akun baru mendaftar, menunggu persetujuan admin.</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-[10px]">
                  ACTIVE
                </Badge>
                <span>Akun aktif dan dapat masuk ke aplikasi.</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="danger" className="text-[10px]">
                  SUSPENDED
                </Badge>
                <span>Akun ditangguhkan sementara dari akses sistem.</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300">
                  INACTIVE
                </Badge>
                <span>Akun dinonaktifkan (Soft Delete), seluruh sesi dicabut.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Soft Delete (Nonaktifkan) Confirmation Dialog */}
      <ConfirmDialog
        open={softDeleteTarget !== null}
        title="Nonaktifkan Pengguna"
        message={`Apakah Anda yakin ingin menonaktifkan pengguna "${softDeleteTarget?.fullName}"? Akun akan dinonaktifkan (Soft Delete) dan seluruh sesi login aktif akan langsung dicabut.`}
        confirmLabel="Nonaktifkan"
        variant="danger"
        busy={softDeleteBusy}
        onConfirm={() => void handleConfirmSoftDelete()}
        onCancel={() => setSoftDeleteTarget(null)}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        open={permanentDeleteTarget !== null}
        title="Hapus Permanen Pengguna"
        message={`PERINGATAN: Apakah Anda yakin ingin MENGHAPUS PERMANEN akun "${permanentDeleteTarget?.fullName}"? Tindakan ini akan menghapus akun dari database dan Supabase Auth secara permanen.`}
        confirmLabel="Hapus Permanen"
        variant="danger"
        busy={permanentDeleteBusy}
        onConfirm={() => void handleConfirmPermanentDelete()}
        onCancel={() => setPermanentDeleteTarget(null)}
      />
    </div>
  );
}
