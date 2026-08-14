import React, { useEffect, useState } from 'react';
import { soundAndNotify } from '../../services/soundAndNotify.ts';
import { AppNotification, ModuleId } from '../../types/index.ts';
import { Bell, CheckCheck, Trash2, X, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (module: ModuleId) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsubscribe = soundAndNotify.subscribeNotifications((list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-theme-card border border-theme rounded-2xl w-full max-w-md shadow-2xl overflow-hidden mt-14 mr-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-theme flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold text-theme">System Notifications</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent)]/20 text-[var(--accent)]">
              {notifications.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={() => soundAndNotify.markAllAsRead()}
                  className="p-1.5 rounded-lg text-theme-muted hover:text-theme hover:bg-white/5 transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => soundAndNotify.clearNotifications()}
                  className="p-1.5 rounded-lg text-theme-muted hover:text-red-400 hover:bg-white/5 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-theme-muted hover:text-theme hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-[var(--border)]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-theme-muted text-sm">
              No notifications to display.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.linkModule && onNavigate) {
                    onNavigate(n.linkModule);
                    onClose();
                  }
                }}
                className={`p-4 flex items-start gap-3 transition-colors ${
                  n.linkModule ? 'cursor-pointer hover:bg-white/5' : ''
                } ${!n.read ? 'bg-[var(--accent)]/5' : ''}`}
              >
                <div className="mt-0.5">
                  {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />}
                  {n.type === 'error' && <XCircle className="w-4 h-4 text-[var(--error)]" />}
                  {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />}
                  {n.type === 'info' && <Info className="w-4 h-4 text-[var(--info)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-theme">{n.title}</h4>
                    <span className="text-[10px] text-theme-muted shrink-0">{n.timestamp}</span>
                  </div>
                  <p className="text-xs text-theme-muted mt-1 leading-relaxed break-words">
                    {n.message}
                  </p>
                  {n.linkModule && (
                    <span className="inline-block mt-1.5 text-[11px] font-medium text-[var(--accent)]">
                      Open {n.linkModule.replace('-', ' ')} →
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
