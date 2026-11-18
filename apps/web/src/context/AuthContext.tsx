import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiHttpError, logout as apiLogout, meWithRefresh } from '../auth/auth-api.js';
import { baseUrl, request } from '../api.js';
import { formatErrorMessage } from '../lib/error.js';
import type { AuthUser, Permission } from '../types/index.js';

interface AuthContextValue {
  user: AuthUser | null;
  permissions: Permission[];
  loading: boolean;
  error: string;
  isSessionExpired: boolean;
  hasPermission: (code: string) => boolean;
  loginUser: (user: AuthUser) => void;
  logoutUser: () => Promise<void>;
  reloadAuth: () => Promise<void>;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const hadUserRef = useRef(false);

  const reloadAuth = useCallback(async () => {
    try {
      const result = await meWithRefresh(baseUrl);
      setUser(result.user);
      hadUserRef.current = true;
      setIsSessionExpired(false);
      try {
        const perms = await request<Permission[]>('/group-policy/me/effective-permissions');
        setPermissions(perms);
      } catch {
        setPermissions([]);
      }
      setError('');
    } catch (reason) {
      if (reason instanceof ApiHttpError && reason.status === 401) {
        if (hadUserRef.current) {
          setIsSessionExpired(true);
        }
      } else {
        setError(formatErrorMessage(reason));
      }
      hadUserRef.current = false;
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAuth();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reloadAuth();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [reloadAuth]);

  const hasPermission = useCallback(
    (code: string) => {
      return permissions.some((p) => p.code === code && p.decision === 'ALLOW');
    },
    [permissions],
  );

  const loginUser = useCallback(
    (newUser: AuthUser) => {
      setUser(newUser);
      hadUserRef.current = true;
      setIsSessionExpired(false);
      setError('');
      void reloadAuth();
    },
    [reloadAuth],
  );

  const logoutUser = useCallback(async () => {
    try {
      await apiLogout(baseUrl);
    } finally {
      hadUserRef.current = false;
      setUser(null);
      setPermissions([]);
      setIsSessionExpired(false);
    }
  }, []);

  const clearSessionExpired = useCallback(() => {
    setIsSessionExpired(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      permissions,
      loading,
      error,
      isSessionExpired,
      hasPermission,
      loginUser,
      logoutUser,
      reloadAuth,
      clearSessionExpired,
    }),
    [
      user,
      permissions,
      loading,
      error,
      isSessionExpired,
      hasPermission,
      loginUser,
      logoutUser,
      reloadAuth,
      clearSessionExpired,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
