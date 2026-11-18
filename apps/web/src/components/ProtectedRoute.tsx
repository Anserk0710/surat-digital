import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import type { ReactNode } from 'react';

export interface ProtectedRouteProps {
  children?: ReactNode;
  requiredPermission?: string;
  requiredAny?: string[];
  requiredAll?: string[];
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredAny,
  requiredAll,
}: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

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

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/forbidden" replace />;
  }

  if (requiredAny && requiredAny.length > 0 && !requiredAny.some((p) => hasPermission(p))) {
    return <Navigate to="/forbidden" replace />;
  }

  if (requiredAll && requiredAll.length > 0 && !requiredAll.every((p) => hasPermission(p))) {
    return <Navigate to="/forbidden" replace />;
  }

  return children ? <>{children}</> : null;
}
