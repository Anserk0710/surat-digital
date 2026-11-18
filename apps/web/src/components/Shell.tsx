import { Building2, Layers3, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../ui/button.js';
import { Alert } from '../ui/alert.js';
import type { ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  const { user, hasPermission, logoutUser, isSessionExpired } = useAuth();
  const navigate = useNavigate();

  const nav = [
    { to: '/', label: 'Beranda', icon: Layers3, show: true },
    {
      to: '/organization',
      label: 'Organisasi',
      icon: Building2,
      show:
        hasPermission('System.Configure') ||
        hasPermission('User.View') ||
        hasPermission('User.Manage'),
    },
    {
      to: '/users',
      label: 'Pengguna',
      icon: UserRound,
      show: hasPermission('User.View') || hasPermission('User.Manage'),
    },
    {
      to: '/groups',
      label: 'Group Policy',
      icon: ShieldCheck,
      show: hasPermission('Group.View') || hasPermission('Group.Manage'),
    },
    { to: '/profile', label: 'Profil Saya', icon: UserRound, show: true },
  ];

  async function handleLogout() {
    await logoutUser();
    navigate('/login');
  }

  return (
    <div className="min-h-screen lg:flex bg-[#f5f7fb]">
      {/* Sidebar */}
      <aside className="bg-brand p-5 text-white lg:min-h-screen lg:w-64 shrink-0 shadow-md">
        <div className="mb-8 flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <Layers3 className="h-6 w-6 text-blue-300" />
          <span>Surat Digital</span>
        </div>
        <nav aria-label="Navigasi utama" className="flex flex-wrap gap-1 lg:flex-col">
          {nav
            .filter((n) => n.show)
            .map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-brand shadow-xs'
                      : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
                  }`
                }
              >
                <n.icon size={18} />
                <span>{n.label}</span>
              </NavLink>
            ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-20 shadow-xs">
          <div>
            <p className="font-semibold text-slate-800 leading-tight">
              {user?.fullName ?? 'Pengguna'}
            </p>
            <p className="text-xs text-slate-500">{user?.company?.name ?? 'Perusahaan'}</p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut size={16} /> Keluar
          </Button>
        </header>

        {/* Session Expired Banner if triggered */}
        {isSessionExpired && (
          <div className="px-6 pt-4">
            <Alert variant="warning" title="Sesi Berakhir">
              Sesi Anda telah kedaluwarsa. Silakan masuk kembali untuk melanjutkan pekerjaan.
            </Alert>
          </div>
        )}

        {/* Content */}
        <main className="mx-auto max-w-6xl w-full p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
