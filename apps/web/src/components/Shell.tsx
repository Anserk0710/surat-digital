import { BuildingsIcon as Building2 } from '@phosphor-icons/react/dist/csr/Buildings';
import { CaretDoubleLeftIcon } from '@phosphor-icons/react/dist/csr/CaretDoubleLeft';
import { CaretDoubleRightIcon } from '@phosphor-icons/react/dist/csr/CaretDoubleRight';
import { FilePlusIcon } from '@phosphor-icons/react/dist/csr/FilePlus';
import { FilesIcon } from '@phosphor-icons/react/dist/csr/Files';
import { HouseIcon } from '@phosphor-icons/react/dist/csr/House';
import { ListIcon } from '@phosphor-icons/react/dist/csr/List';
import { SignOutIcon as LogOut } from '@phosphor-icons/react/dist/csr/SignOut';
import { StackIcon as Layers3 } from '@phosphor-icons/react/dist/csr/Stack';
import { ShieldCheckIcon as ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { UserIcon as UserRound } from '@phosphor-icons/react/dist/csr/User';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../ui/button.js';
import { Alert } from '../ui/alert.js';

export function Shell({ children }: { children: ReactNode }) {
  const { user, hasPermission, logoutUser, isSessionExpired } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nav = [
    { to: '/', label: 'Beranda', icon: HouseIcon, show: true },
    {
      to: '/documents/new',
      label: 'Buat Dokumen',
      icon: FilePlusIcon,
      show: hasPermission('Document.Create'),
    },
    { to: '/documents', label: 'Dokumen Saya', icon: FilesIcon, show: true },
    {
      to: '/organization',
      label: 'Organisasi',
      icon: Building2,
      show: hasPermission('System.Configure') || hasPermission('User.View'),
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
  const visibleNav = nav.filter((item) => item.show);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  async function handleLogout() {
    await logoutUser();
    navigate('/login');
  }

  return (
    <div className="min-h-screen lg:flex bg-[#f5f7fb]">
      <div className="sticky top-0 z-30 border-b border-blue-900 bg-brand text-white shadow-sm lg:hidden">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Layers3 className="h-7 w-7 shrink-0 text-blue-200" />
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Surat Digital</p>
              <p className="truncate text-xs text-blue-200">{user?.company?.name}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/20 text-white hover:bg-white/10"
          >
            {mobileMenuOpen ? <XIcon size={22} /> : <ListIcon size={22} />}
          </button>
        </div>
        {mobileMenuOpen && (
          <>
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-x-0 bottom-0 top-16 z-0 bg-slate-950/30 backdrop-blur-sm"
            />
            <nav
              id="mobile-navigation"
              aria-label="Navigasi mobile"
              className="absolute inset-x-0 top-full z-10 max-h-[calc(100dvh-4rem)] space-y-1 overflow-y-auto overscroll-contain border-t border-white/10 bg-brand px-3 pb-4 pt-2 shadow-xl"
            >
              {visibleNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium transition-colors ${isActive ? 'bg-white text-brand' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`
                  }
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <div className="mt-3 border-t border-white/10 px-4 pt-4">
                <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-blue-100 hover:text-white"
                >
                  <LogOut size={18} /> Keluar
                </button>
              </div>
            </nav>
          </>
        )}
      </div>
      {/* Sidebar */}
      <aside
        className={`relative hidden shrink-0 bg-brand p-5 text-white shadow-md transition-[width] duration-200 lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'}`}
      >
        <button
          type="button"
          aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar-navigation"
          onClick={() => setSidebarOpen((open) => !open)}
          className="absolute -right-4 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-brand shadow-sm transition-colors hover:bg-blue-50"
        >
          {sidebarOpen ? <CaretDoubleLeftIcon size={20} /> : <CaretDoubleRightIcon size={20} />}
        </button>
        <div
          className={`flex min-h-9 items-center gap-2.5 text-lg font-bold tracking-tight ${sidebarOpen ? 'mb-6' : 'mb-4 justify-center'}`}
        >
          <Layers3 className="h-6 w-6 shrink-0 text-blue-300" />
          {sidebarOpen && <span className="min-w-0 whitespace-nowrap">Surat Digital</span>}
        </div>
        <nav id="sidebar-navigation" aria-label="Navigasi utama" className="flex flex-col gap-1">
          {visibleNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              aria-label={sidebarOpen ? undefined : n.label}
              title={sidebarOpen ? undefined : n.label}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all ${sidebarOpen ? 'px-3.5' : 'justify-center px-2.5'} ${
                  isActive
                    ? 'bg-white text-brand shadow-xs'
                    : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
                }`
              }
            >
              <n.icon size={18} />
              {sidebarOpen && <span>{n.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Header */}
        <header className="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-xs lg:sticky lg:top-0 lg:z-20 lg:flex">
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
          <div className="px-4 pt-4 sm:px-6">
            <Alert variant="warning" title="Sesi Berakhir">
              Sesi Anda telah kedaluwarsa. Silakan masuk kembali untuk melanjutkan pekerjaan.
            </Alert>
          </div>
        )}

        {/* Content */}
        <main className="mx-auto max-w-6xl w-full flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
