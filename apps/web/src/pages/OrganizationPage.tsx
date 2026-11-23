import { useState, type FormEvent } from 'react';
import { BuildingsIcon as Building2 } from '@phosphor-icons/react/dist/csr/Buildings';
import { PencilSimpleIcon as Edit2 } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PlusIcon as Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { PowerIcon as PowerOff } from '@phosphor-icons/react/dist/csr/Power';
import { ArrowCounterClockwiseIcon as RotateCcw } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { TrashIcon as Trash2 } from '@phosphor-icons/react/dist/csr/Trash';
import { request } from '../api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useList } from '../hooks/useList.js';
import { useToast } from '../hooks/useToast.js';
import { formatErrorMessage } from '../lib/error.js';
import { Button } from '../ui/button.js';
import { Alert } from '../ui/alert.js';
import { TableSkeleton } from '../ui/skeleton.js';
import { ConfirmDialog } from '../ui/confirm-dialog.js';
import { EditRecordModal, type EditField } from '../components/EditRecordModal.js';
import { Modal } from '../ui/modal.js';
import type { RecordItem } from '../types/index.js';

const resources = [
  {
    key: 'companies',
    title: 'Perusahaan',
    fields: ['code', 'name', 'adminEmail', 'adminName'],
    create: true,
  },
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
    fields: [
      'employeeId',
      'officeDivisionId',
      'jobTitleId',
      'isPrimary',
      'validFrom',
      'validUntil',
    ],
    create: true,
  },
] as const;

type ResourceConfig = (typeof resources)[number];

function describeChange(change: Record<string, unknown>): string {
  const before = (change.before ?? {}) as Record<string, unknown>;
  const after = (change.after ?? {}) as Record<string, unknown>;
  const fields = [
    'code',
    'name',
    'timezone',
    'officeId',
    'divisionId',
    'employeeId',
    'officeDivisionId',
    'jobTitleId',
    'isPrimary',
    'validFrom',
    'validUntil',
    'active',
  ];
  return fields
    .filter(
      (field) =>
        before[field] !== after[field] &&
        (before[field] !== undefined || after[field] !== undefined),
    )
    .map((field) => `${field}: ${String(before[field] ?? '—')} → ${String(after[field] ?? '—')}`)
    .join(' · ');
}

function ResourceSection({
  config,
  canManage,
  canCreate,
  isPlatformAdmin,
  ownCompanyId,
  selectedCompanyId,
  onSelectCompany,
  onCompanyChanged,
  allOffices,
  allDivisions,
  allJobTitles,
  allUsers,
  allOfficeDivisions,
}: {
  config: ResourceConfig;
  canManage: boolean;
  canCreate: boolean;
  isPlatformAdmin: boolean;
  ownCompanyId: string | undefined;
  selectedCompanyId?: string | undefined;
  onSelectCompany?: (id: string) => void;
  onCompanyChanged?: () => Promise<unknown>;
  allOffices: RecordItem[];
  allDivisions: RecordItem[];
  allJobTitles: RecordItem[];
  allUsers: RecordItem[];
  allOfficeDivisions: RecordItem[];
}) {
  const scopedPath = (path: string) =>
    selectedCompanyId && config.key !== 'companies'
      ? `${path}${path.includes('?') ? '&' : '?'}companyId=${encodeURIComponent(selectedCompanyId)}`
      : path;
  const { items, loading, error, reload } = useList(scopedPath(`/organization/${config.key}`));
  async function refresh() {
    await reload();
    if (config.key === 'companies') {
      await onCompanyChanged?.();
    }
  }
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [historyItem, setHistoryItem] = useState<RecordItem | null>(null);
  const history = useList<Record<string, unknown>>(
    historyItem ? scopedPath(`/organization/changes/${config.key}/${historyItem.id}`) : null,
  );
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
      const data: Record<string, string | boolean | null> = Object.fromEntries(
        new FormData(form),
      ) as Record<string, string>;
      if (config.key === 'assignments') {
        data.isPrimary = data.isPrimary === 'on';
        data.jobTitleId = data.jobTitleId || null;
        data.validFrom = data.validFrom || null;
        data.validUntil = data.validUntil || null;
      }
      await request(scopedPath(`/organization/${config.key}`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
      form.reset();
      await refresh();
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
      await request(scopedPath(`/organization/${config.key}/${deactivatingId}?force=true`), {
        method: 'DELETE',
      });
      await refresh();
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
      await request(scopedPath(`/organization/${config.key}/${item.id}`), {
        method: 'PATCH',
        body: JSON.stringify({ active: true }),
      });
      await refresh();
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
      await request(
        scopedPath(`/organization/${config.key}/${permanentDeletingId}?permanent=true&force=true`),
        {
          method: 'DELETE',
        },
      );
      await refresh();
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

  async function handleSaveEdit(id: string, updates: Record<string, string | boolean | null>) {
    await request(scopedPath(`/organization/${config.key}/${id}`), {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    await refresh();
    toast.success('Perubahan data berhasil disimpan.');
  }

  const options = (items: RecordItem[], label: (item: RecordItem) => string) =>
    items
      .filter((item) => item.active !== false)
      .map((item) => ({ value: item.id, label: label(item) }));
  const editFields: EditField[] =
    config.key === 'companies'
      ? [
          ...(isPlatformAdmin ? [{ name: 'code', label: 'Kode', required: true }] : []),
          { name: 'name', label: 'Nama', required: true },
        ]
      : config.key === 'offices'
        ? [
            { name: 'code', label: 'Kode', required: true },
            { name: 'name', label: 'Nama', required: true },
            { name: 'timezone', label: 'Zona waktu', required: true },
          ]
        : config.key === 'divisions' || config.key === 'job-titles'
          ? [
              { name: 'code', label: 'Kode', required: true },
              { name: 'name', label: 'Nama', required: true },
            ]
          : config.key === 'office-divisions'
            ? [
                {
                  name: 'officeId',
                  label: 'Kantor',
                  required: true,
                  options: options(allOffices, (item) => `${item.name} (${item.code})`),
                },
                {
                  name: 'divisionId',
                  label: 'Divisi',
                  required: true,
                  options: options(allDivisions, (item) => `${item.name} (${item.code})`),
                },
              ]
            : [
                {
                  name: 'employeeId',
                  label: 'Karyawan',
                  required: true,
                  options: options(allUsers, (item) => String(item.fullName ?? item.id)),
                },
                {
                  name: 'officeDivisionId',
                  label: 'Kantor–Divisi',
                  required: true,
                  options: options(
                    allOfficeDivisions,
                    (item) =>
                      `${allOffices.find((office) => office.id === item.officeId)?.name ?? ''} – ${allDivisions.find((division) => division.id === item.divisionId)?.name ?? ''}`,
                  ),
                },
                {
                  name: 'jobTitleId',
                  label: 'Jabatan',
                  options: options(allJobTitles, (item) => String(item.name ?? item.id)),
                },
                { name: 'isPrimary', label: 'Penempatan utama', type: 'checkbox' },
                { name: 'validFrom', label: 'Berlaku sejak', type: 'date' },
                { name: 'validUntil', label: 'Berlaku hingga', type: 'date' },
              ];
  const filteredItems = items.filter((item) => {
    if (status === 'active' && item.active === false) {
      return false;
    }
    if (status === 'inactive' && item.active !== false) {
      return false;
    }
    const officeDivision = allOfficeDivisions.find((entry) => entry.id === item.officeDivisionId);
    const description = [
      item.code,
      item.name,
      item.fullName,
      item.employeeNumber,
      allUsers.find((entry) => entry.id === item.employeeId)?.fullName,
      allOffices.find((entry) => entry.id === (item.officeId ?? officeDivision?.officeId))?.name,
      allDivisions.find((entry) => entry.id === (item.divisionId ?? officeDivision?.divisionId))
        ?.name,
      allJobTitles.find((entry) => entry.id === item.jobTitleId)?.name,
    ]
      .join(' ')
      .toLowerCase();
    return description.includes(search.toLowerCase().trim());
  });
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="panel flex flex-col justify-between">
      {/* Direct h2 heading required for Playwright locator('..') parent access */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{config.title}</h2>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          className="field min-w-40 flex-1"
          aria-label={`Cari ${config.title}`}
          placeholder="Cari nama atau kode"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <select
          className="field w-auto"
          aria-label={`Status ${config.title}`}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

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
        ) : filteredItems.length ? (
          <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {visibleItems.map((item) => {
              const displayName =
                item.name ??
                item.code ??
                (config.key === 'assignments'
                  ? allUsers.find((user) => user.id === item.employeeId)?.fullName
                  : undefined) ??
                item.id;
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
                      {config.key === 'companies' && isPlatformAdmin && onSelectCompany && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectCompany(item.id)}
                        >
                          Kelola
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-slate-600 hover:text-brand"
                        onClick={() => setEditingItem(item)}
                        aria-label={`Ubah ${displayName}`}
                      >
                        <Edit2 size={13} className="mr-1" /> Ubah
                      </Button>
                      {!isInactive ? (
                        <>
                          {(config.key !== 'companies' ||
                            (isPlatformAdmin && item.id !== ownCompanyId)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-slate-600 hover:text-amber-600"
                              onClick={() => setDeactivatingId(item.id)}
                              aria-label={`Nonaktifkan ${displayName}`}
                            >
                              <PowerOff size={13} className="mr-1" /> Nonaktifkan
                            </Button>
                          )}
                          {(config.key !== 'companies' ||
                            (isPlatformAdmin && item.id !== ownCompanyId)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-slate-600 hover:text-red-600"
                              onClick={() => setPermanentDeletingId(item.id)}
                              aria-label={`Hapus permanen ${displayName}`}
                            >
                              <Trash2 size={13} className="mr-1" /> Hapus
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {(config.key !== 'companies' || isPlatformAdmin) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => void handleReactivate(item)}
                              aria-label={`Aktifkan kembali ${displayName}`}
                            >
                              <RotateCcw size={13} className="mr-1" /> Aktifkan
                            </Button>
                          )}
                          {(config.key !== 'companies' ||
                            (isPlatformAdmin && item.id !== ownCompanyId)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setPermanentDeletingId(item.id)}
                              aria-label={`Hapus permanen ${displayName}`}
                            >
                              <Trash2 size={13} className="mr-1" /> Hapus
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => setHistoryItem(item)}
                      >
                        Riwayat
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">Tidak ada data yang cocok.</p>
        )}
      </div>

      {!loading && pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Sebelumnya
          </Button>
          <span>
            Halaman {currentPage} dari {pageCount} ({filteredItems.length} data)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}

      {/* Creation form */}
      {config.key === 'companies' && !isPlatformAdmin && (
        <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
          Perusahaan baru dibuat oleh admin platform.{' '}
          {canManage && 'Anda dapat mengubah nama perusahaan ini.'}
        </p>
      )}
      {canCreate && config.create && (
        <form onSubmit={submit} className="mt-5 border-t border-slate-100 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {config.fields.map((field) => {
              const isRequired = !['jobTitleId', 'isPrimary', 'validFrom', 'validUntil'].includes(
                field,
              );
              const labels: Record<string, string> = {
                code: 'Kode',
                name: 'Nama',
                adminEmail: 'Email admin pertama',
                adminName: 'Nama admin pertama',
                timezone: 'Zona waktu',
                officeId: 'Kantor',
                divisionId: 'Divisi',
                employeeId: 'Karyawan',
                officeDivisionId: 'Kantor–Divisi',
                jobTitleId: 'Jabatan',
                isPrimary: 'Penempatan utama',
                validFrom: 'Berlaku sejak',
                validUntil: 'Berlaku hingga',
              };

              if (field === 'isPrimary') {
                return (
                  <label key={field} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={field} />
                    {labels[field]}
                  </label>
                );
              }

              // If field is officeId, allow select from allOffices
              if (field === 'officeId' && allOffices.length > 0) {
                return (
                  <label key={field} className="block">
                    <span className="label">{labels[field]}</span>
                    <select name={field} aria-label={field} className="field" required={isRequired}>
                      <option value="">-- Pilih {field} --</option>
                      {allOffices
                        .filter((o) => o.active !== false)
                        .map((o) => (
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
                    <span className="label">{labels[field]}</span>
                    <select name={field} aria-label={field} className="field" required={isRequired}>
                      <option value="">-- Pilih {field} --</option>
                      {allDivisions
                        .filter((d) => d.active !== false)
                        .map((d) => (
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
                    <span className="label">{labels[field]}</span>
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
                    <span className="label">{labels[field]}</span>
                    <select name={field} aria-label={field} className="field" required={isRequired}>
                      <option value="">-- Pilih {field} --</option>
                      {allOfficeDivisions
                        .filter((od) => od.active !== false)
                        .map((od) => {
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
                    <span className="label">{labels[field]}</span>
                    <select name={field} aria-label={field} className="field">
                      <option value="">-- Tanpa {field} --</option>
                      {allJobTitles
                        .filter((j) => j.active !== false)
                        .map((j) => (
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
                  <span className="label">{labels[field]}</span>
                  <input
                    name={field}
                    aria-label={field}
                    className="field"
                    type={
                      field === 'validFrom' || field === 'validUntil'
                        ? 'date'
                        : field === 'adminEmail'
                          ? 'email'
                          : 'text'
                    }
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
        item={editingItem}
        title={config.title}
        fields={editFields}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />

      <Modal
        open={historyItem !== null}
        onClose={() => setHistoryItem(null)}
        title={`Riwayat ${config.title}`}
      >
        {history.loading ? (
          <p>Memuat riwayat…</p>
        ) : history.error ? (
          <Alert variant="danger">{history.error}</Alert>
        ) : history.items.length === 0 ? (
          <p>Belum ada perubahan tercatat.</p>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto text-sm">
            {history.items.map((change) => (
              <li key={String(change.id)} className="border-b pb-2">
                <strong>{String(change.action)}</strong> ·{' '}
                {new Date(String(change.occurredAt)).toLocaleString('id-ID')}
                <p className="text-slate-500">Oleh karyawan {String(change.actorEmployeeId)}</p>
                <p>{describeChange(change)}</p>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Deactivate confirmation modal replacing window.confirm */}
      <ConfirmDialog
        open={deactivatingId !== null}
        title={`Nonaktifkan ${config.title}`}
        message={
          config.key === 'companies'
            ? 'Perusahaan dan seluruh akses penggunanya akan dinonaktifkan. Data dan riwayat tetap tersimpan.'
            : 'Master ini akan dinonaktifkan. Data terkait tetap tersimpan, tetapi tidak dapat dipakai untuk tindakan baru sampai master diaktifkan kembali.'
        }
        confirmLabel="Nonaktifkan"
        variant="danger"
        busy={deactivatingBusy}
        requireAcknowledgement
        onConfirm={() => void handleConfirmDeactivate()}
        onCancel={() => setDeactivatingId(null)}
      />

      {/* Permanent delete confirmation modal */}
      <ConfirmDialog
        open={permanentDeletingId !== null}
        title={`Hapus Permanen ${config.title}`}
        message={
          config.key === 'companies'
            ? 'Seluruh dokumen, karyawan, penempatan, grup, sesi, riwayat, dan akun autentikasi perusahaan ini akan dihapus permanen. Tindakan ini tidak dapat dipulihkan.'
            : 'Master ini dan seluruh dokumen atau penempatan yang bergantung padanya akan dihapus permanen. Tindakan ini tidak dapat dipulihkan.'
        }
        confirmLabel="Hapus Permanen"
        variant="danger"
        busy={permanentDeletingBusy}
        requireAcknowledgement
        onConfirm={() => void handleConfirmPermanentDelete()}
        onCancel={() => setPermanentDeletingId(null)}
      />
    </section>
  );
}

export function OrganizationPage() {
  const { hasPermission, user } = useAuth();
  const allowed = (code: string) => hasPermission(code);
  const isPlatformAdmin = user?.isPlatformAdmin === true;
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const companies = useList('/organization/companies');
  const activeCompanyId = isPlatformAdmin ? selectedCompanyId : user?.company?.id;
  const scopedCompanyQuery = activeCompanyId
    ? `?companyId=${encodeURIComponent(activeCompanyId)}`
    : null;

  // Prefetch masters for dropdown helpers
  const officesList = useList(scopedCompanyQuery && `/organization/offices${scopedCompanyQuery}`);
  const divisionsList = useList(
    scopedCompanyQuery && `/organization/divisions${scopedCompanyQuery}`,
  );
  const jobTitlesList = useList(
    scopedCompanyQuery && `/organization/job-titles${scopedCompanyQuery}`,
  );
  const usersList = useList(scopedCompanyQuery && `/users${scopedCompanyQuery}`);
  const officeDivisionsList = useList(
    scopedCompanyQuery && `/organization/office-divisions${scopedCompanyQuery}`,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-brand" aria-hidden="true" />
            <span>Organisasi</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola perusahaan, kantor, divisi, jabatan, relasi organisasi, dan penempatan karyawan.
          </p>
        </div>
      </div>

      {isPlatformAdmin && selectedCompanyId && (
        <Button variant="outline" onClick={() => setSelectedCompanyId(null)}>
          Kembali ke daftar perusahaan
        </Button>
      )}
      {isPlatformAdmin && selectedCompanyId && (
        <p className="text-sm text-slate-600">
          Mengelola:{' '}
          {companies.items.find((item) => item.id === selectedCompanyId)?.name ?? selectedCompanyId}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {resources
          .filter(
            (config) =>
              !isPlatformAdmin ||
              (selectedCompanyId ? config.key !== 'companies' : config.key === 'companies'),
          )
          .map((config) => (
            <ResourceSection
              key={`${config.key}:${activeCompanyId ?? ''}`}
              config={config}
              canManage={
                isPlatformAdmin ||
                allowed(config.key === 'assignments' ? 'User.Manage' : 'System.Configure')
              }
              canCreate={
                config.key === 'companies'
                  ? isPlatformAdmin
                  : isPlatformAdmin ||
                    allowed(config.key === 'assignments' ? 'User.Manage' : 'System.Configure')
              }
              isPlatformAdmin={isPlatformAdmin}
              ownCompanyId={user?.company?.id}
              selectedCompanyId={activeCompanyId ?? undefined}
              onSelectCompany={setSelectedCompanyId}
              onCompanyChanged={companies.reload}
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
