import { Building2, FileText, Layers3, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Card } from '../ui/card.js';
import { Badge } from '../ui/badge.js';

export function DashboardPage() {
  const { user, permissions, hasPermission } = useAuth();

  const cards = [
    {
      title: 'Organisasi',
      desc: 'Konfigurasi kantor, divisi, jabatan, dan struktur perusahaan',
      icon: Building2,
      to: '/organization',
      badge: 'Master',
      show:
        hasPermission('System.Configure') ||
        hasPermission('User.View') ||
        hasPermission('User.Manage'),
    },
    {
      title: 'Pengguna',
      desc: 'Kelola direktori karyawan, aktivasi akun, dan import massal',
      icon: UserRound,
      to: '/users',
      badge: 'Admin',
      show: hasPermission('User.View') || hasPermission('User.Manage'),
    },
    {
      title: 'Group Policy',
      desc: 'Pengaturan grup hak akses, kebijakan izin Allow/Deny, dan audit',
      icon: ShieldCheck,
      to: '/groups',
      badge: 'Keamanan',
      show: hasPermission('Group.View') || hasPermission('Group.Manage'),
    },
    {
      title: 'Profil Saya',
      desc: 'Lihat informasi identitas, NIP, email, dan perbarui data profil',
      icon: UserRound,
      to: '/profile',
      badge: 'Akun',
      show: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-brand to-blue-900 p-8 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Selamat datang, {user?.fullName}</h1>
            <p className="mt-2 text-blue-100 max-w-xl text-sm leading-relaxed">
              Anda terhubung ke <strong>{user?.company?.name}</strong>. Kelola alur surat, hak
              akses, dan master data organisasi dengan mudah dan aman.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-xs text-xs font-medium">
            <Layers3 className="h-4 w-4 text-blue-200" />
            <span>NIP: {user?.employeeNumber}</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Area Kerja</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards
            .filter((c) => c.show)
            .map((card) => (
              <Link
                key={card.to}
                to={card.to}
                className="group block transition-transform hover:-translate-y-1"
              >
                <Card className="h-full border border-slate-200 p-6 transition-all group-hover:border-blue-300 group-hover:shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="rounded-xl bg-blue-50 p-2.5 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                      <card.icon size={22} />
                    </div>
                    <Badge variant="outline">{card.badge}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-brand transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{card.desc}</p>
                </Card>
              </Link>
            ))}
        </div>
      </div>

      {/* Quick Overview Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="font-semibold text-slate-900">Status Akses & Kebijakan Anda</h3>
            <Badge variant="success">Aktif</Badge>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Hak akses Anda ditentukan secara otomatis berdasarkan Group Policy yang ditetapkan oleh
            administrator. Kebijakan <strong>DENY</strong> selalu memiliki prioritas di atas
            <strong> ALLOW</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            {permissions.length > 0 ? (
              permissions.map((p) => (
                <Badge
                  key={p.code}
                  variant={p.decision === 'ALLOW' ? 'success' : 'default'}
                  className="py-1 px-3"
                >
                  {p.code}: {p.decision}
                </Badge>
              ))
            ) : (
              <p className="text-xs text-slate-400">Tidak ada izin eksplisit terdaftar.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4 font-semibold text-slate-900">
            <FileText className="h-5 w-5 text-brand" />
            <span>Informasi Dokumen</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Modul pengelolaan surat digital (P08+) akan menyediakan pembuatan Draft, pengunggahan
            berkas, dan persetujuan berjenjang.
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 border border-slate-100">
            Fokus P00–P06: Fondasi arsitektur, master organisasi, dan evaluasi Group Policy.
          </div>
        </Card>
      </div>
    </div>
  );
}
