import { AppNotification, ModuleId } from '../types/index.ts';
import { storage } from './storage.ts';

type ToastListener = (toasts: Toast[]) => void;
type NotifyListener = (notifications: AppNotification[]) => void;

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

class SoundAndNotificationService {
  private toasts: Toast[] = [];
  private toastListeners: Set<ToastListener> = new Set();
  private notifications: AppNotification[] = [];
  private notifyListeners: Set<NotifyListener> = new Set();

  constructor() {
    this.initNotifications();
  }

  private initNotifications() {
    const defaultNotifs: AppNotification[] = [
      {
        id: 'notif-1',
        title: 'System Initialized',
        message: 'Dairy QR & Supply Chain Portal storage synchronized.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'info',
        read: false,
      },
    ];
    this.notifications = defaultNotifs;
  }

  // --- Sound Beep ---
  playScanBeep() {
    const settings = storage.getSettings();
    if (!settings.soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch beep
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio autoplay policy or browser restriction
    }
  }

  setSoundEnabled(enabled: boolean): void {
    const settings = storage.getSettings();
    storage.saveSettings({ ...settings, soundEnabled: enabled });
  }

  // --- Toasts ---
  addToast(title: string, message: string, type: Toast['type'] = 'info', duration = 3500) {
    const toast: Toast = {
      id: 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title,
      message,
      type,
      duration,
    };
    this.toasts = [toast, ...this.toasts];
    this.emitToasts();

    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, duration);
    }
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emitToasts();
  }

  subscribeToasts(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    listener(this.toasts);
    return () => this.toastListeners.delete(listener);
  }

  private emitToasts() {
    this.toastListeners.forEach((fn) => fn([...this.toasts]));
  }

  // --- Browser & In-App Notification Center ---
  notify(
    title: string,
    message: string,
    type: AppNotification['type'] = 'info',
    linkModule?: ModuleId
  ) {
    // Add to in-app notification center
    const notif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false,
      linkModule,
    };
    this.notifications = [notif, ...this.notifications.slice(0, 39)];
    this.emitNotifications();

    // Trigger toast as well
    this.addToast(title, message, type);

    // Trigger HTML5 Desktop Notification if permission granted and enabled in settings
    const settings = storage.getSettings();
    if (settings.notificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body: message,
            icon: '/favicon.ico',
          });
        } catch {
          // Fallback if browser blocks notification construct
        }
      }
    }
  }

  requestBrowserPermission(): Promise<string> {
    return new Promise((resolve) => {
      if (!('Notification' in window)) {
        resolve('unsupported');
        return;
      }
      Notification.requestPermission().then((perm) => {
        resolve(perm);
      });
    });
  }

  getNotifications(): AppNotification[] {
    return this.notifications;
  }

  markAllAsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.emitNotifications();
  }

  clearNotifications() {
    this.notifications = [];
    this.emitNotifications();
  }

  subscribeNotifications(listener: NotifyListener): () => void {
    this.notifyListeners.add(listener);
    listener(this.notifications);
    return () => this.notifyListeners.delete(listener);
  }

  private emitNotifications() {
    this.notifyListeners.forEach((fn) => fn([...this.notifications]));
  }
}

export const soundAndNotify = new SoundAndNotificationService();
