import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => toast({ type: 'success', message, title }),
    [toast]
  );

  const error = useCallback(
    (message: string, title?: string) => toast({ type: 'error', message, title }),
    [toast]
  );

  const warning = useCallback(
    (message: string, title?: string) => toast({ type: 'warning', message, title }),
    [toast]
  );

  const info = useCallback(
    (message: string, title?: string) => toast({ type: 'info', message, title }),
    [toast]
  );

  const contextValue = useMemo(
    () => ({ toast, success, error, warning, info, removeToast }),
    [toast, success, error, warning, info, removeToast]
  );

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />,
  };

  const borderStyles: Record<ToastType, string> = {
    success: 'border-emerald-200 bg-white/95 text-slate-800 shadow-emerald-500/10',
    error: 'border-rose-200 bg-white/95 text-slate-800 shadow-rose-500/10',
    warning: 'border-amber-200 bg-white/95 text-slate-800 shadow-amber-500/10',
    info: 'border-sky-200 bg-white/95 text-slate-800 shadow-sky-500/10',
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div
            aria-live="polite"
            className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role="alert"
                className={cn(
                  'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-xs transition-all duration-200 animate-in slide-in-from-top-2',
                  borderStyles[t.type]
                )}
              >
                {icons[t.type]}
                <div className="flex-1 text-xs">
                  {t.title && (
                    <h4 className="font-bold text-sm text-slate-900 mb-0.5">{t.title}</h4>
                  )}
                  <p className="text-slate-600 leading-relaxed">{t.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Đóng thông báo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast phải được sử dụng bên trong ToastProvider');
  }
  return context;
}
