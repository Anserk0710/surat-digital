import { ArrowRightIcon as ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { BuildingsIcon as Building2 } from '@phosphor-icons/react/dist/csr/Buildings';
import { ClipboardTextIcon as ClipboardCheck } from '@phosphor-icons/react/dist/csr/ClipboardText';
import { FileTextIcon as FileText } from '@phosphor-icons/react/dist/csr/FileText';
import { FilePlusIcon } from '@phosphor-icons/react/dist/csr/FilePlus';
import { FilesIcon } from '@phosphor-icons/react/dist/csr/Files';
import { ShieldCheckIcon as ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { UserIcon as UserRound } from '@phosphor-icons/react/dist/csr/User';
import { UsersIcon as UsersRound } from '@phosphor-icons/react/dist/csr/Users';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useList } from '../hooks/useList.js';
import { Card } from '../ui/card.js';
import type { GroupItem, OfficeItem, UserItem } from '../types/index.js';

function SummaryCard({
  title,
  value,
  detail,
  to,
}: {
  title: string;
  value: string | number;
  detail: string;
  to: string;
}) {
  return (
    <Link to={to} className="group block rounded-2xl">
      <Card className="h-full p-5 transition-colors group-hover:border-blue-300 sm:p-6">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        <p className="mt-2 text-xs text-slate-500">{detail}</p>
      </Card>
    </Link>
  );
}

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const canViewUsers = hasPermission('User.View') || hasPermission('User.Manage');
  const canManageUsers = hasPermission('User.Manage');
  const canViewOrganization = hasPermission('System.Configure') || hasPermission('User.View');
  const canViewGroups = hasPermission('Group.View') || hasPermission('Group.Manage');
  const canCreateDocument = hasPermission('Document.Create');
  const users = useList<UserItem>(canViewUsers ? '/users' : null);
  const offices = useList<OfficeItem>(canViewOrganization ? '/organization/offices' : null);
  const groups = useList<GroupItem>(canViewGroups ? '/group-policy/groups' : null);

  const summaries = [
    canViewUsers && {
      title: 'Pengguna',
      value: users.loading ? '…' : users.error ? '—' : users.items.length,
      detail: users.error ? 'Data tidak dapat dimuat' : 'Terdaftar di perusahaan Anda',
      to: '/users',
    },
    canViewOrganization && {
      title: 'Kantor aktif',
      value: offices.loading
        ? '…'
        : offices.error
          ? '—'
          : offices.items.filter((item) => item.active !== false).length,
      detail: offices.error ? 'Data tidak dapat dimuat' : 'Dalam struktur organisasi',
      to: '/organization',
    },
    canViewGroups && {
      title: 'Group Policy aktif',
      value: groups.loading
        ? '…'
        : groups.error
          ? '—'
          : groups.items.filter((item) => item.active !== false).length,
      detail: groups.error ? 'Data tidak dapat dimuat' : 'Grup hak akses perusahaan',
      to: '/groups',
    },
  ].filter((item): item is { title: string; value: string | number; detail: string; to: string } =>
    Boolean(item),
  );

  const menu = [
    {
      title: 'Buat Dokumen',
      detail: 'Mulai Draft surat baru',
      icon: FilePlusIcon,
      to: '/documents/new',
      show: canCreateDocument,
    },
    {
      title: 'Dokumen Saya',
      detail: 'Lihat Draft dan status dokumen yang Anda buat',
      icon: FilesIcon,
      to: '/documents',
      show: true,
    },
    {
      title: 'Organisasi',
      detail: 'Kantor, divisi, jabatan, dan struktur perusahaan',
      icon: Building2,
      to: '/organization',
      show: canViewOrganization,
    },
    {
      title: 'Pengguna',
      detail: 'Direktori karyawan dan pengelolaan akun',
      icon: UsersRound,
      to: '/users',
      show: canViewUsers,
    },
    {
      title: 'Group Policy',
      detail: 'Grup dan kebijakan hak akses',
      icon: ShieldCheck,
      to: '/groups',
      show: canViewGroups,
    },
    {
      title: 'Profil Saya',
      detail: 'Identitas dan informasi akun Anda',
      icon: UserRound,
      to: '/profile',
      show: true,
    },
  ].filter((item) => item.show);

  const pendingUsers =
    canManageUsers && !users.loading && !users.error
      ? users.items.filter((item) => item.status === 'PENDING').length
      : null;

  return (
    <div className="space-y-7 pb-6">
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-xs sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Beranda</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Selamat datang, {user?.fullName}
        </h1>
        <p className="mt-2 text-sm text-slate-600">Ringkasan pekerjaan di {user?.company?.name}.</p>
      </section>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-lg font-semibold text-slate-900">
          Ringkasan angka
        </h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">Data yang tersedia sesuai akses Anda.</p>
        {summaries.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <SummaryCard key={summary.title} {...summary} />
            ))}
          </div>
        ) : (
          <Card className="flex items-start gap-3 p-5 sm:p-6">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div>
              <p className="font-medium text-slate-900">Ringkasan dokumen belum tersedia</p>
              <p className="mt-1 text-sm text-slate-600">
                Jumlah tugas dan dokumen akan tampil saat modul surat aktif.
              </p>
            </div>
          </Card>
        )}
      </section>

      <section aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="text-lg font-semibold text-slate-900">
          Perlu perhatian
        </h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Tindakan yang dapat Anda lakukan sekarang.
        </p>
        <Card className="p-5 sm:p-6">
          {pendingUsers !== null && pendingUsers > 0 ? (
            <Link
              to="/users"
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg"
            >
              <span className="flex items-center gap-3">
                <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-slate-900">
                    {pendingUsers} akun menunggu aktivasi
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Tinjau akun karyawan yang belum aktif.
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                Lihat pengguna <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ) : (
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-blue-50 p-2.5 text-brand">
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-slate-900">Belum ada tugas yang ditampilkan</p>
                <p className="mt-1 text-sm text-slate-600">
                  Tugas Mengetahui dan persetujuan akan muncul setelah modul surat tersedia.
                </p>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section aria-labelledby="menu-heading">
        <h2 id="menu-heading" className="text-lg font-semibold text-slate-900">
          Menu kerja
        </h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">Akses fitur sesuai kewenangan Anda.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {menu.map((item) => (
            <Link key={item.to} to={item.to} className="group block rounded-2xl">
              <Card className="flex h-full items-start gap-4 p-5 transition-colors group-hover:border-blue-300 group-hover:shadow-sm sm:p-6">
                <span className="rounded-xl bg-blue-50 p-3 text-brand">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">
                    {item.detail}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
