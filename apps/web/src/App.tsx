import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { Shell } from './components/Shell.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { OrganizationPage } from './pages/OrganizationPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { GroupsPage } from './pages/GroupsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { ForbiddenPage } from './pages/ForbiddenPage.js';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50" role="status">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Memuat sesi…</p>
        </div>
      </main>
    );
  }

  // Unauthenticated routes: do not change URL via Navigate so direct entry to deep links preserves URL
  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  // Authenticated routes wrapped with Shell
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route
          path="/organization"
          element={
            <ProtectedRoute requiredAny={['System.Configure', 'User.View']}>
              <OrganizationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredAny={['User.View', 'User.Manage']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute requiredAny={['Group.View', 'Group.Manage']}>
              <GroupsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
