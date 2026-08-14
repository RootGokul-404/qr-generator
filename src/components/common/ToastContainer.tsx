import React, { useEffect, useState } from 'react';
import { soundAndNotify, Toast } from '../../services/soundAndNotify.ts';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = soundAndNotify.subscribeToasts((list) => {
      setToasts(list);
    });
    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.slice(0, 4).map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-theme-card border-theme shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
          role="alert"
        >
          <div className="mt-0.5 shrink-0">
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 text-[var(--error)]" />}
            {t.type === 'warning' && <AlertCircle className="w-5 h-5 text-[var(--warning)]" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-[var(--info)]" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-theme leading-tight">{t.title}</h4>
            <p className="text-xs text-theme-muted mt-1 break-words">{t.message}</p>
          </div>
          <button
            onClick={() => soundAndNotify.removeToast(t.id)}
            className="text-theme-muted hover:text-theme p-1 rounded transition-colors"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
