import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { WarningCircleIcon as AlertCircle } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { CheckCircleIcon as CheckCircle2 } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { InfoIcon as Info } from '@phosphor-icons/react/dist/csr/Info';
import { WarningIcon as TriangleAlert } from '@phosphor-icons/react/dist/csr/Warning';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, type, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast],
  );

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);

  const value = useMemo(
    () => ({ showToast, success, error, info, warning }),
    [showToast, success, error, info, warning],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex max-w-md flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const icon =
            toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : toast.type === 'warning' ? (
              <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0" />
            ) : (
              <Info className="h-5 w-5 text-blue-600 shrink-0" />
            );

          return (
            <div
              key={toast.id}
              role={isError ? 'alert' : undefined}
              className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg transition-all animate-in slide-in-from-bottom-2"
            >
              <div className="flex items-center gap-3">
                {icon}
                <p className="text-sm font-medium text-slate-800">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-md p-1 text-slate-400 hover:text-slate-600"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
