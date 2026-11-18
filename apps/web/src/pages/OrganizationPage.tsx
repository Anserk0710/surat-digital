import { useState, type FormEvent } from 'react';
import { Building2, Edit2, Plus, PowerOff, RotateCcw, Trash2 } from 'lucide-react';
import { request } from '../api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useList } from '../hooks/useList.js';
import { useToast } from '../hooks/useToast.js';
import { formatErrorMessage } from '../lib/error.js';
import { Button } from '../ui/button.js';
import { Alert } from '../ui/alert.js';
import { TableSkeleton } from '../ui/skeleton.js';
import { ConfirmDialog } from '../ui/confirm-dialog.js';
import { EditRecordModal } from '../components/EditRecordModal.js';
import type { RecordItem } from '../types/index.js';

const resources = [
  { key: 'companies', title: 'Perusahaan', fields: ['name'], create: false },
  { key: 'offices', title: 'Kantor', fields: ['code', 'name', 'timezone'], create: true },
  { key: 'divisions', title: 'Divisi', fields: ['code', 'name'], create: true },
  { key: 'job-titles', title: 'Jabatan', fields: ['code', 'name'], create: true },
  {
    key: 'office-divisions',
    title: 'Relasi Kantor–Divisi',
    fields: ['officeId', 'divisionId'],
    create: true,
  },
  {
    key: 'assignments',
    title: 'Penempatan',
    fields: ['employeeId', 'officeDivisionId', 'jobTitleId'],
    create: true,
  },
] as const;

type ResourceConfig = (typeof resources)[number];

function ResourceSection({
  config,
  canManage,
  allOffices,
  allDivisions,
  allJobTitles,
  allUsers,
  allOfficeDivisions,
}: {
  config: ResourceConfig;
  canManage: boolean;
  allOffices: RecordItem[];
  allDivisions: RecordItem[];
  allJobTitles: RecordItem[];
  allUsers: RecordItem[];
  allOfficeDivisions: RecordItem[];
}) {
  const { items, loading, error, reload } = useList(`/organization/${config.key}`);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const toast = useToast();

  // Dialog state for edit modal (replaces window.prompt)
  const [editingItem, setEditingItem] = useState<RecordItem | null>(null);

  // Dialog state for deactivate modal (replaces window.confirm)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deactivatingBusy, setDeactivatingBusy] = useState(false);

  // Dialog state for permanent delete modal
  const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(null);
  const [permanentDeletingBusy, setPermanentDeletingBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setFeedback('');

    try {
      const data = Object.fromEntries(new FormData(form));
      await request(`/organization/${config.key}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      form.reset();
      await reload();
      setFeedback('Data tersimpan.');
      toast.success(`${config.title}: data tersimpan.`);
    } catch (reason) {
      const err = formatErrorMessage(reason);
      setFeedback(err);
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingId) {
      return;
    }
    setDeactivatingBusy(true);
    try {
      await request(`/organization/${config.key}/${deactivatingId}`, { method: 'DELETE' });
      await reload();
      toast.success(`${config.title} berhasil dinonaktifkan.`);
      setDeactivatingId(null);
    } catch (reason) {
      const err = formatErrorMessage(reason);
      setFeedback(err);
      toast.error(err);
    } finally {
      setDeactivatingBusy(false);
    }
  }

  async function handleReactivate(item: RecordItem) {
    try {
      await request(`/organization/${config.key}/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: true }),
      });
      await reload();
      toast.success(`${config.title} berhasil diaktifkan kembali.`);
    } catch (reason) {
      const err = formatErrorMessage(reason);
      toast.error(err);
    }
  }

  async function handleConfirmPermanentDelete() {
    if (!permanentDeletingId) {
      return;
    }
    setPermanentDeletingBusy(true);
    try {
      await request(`/organization/${config.key}/${permanentDeletingId}?permanent=true`, {
        method: 'DELETE',
      });
      await reload();
      toast.success(`${config.title} berhasil dihapus permanen.`);
      setPermanentDeletingId(null);
    } catch (reason) {
      const err = formatErrorMessage(reason);
      setFeedback(err);
      toast.error(err);
    } finally {
      setPermanentDeletingBusy(false);
    }
  }

  async function handleSaveEdit(id: string, updates: Record<string, string>) {
    await request(`/organization/${config.key}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    await reload();
    toast.success('Perubahan data berhasil disimpan.');
  }

  const editField = config.key === 'offices' ? 'timezone' : 'name';
  const editFieldLabel = config.key === 'offices' ? 'Zona Waktu' : 'Nama';

  return (
    <section className="panel flex flex-col justify-between">
      {/* Direct h2 heading required for Playwright locator('..') parent access */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{config.title}</h2>

      <div>
        {loading ? (
          <TableSkeleton rows={3} />
        ) : error ? (
          <div role="alert" className="space-y-3 py-2">
            <Alert variant="danger">{error}</Alert>
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              Coba lagi
            </Button>
          </div>
        ) : items.length ? (
          <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {items.map((item) => {
              const displayName = item.name ?? item.code ?? item.id;
              const isInactive = item.active === false;

              let relationExtra = '';
              if (config.key === 'office-divisions') {
                const off = allOffices.find((o) => o.id === item.officeId)?.name;
                const div = allDivisions.find((d) => d.id === item.divisionId)?.name;
                if (off || div) {
                  relationExtra = `${off ?? item.officeId} — ${div ?? item.divisionId}`;
                }
              } else if (config.key === 'assignments') {
                const emp = allUsers.find((u) => u.id === item.employeeId)?.fullName;
                const jt = allJobTitles.find((j) => j.id === item.jobTitleId)?.name;
                if (emp || jt) {
                  relationExtra = `${emp ?? item.employeeId} · ${jt ?? 'Tanpa Jabatan'}`;
                }
              }

              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-slate-50/60 rounded-lg px-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 truncate">{displayName}</span>
                      {item.timezone && (
                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.timezone}
                        </span>
                      )}
                      {isInactive && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    {relationExtra && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{relationExtra}</p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      {!isInactive ? (
                        <>
                          {config.key !== 'assignments' && config.key !== 'office-divisions' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-slate-600 hover:text-brand"
                              onClick={() => setEditingItem(item)}
                              aria-label={`Ubah ${displayName}`}
                            >
                              <Edit2 size={13} className="mr-1" /> Ubah
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-slate-600 hover:text-amber-600"
                            onClick={() => setDeactivatingId(item.id)}
                            aria-label={`Nonaktifkan ${displayName}`}
                          >
                            <PowerOff size={13} className="mr-1" /> Nonaktifkan
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-slate-600 hover:text-red-600"
                            onClick={() => setPermanentDeletingId(item.id)}
                            aria-label={`Hapus permanen ${displayName}`}
                          >
                            <Trash2 size={13} className="mr-1" /> Hapus
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => void handleReactivate(item)}
                            aria-label={`Aktifkan kembali ${displayName}`}
                          >
                            <RotateCcw size={13} className="mr-1" /> Aktifkan
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setPermanentDeletingId(item.id)}
                            aria-label={`Hapus permanen ${displayName}`}
                          >
                            <Trash2 size={13} className="mr-1" /> Hapus
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">Belum ada data.</p>
        )}
      </div>

      {/* Creation form */}
      {canManage && config.create && (
        <form onSubmit={submit} className="mt-5 border-t border-slate-100 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {config.fields.map((field) => {
              const isRequired = field !== 'jobTitleId';

              // If field is officeId, allow select from allOffices
              if (field === 'officeId' && allOffices.length > 0) {
                return (
                  <label key={field} className="block">
                    <span className="label">{field}</span>
                    <select name={field} aria-label={field} className="field" required={isRequired}>
                      <option value="">-- Pilih {field} --</option>
                      {allOffices.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.code})
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              // If field is divisionId, allow select from allDivisions
              if (field === 'divisionId' && allDivisions.length > 0) {
                return (
                  <label key={field} className="block">
                    <span className="label">{field}</span>
                    <select name={field} aria-label={field} className="field" required={isRequired}>
                      <option value="">-- Pilih {field} --</option>
                      {allDivisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              // If field is employeeId, allow select from allUsers
              if (field === 'employeeId' && allUsers.length > 0) {
                return (
                  <label key={field} className="block">
                    <span className="label">{field}</span>
                    <select name={field} aria-label={field} className="field" required={isRequired}>
                      <option value="">-- Pilih {field} --</option>
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.employeeNumber})
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              // If field is officeDivisionId, allow select from allOfficeDivisions
              if (field === 'officeDivisionId' && allOfficeDivisions.length > 0) {
                return (
                  <label key={field} className="block">
                    <span className="label">{field}</span>
                    <select name={field} aria-label={field} className="field" required={isRequired}>
                      <option value="">-- Pilih {field} --</option>
                      {allOfficeDivisions.map((od) => {
                        const off = allOffices.find((o) => o.id === od.officeId)?.name;
                        const div = allDivisions.find((d) => d.id === od.divisionId)?.name;
                        return (
                          <option key={od.id} value={od.id}>
                            {off ?? od.officeId} - {div ?? od.divisionId}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                );
              }

              // If field is jobTitleId, allow select from allJobTitles
              if (field === 'jobTitleId' && allJobTitles.length > 0) {
                return (
                  <label key={field} className="block">
                    <span className="label">{field}</span>
                    <select name={field} aria-label={field} className="field">
                      <option value="">-- Tanpa {field} --</option>
                      {allJobTitles.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name} ({j.code})
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              return (
                <label key={field} className="block">
                  <span className="label">{field}</span>
                  <input
                    name={field}
                    aria-label={field}
                    className="field"
                    required={isRequired}
                    placeholder={
                      field === 'timezone' ? 'Asia/Jakarta' : field === 'code' ? 'KODE' : ''
                    }
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            {feedback ? (
              <p role="status" className="text-xs text-slate-600 font-medium">
                {feedback}
              </p>
            ) : (
              <span />
            )}

            <Button disabled={saving} size="sm" className="gap-1.5">
              <Plus size={15} />
              {saving ? 'Menyimpan…' : 'Tambah'}
            </Button>
          </div>
        </form>
      )}

      {/* Edit modal replacing window.prompt */}
      <EditRecordModal
        open={editingItem !== null}
        item={editingItem}
        resourceKey={config.key}
        field={editField}
        fieldLabel={editFieldLabel}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />

      {/* Deactivate confirmation modal replacing window.confirm */}
      <ConfirmDialog
        open={deactivatingId !== null}
        title={`Nonaktifkan ${config.title}`}
        message={`Apakah Anda yakin ingin menonaktifkan data ini? Data yang dinonaktifkan (Soft Delete) tidak dapat digunakan untuk penugasan baru, namun histori tetap tersimpan.`}
        confirmLabel="Nonaktifkan"
        variant="danger"
        busy={deactivatingBusy}
        onConfirm={() => void handleConfirmDeactivate()}
        onCancel={() => setDeactivatingId(null)}
      />

      {/* Permanent delete confirmation modal */}
      <ConfirmDialog
        open={permanentDeletingId !== null}
        title={`Hapus Permanen ${config.title}`}
        message={`PERINGATAN: Apakah Anda yakin ingin MENGHAPUS PERMANEN data ini? Tindakan ini akan menghapus data dari database secara permanen.`}
        confirmLabel="Hapus Permanen"
        variant="danger"
        busy={permanentDeletingBusy}
        onConfirm={() => void handleConfirmPermanentDelete()}
        onCancel={() => setPermanentDeletingId(null)}
      />
    </section>
  );
}

export function OrganizationPage() {
  const { hasPermission } = useAuth();
  const allowed = (code: string) => hasPermission(code);

  // Prefetch masters for dropdown helpers
  const officesList = useList('/organization/offices');
  const divisionsList = useList('/organization/divisions');
  const jobTitlesList = useList('/organization/job-titles');
  const usersList = useList('/users');
  const officeDivisionsList = useList('/organization/office-divisions');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-brand" aria-hidden="true" />
            <span>Organisasi</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola data master kantor, divisi, jabatan, dan struktur penempatan karyawan.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {resources.map((config) => (
          <ResourceSection
            key={config.key}
            config={config}
            canManage={allowed(config.key === 'assignments' ? 'User.Manage' : 'System.Configure')}
            allOffices={officesList.items}
            allDivisions={divisionsList.items}
            allJobTitles={jobTitlesList.items}
            allUsers={usersList.items}
            allOfficeDivisions={officeDivisionsList.items}
          />
        ))}
      </div>
    </div>
  );
}
