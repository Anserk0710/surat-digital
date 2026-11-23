import { useEffect, useState, type FormEvent } from 'react';
import { PlusIcon as Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { PowerIcon as PowerOff } from '@phosphor-icons/react/dist/csr/Power';
import { ArrowCounterClockwiseIcon as RotateCcw } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { ShieldIcon as Shield } from '@phosphor-icons/react/dist/csr/Shield';
import { ShieldWarningIcon as ShieldAlert } from '@phosphor-icons/react/dist/csr/ShieldWarning';
import { ShieldCheckIcon as ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { TrashIcon as Trash2 } from '@phosphor-icons/react/dist/csr/Trash';
import { UsersIcon as Users } from '@phosphor-icons/react/dist/csr/Users';
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
import type { GroupItem, GroupMemberCandidate, PermissionCatalogItem } from '../types/index.js';

interface GroupDetailProps {
  group: GroupItem;
  manage: boolean;
  submit: (path: string, method: string, data: Record<string, string>) => Promise<void>;
  onPermissionsChanged: () => Promise<void>;
  onDeactivateGroup: () => Promise<void>;
  onReactivateGroup: () => Promise<void>;
  onPermanentDeleteGroup: () => Promise<void>;
}

function GroupDetail({
  group,
  manage,
  submit,
  onPermissionsChanged,
  onDeactivateGroup,
  onReactivateGroup,
  onPermanentDeleteGroup,
}: GroupDetailProps) {
  const id = group.id;
  const members = useList(`/group-policy/groups/${id}/members`);
  const policies = useList(`/group-policy/groups/${id}/permissions`);
  const catalog = useList<PermissionCatalogItem>('/group-policy/permissions');
  const toast = useToast();
  const [memberSearch, setMemberSearch] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<GroupMemberCandidate | null>(null);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [permissionEffect, setPermissionEffect] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [savingPermissions, setSavingPermissions] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMemberQuery(memberSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [memberSearch]);
  const candidates = useList<GroupMemberCandidate>(
    manage && memberQuery.length >= 2
      ? `/group-policy/groups/${id}/member-candidates?q=${encodeURIComponent(memberQuery)}`
      : null,
  );
  const activeMembers = members.items.filter((member) => member.active !== false);
  const activePolicies = policies.items.filter((policy) => policy.active !== false);
  const filteredCatalog = catalog.items.filter((permission) =>
    `${permission.code} ${permission.name ?? ''} ${permission.description ?? ''}`
      .toLocaleLowerCase('id-ID')
      .includes(permissionSearch.trim().toLocaleLowerCase('id-ID')),
  );

  const [deleteMemberTarget, setDeleteMemberTarget] = useState<string | null>(null);
  const [deletePolicyTarget, setDeletePolicyTarget] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [groupActionBusy, setGroupActionBusy] = useState(false);

  const catalogCode = (permissionId: string) =>
    catalog.items.find((p) => p.id === permissionId)?.code ?? permissionId;

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) {
      return;
    }
    try {
      await submit(`/group-policy/groups/${id}/members`, 'POST', { employeeId: selectedMember.id });
      setMemberSearch('');
      setSelectedMember(null);
      await members.reload();
      await onPermissionsChanged();
      toast.success('Anggota berhasil ditambahkan ke grup.');
    } catch (err) {
      toast.error(formatErrorMessage(err));
    }
  }

  async function addPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedCodes.length === 0 || savingPermissions) {
      return;
    }
    setSavingPermissions(true);
    try {
      await request(`/group-policy/groups/${id}/permissions/batch`, {
        method: 'POST',
        body: JSON.stringify({ permissionCodes: selectedCodes, effect: permissionEffect }),
      });
      await policies.reload();
      await onPermissionsChanged();
      setSelectedCodes([]);
      toast.success(`${selectedCodes.length} kebijakan izin berhasil disimpan.`);
    } catch (err) {
      toast.error(formatErrorMessage(err));
    } finally {
      setSavingPermissions(false);
    }
  }

  async function confirmDeleteMember() {
    if (!deleteMemberTarget) {
      return;
    }
    try {
      await submit(`/group-policy/groups/${id}/members/${deleteMemberTarget}`, 'DELETE', {});
      await members.reload();
      await onPermissionsChanged();
      toast.success('Anggota berhasil dihapus dari grup.');
      setDeleteMemberTarget(null);
    } catch (err) {
      toast.error(formatErrorMessage(err));
    }
  }

  async function confirmDeletePolicy() {
    if (!deletePolicyTarget) {
      return;
    }
    try {
      await submit(`/group-policy/groups/${id}/permissions/${deletePolicyTarget}`, 'DELETE', {});
      await policies.reload();
      await onPermissionsChanged();
      toast.success('Kebijakan izin dihapus dari grup.');
      setDeletePolicyTarget(null);
    } catch (err) {
      toast.error(formatErrorMessage(err));
    }
  }

  return (
    <Card className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand" />
            <span>{group.name}</span>
            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {group.code}
            </span>
            {group.active === false ? (
              <Badge variant="danger" className="text-[10px]">
                Nonaktif
              </Badge>
            ) : (
              <Badge variant="success" className="text-[10px]">
                Aktif
              </Badge>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Perubahan izin dibaca ulang oleh server pada tiap permintaan.
          </p>
        </div>

        {manage && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {group.active === false ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                onClick={() => void onReactivateGroup()}
              >
                <RotateCcw size={13} /> Aktifkan
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 gap-1"
                onClick={() => setConfirmDeactivate(true)}
              >
                <PowerOff size={13} /> Nonaktifkan
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-red-600 border-red-300 hover:bg-red-50 gap-1"
              disabled={group.code === 'ADMIN'}
              title={group.code === 'ADMIN' ? 'Grup ADMIN tidak boleh dihapus' : 'Hapus Permanen'}
              onClick={() => setConfirmPermanent(true)}
            >
              <Trash2 size={13} /> Hapus
            </Button>
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2 mb-3">
          <Users size={16} className="text-slate-500" />
          <span>Anggota Grup</span>
          <Badge variant="outline" className="text-[10px]">
            {activeMembers.length}
          </Badge>
        </h3>

        {members.loading ? (
          <TableSkeleton rows={2} />
        ) : members.error ? (
          <Alert variant="danger">{members.error}</Alert>
        ) : activeMembers.length ? (
          <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto mb-3">
            {activeMembers.map((m) => {
              const employee = m.employee as
                { fullName: string; employeeNumber: string } | undefined;
              return (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">
                    <strong>{employee?.fullName ?? m.employeeId ?? m.id}</strong>
                    {employee && (
                      <span className="ml-2 text-xs text-slate-500">
                        NIP {employee.employeeNumber}
                      </span>
                    )}
                  </span>
                  {manage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteMemberTarget(m.employeeId ?? m.id)}
                    >
                      <Trash2 size={13} className="mr-1" /> Hapus
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 py-2">Belum ada anggota dalam grup ini.</p>
        )}

        {manage && (
          <form className="mt-3 space-y-2" onSubmit={addMember}>
            <label className="block text-xs font-medium text-slate-700" htmlFor="member-search">
              Cari karyawan berdasarkan nama atau NIP
            </label>
            <input
              id="member-search"
              className="field"
              value={memberSearch}
              maxLength={100}
              autoComplete="off"
              placeholder="Ketik minimal 2 karakter"
              onChange={(event) => {
                setMemberSearch(event.target.value);
                setSelectedMember(null);
              }}
            />
            {selectedMember ? (
              <p className="text-xs text-emerald-700" role="status">
                Dipilih: {selectedMember.fullName} · NIP {selectedMember.employeeNumber}
              </p>
            ) : memberSearch.trim().length >= 2 ? (
              <div className="max-h-40 overflow-y-auto rounded border border-slate-200">
                {memberQuery !== memberSearch.trim() || candidates.loading ? (
                  <p className="p-2 text-xs text-slate-500">Mencari karyawan…</p>
                ) : candidates.error ? (
                  <p className="p-2 text-xs text-red-600">{candidates.error}</p>
                ) : candidates.items.length === 0 ? (
                  <p className="p-2 text-xs text-slate-500">Tidak ada karyawan aktif yang cocok.</p>
                ) : (
                  candidates.items.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => setSelectedMember(candidate)}
                    >
                      {candidate.fullName}{' '}
                      <span className="text-xs text-slate-500">
                        · NIP {candidate.employeeNumber}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
            <Button size="sm" className="gap-1" disabled={!selectedMember}>
              <Plus size={14} /> Tambah anggota
            </Button>
          </form>
        )}
      </div>

      {/* Permissions Section */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-slate-500" />
          <span>Kebijakan Izin (Allow / Deny)</span>
          <Badge variant="outline" className="text-[10px]">
            {activePolicies.length}
          </Badge>
        </h3>

        {policies.loading ? (
          <TableSkeleton rows={2} />
        ) : policies.error ? (
          <Alert variant="danger">{policies.error}</Alert>
        ) : activePolicies.length ? (
          <ul className="divide-y divide-slate-100 max-h-56 overflow-y-auto mb-3">
            {activePolicies.map((p) => {
              const pRecord = p as Record<string, unknown>;
              const code = catalogCode(String(pRecord.permissionId));
              const effect = String(pRecord.effect ?? 'ALLOW');
              return (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{code}</span>
                    <Badge
                      variant={effect === 'ALLOW' ? 'success' : 'danger'}
                      className="text-[10px]"
                    >
                      {effect}
                    </Badge>
                  </div>
                  {manage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeletePolicyTarget(code)}
                    >
                      <Trash2 size={13} className="mr-1" /> Hapus
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 py-2">Belum ada kebijakan izin untuk grup ini.</p>
        )}

        {manage && (
          <form className="mt-3 space-y-3" onSubmit={addPermission}>
            <input
              className="field"
              aria-label="Cari izin"
              placeholder="Cari kode atau nama izin"
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
            />
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{selectedCodes.length} izin dipilih</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-brand hover:underline"
                  onClick={() =>
                    setSelectedCodes((current) => [
                      ...new Set([...current, ...filteredCatalog.map((p) => p.code)]),
                    ])
                  }
                >
                  Pilih semua hasil
                </button>
                <button
                  type="button"
                  className="text-slate-500 hover:underline"
                  onClick={() => setSelectedCodes([])}
                >
                  Kosongkan
                </button>
              </div>
            </div>
            {catalog.error ? (
              <Alert variant="danger">{catalog.error}</Alert>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded border border-slate-200 divide-y divide-slate-100">
                {filteredCatalog.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-start gap-2 px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedCodes.includes(permission.code)}
                      onChange={(event) =>
                        setSelectedCodes((current) =>
                          event.target.checked
                            ? [...current, permission.code]
                            : current.filter((code) => code !== permission.code),
                        )
                      }
                    />
                    <span className="min-w-0 text-sm">
                      <strong className="block text-slate-800">{permission.code}</strong>
                      <span className="text-xs text-slate-500">
                        {permission.name ?? permission.description}
                      </span>
                    </span>
                  </label>
                ))}
                {!catalog.loading && filteredCatalog.length === 0 && (
                  <p className="p-3 text-xs text-slate-500">Tidak ada izin yang cocok.</p>
                )}
              </div>
            )}
            <fieldset className="flex items-center gap-4 text-sm">
              <legend className="mb-1 text-xs font-medium text-slate-700">
                Keputusan untuk izin terpilih
              </legend>
              {(['ALLOW', 'DENY'] as const).map((effect) => (
                <label key={effect} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="effect"
                    checked={permissionEffect === effect}
                    onChange={() => setPermissionEffect(effect)}
                  />
                  {effect === 'ALLOW' ? 'Allow' : 'Deny'}
                </label>
              ))}
            </fieldset>
            <Button size="sm" disabled={selectedCodes.length === 0 || savingPermissions}>
              {savingPermissions ? 'Menyimpan…' : `Simpan ${selectedCodes.length} izin`}
            </Button>
          </form>
        )}
      </div>

      {/* Delete Member Confirmation */}
      <ConfirmDialog
        open={deleteMemberTarget !== null}
        title="Hapus Anggota Grup"
        message="Apakah Anda yakin ingin menghapus anggota ini dari grup? Hak aksesnya akan langsung diperbarui."
        confirmLabel="Hapus Anggota"
        variant="danger"
        onConfirm={() => void confirmDeleteMember()}
        onCancel={() => setDeleteMemberTarget(null)}
      />

      {/* Delete Policy Confirmation */}
      <ConfirmDialog
        open={deletePolicyTarget !== null}
        title="Hapus Kebijakan Izin"
        message={`Apakah Anda yakin ingin menghapus izin "${deletePolicyTarget}" dari grup ini?`}
        confirmLabel="Hapus Izin"
        variant="danger"
        busy={groupActionBusy}
        onConfirm={() => void confirmDeletePolicy()}
        onCancel={() => setDeletePolicyTarget(null)}
      />

      {/* Group Deactivate (Soft Delete) Confirmation */}
      <ConfirmDialog
        open={confirmDeactivate}
        title="Nonaktifkan Grup"
        message={`Apakah Anda yakin ingin menonaktifkan grup "${group.name}"? Seluruh keanggotaan dan izin dalam grup ini akan dinonaktifkan.`}
        confirmLabel="Nonaktifkan"
        variant="danger"
        busy={groupActionBusy}
        onConfirm={async () => {
          setGroupActionBusy(true);
          try {
            await onDeactivateGroup();
            setConfirmDeactivate(false);
          } finally {
            setGroupActionBusy(false);
          }
        }}
        onCancel={() => setConfirmDeactivate(false)}
      />

      {/* Group Permanent Delete Confirmation */}
      <ConfirmDialog
        open={confirmPermanent}
        title="Hapus Permanen Grup"
        message={`PERINGATAN: Apakah Anda yakin ingin MENGHAPUS PERMANEN grup "${group.name}" (${group.code})? Seluruh data grup, anggota, dan kebijakan izin terkait akan dihapus secara permanen dari database.`}
        confirmLabel="Hapus Permanen"
        variant="danger"
        busy={groupActionBusy}
        onConfirm={async () => {
          setGroupActionBusy(true);
          try {
            await onPermanentDeleteGroup();
            setConfirmPermanent(false);
          } finally {
            setGroupActionBusy(false);
          }
        }}
        onCancel={() => setConfirmPermanent(false)}
      />
    </Card>
  );
}

export function GroupsPage() {
  const { permissions, reloadAuth, hasPermission } = useAuth();
  const manage = hasPermission('Group.Manage') && hasPermission('System.Configure');

  const { items, loading, error, reload } = useList<GroupItem>('/group-policy/groups');
  const [selectedId, setSelectedId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const selectedGroup = items.find((g) => g.id === selectedId);

  async function handleGroupApi(path: string, method: string, data: Record<string, string>) {
    try {
      await request(path, { method, body: JSON.stringify(data) });
      setFeedback('Perubahan tersimpan.');
      await reload();
      await reloadAuth();
    } catch (reason) {
      const err = formatErrorMessage(reason);
      setFeedback(err);
      throw reason;
    }
  }

  async function handleDeactivateGroup() {
    if (!selectedId) {
      return;
    }
    try {
      await request(`/group-policy/groups/${selectedId}`, { method: 'DELETE' });
      await reload();
      await reloadAuth();
      toast.success('Grup berhasil dinonaktifkan.');
    } catch (err) {
      toast.error(formatErrorMessage(err));
    }
  }

  async function handleReactivateGroup() {
    if (!selectedId) {
      return;
    }
    try {
      await request(`/group-policy/groups/${selectedId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active: true }),
      });
      await reload();
      await reloadAuth();
      toast.success('Grup berhasil diaktifkan kembali.');
    } catch (err) {
      toast.error(formatErrorMessage(err));
    }
  }

  async function handlePermanentDeleteGroup() {
    if (!selectedId) {
      return;
    }
    try {
      await request(`/group-policy/groups/${selectedId}?permanent=true`, { method: 'DELETE' });
      setSelectedId('');
      await reload();
      await reloadAuth();
      toast.success('Grup berhasil dihapus permanen.');
    } catch (err) {
      toast.error(formatErrorMessage(err));
    }
  }

  async function createGroup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setFeedback('');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    try {
      await handleGroupApi('/group-policy/groups', 'POST', data);
      form.reset();
      toast.success('Grup baru berhasil dibuat.');
    } catch (reason) {
      toast.error(formatErrorMessage(reason));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-brand" />
          <span>Group Policy</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Konfigurasi peran otorisasi, penugasan anggota, dan kebijakan evaluasi izin.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Group List & Creation */}
        <Card className="panel flex flex-col justify-between">
          <div>
            <CardHeader
              title="Daftar Group"
              description="Pilih salah satu grup untuk melihat dan mengelola anggotanya"
              action={
                <Badge variant="outline" className="text-xs">
                  {items.length} grup
                </Badge>
              }
            />

            {loading ? (
              <TableSkeleton rows={3} />
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : items.length ? (
              <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {items.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <li key={item.id} className="py-1">
                      <button
                        type="button"
                        className={`w-full rounded-xl px-4 py-3 text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand text-white shadow-xs font-semibold'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <div>
                          <span>{item.name}</span>
                          <span
                            className={`ml-2 text-xs font-mono ${
                              isSelected ? 'text-blue-200' : 'text-slate-400'
                            }`}
                          >
                            {item.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.active === false && (
                            <Badge
                              variant="danger"
                              className={`text-[10px] ${
                                isSelected ? 'bg-white/20 text-white border-0' : ''
                              }`}
                            >
                              Nonaktif
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge
                              variant="primary"
                              className="bg-white/20 text-white border-0 text-[10px]"
                            >
                              Dipilih
                            </Badge>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada group terdaftar.</p>
            )}
          </div>

          {/* Create Group Form */}
          {manage && (
            <form onSubmit={createGroup} className="mt-6 border-t border-slate-100 pt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tambah Group Baru
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="field" name="code" placeholder="Kode" required />
                <input className="field" name="name" placeholder="Nama" required />
              </div>
              <Button disabled={creating} size="sm" className="w-full gap-1.5">
                <Plus size={15} />
                {creating ? 'Menyimpan…' : 'Tambah'}
              </Button>
            </form>
          )}
        </Card>

        {/* Right: Group Detail or Placeholder */}
        {selectedGroup ? (
          <GroupDetail
            key={selectedGroup.id}
            group={selectedGroup}
            manage={manage}
            submit={handleGroupApi}
            onPermissionsChanged={reloadAuth}
            onDeactivateGroup={handleDeactivateGroup}
            onReactivateGroup={handleReactivateGroup}
            onPermanentDeleteGroup={handlePermanentDeleteGroup}
          />
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center text-slate-400 border-dashed">
            <Shield className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="font-semibold text-slate-700">Pilih Group</h3>
            <p className="mt-1 text-xs max-w-xs text-slate-500">
              Klik salah satu grup di sebelah kiri untuk melihat daftar anggota dan mengatur
              kebijakan izin.
            </p>
          </Card>
        )}
      </div>

      {/* Effective Permissions Section */}
      <Card className="panel">
        <h2 className="mb-1 font-semibold text-base text-slate-900">Izin efektif saya</h2>
        <p className="mb-4 text-xs text-slate-500 leading-relaxed">
          Keputusan terbaru berasal dari server. Prinsip precedence deterministik menjamin{' '}
          <strong className="text-rose-600">DENY</strong> selalu mengalahkan{' '}
          <strong className="text-emerald-600">ALLOW</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          {permissions.length > 0 ? (
            permissions.map((permission) => (
              <span
                key={permission.code}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                  permission.decision === 'ALLOW'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {permission.code}: {permission.decision}
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-400">Tidak ada izin efektif yang aktif.</p>
          )}
        </div>
      </Card>

      {/* Legacy feedback element for test assertions */}
      {feedback && (
        <p role="status" className="sr-only">
          {feedback}
        </p>
      )}
    </div>
  );
}
