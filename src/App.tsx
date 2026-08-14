import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Box,
  Camera,
  ChevronRight,
  Database,
  LayoutGrid,
  ListOrdered,
  Menu,
  PackageSearch,
  QrCode,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { NotificationModal } from './components/common/NotificationModal';
import { ToastContainer } from './components/common/ToastContainer';
import { soundAndNotify } from './services/soundAndNotify';
import { storage } from './services/storage';
import { ModuleId } from './types';

const DashboardView = lazy(() => import('./components/DashboardView').then((module) => ({ default: module.DashboardView })));
const QRGeneratorView = lazy(() => import('./components/QRGeneratorView').then((module) => ({ default: module.QRGeneratorView })));
const BulkQRGenerationView = lazy(() => import('./components/BulkQRGenerationView').then((module) => ({ default: module.BulkQRGenerationView })));
const SequenceQRCreatorView = lazy(() => import('./components/SequenceQRCreatorView').then((module) => ({ default: module.SequenceQRCreatorView })));
const PigeonHoleQRView = lazy(() => import('./components/PigeonHoleQRView').then((module) => ({ default: module.PigeonHoleQRView })));
const QRScannerView = lazy(() => import('./components/QRScannerView').then((module) => ({ default: module.QRScannerView })));
const DairyReceivingView = lazy(() => import('./components/DairyReceivingView').then((module) => ({ default: module.DairyReceivingView })));
const DairyPutawayView = lazy(() => import('./components/DairyPutawayView').then((module) => ({ default: module.DairyPutawayView })));
const BarcodeScannerView = lazy(() => import('./components/BarcodeScannerView').then((module) => ({ default: module.BarcodeScannerView })));
const ProductSearchView = lazy(() => import('./components/ProductSearchView').then((module) => ({ default: module.ProductSearchView })));
const QRHistoryView = lazy(() => import('./components/QRHistoryView').then((module) => ({ default: module.QRHistoryView })));
const BarcodeHistoryView = lazy(() => import('./components/BarcodeHistoryView').then((module) => ({ default: module.BarcodeHistoryView })));
const SettingsView = lazy(() => import('./components/SettingsView').then((module) => ({ default: module.SettingsView })));

const navItems: Array<{ id: ModuleId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'qr-generator', label: 'QR Generator', icon: QrCode },
  { id: 'bulk-qr-generation', label: 'Bulk QR Generation', icon: Sparkles },
  { id: 'sequence-qr-creator', label: 'Sequence QR Creator', icon: ListOrdered },
  { id: 'pigeon-hole-qr', label: 'Pigeon Hole QR', icon: Sparkles },
  { id: 'qr-scanner', label: 'QR Scanner', icon: Camera },
  { id: 'dairy-receiving', label: 'Receiving', icon: Truck },
  { id: 'dairy-putaway', label: 'Putaway', icon: Box },
  { id: 'barcode-scanner', label: 'Barcode Scanner', icon: ShieldCheck },
  { id: 'product-search', label: 'Product Search', icon: PackageSearch },
  { id: 'qr-history', label: 'QR History', icon: BarChart3 },
  { id: 'barcode-history', label: 'Barcode History', icon: Database },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [currentModule, setCurrentModule] = useState<ModuleId>('dashboard');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(soundAndNotify.getNotifications().length);

  useEffect(() => {
    const unsubscribe = soundAndNotify.subscribeNotifications((notifications) => {
      setNotificationCount(notifications.length);
    });
    return () => unsubscribe();
  }, []);

  const activeNav = useMemo(
    () => navItems.find((item) => item.id === currentModule) ?? navItems[0],
    [currentModule]
  );

  const handleNavigate = (module: ModuleId) => {
    setCurrentModule(module);
    setIsSidebarOpen(false);
  };

  const renderView = () => {
    const loadingState = (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-theme bg-theme-card text-sm text-theme-muted">
        Loading module...
      </div>
    );

    switch (currentModule) {
      case 'dashboard':
        return <Suspense fallback={loadingState}><DashboardView onNavigate={handleNavigate} /></Suspense>;
      case 'qr-generator':
        return <Suspense fallback={loadingState}><QRGeneratorView /></Suspense>;
      case 'bulk-qr-generation':
        return <Suspense fallback={loadingState}><BulkQRGenerationView /></Suspense>;
      case 'sequence-qr-creator':
        return <Suspense fallback={loadingState}><SequenceQRCreatorView /></Suspense>;
      case 'pigeon-hole-qr':
        return <Suspense fallback={loadingState}><PigeonHoleQRView /></Suspense>;
      case 'qr-scanner':
        return <Suspense fallback={loadingState}><QRScannerView /></Suspense>;
      case 'dairy-receiving':
        return <Suspense fallback={loadingState}><DairyReceivingView /></Suspense>;
      case 'dairy-putaway':
        return <Suspense fallback={loadingState}><DairyPutawayView /></Suspense>;
      case 'barcode-scanner':
        return <Suspense fallback={loadingState}><BarcodeScannerView /></Suspense>;
      case 'product-search':
        return <Suspense fallback={loadingState}><ProductSearchView /></Suspense>;
      case 'qr-history':
        return <Suspense fallback={loadingState}><QRHistoryView /></Suspense>;
      case 'barcode-history':
        return <Suspense fallback={loadingState}><BarcodeHistoryView /></Suspense>;
      case 'settings':
        return <Suspense fallback={loadingState}><SettingsView /></Suspense>;
      default:
        return <Suspense fallback={loadingState}><DashboardView onNavigate={handleNavigate} /></Suspense>;
    }
  };

  const currentUser = storage.getSettings().currentUser || 'Supply Chain Manager';

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-theme-bg text-theme">
      <div className="flex min-h-screen w-full">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-theme bg-theme-sidebar/95 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-theme px-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
                Vesta Dairy OS
              </p>
              <h1 className="text-sm font-semibold text-theme">Operations Suite</h1>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-lg border border-theme bg-white/5 p-2 text-theme-muted hover:text-theme lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = currentModule === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigate(id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    isActive
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-theme'
                      : 'border-transparent bg-transparent text-theme-muted hover:bg-white/5 hover:text-theme'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-70" />
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 lg:ml-72">
          <header className="sticky top-0 z-30 border-b border-theme bg-theme-bg/80 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((value) => !value)}
                  className="rounded-xl border border-theme bg-white/5 p-2 text-theme-muted hover:text-theme lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
                    Active module
                  </p>
                  <h2 className="text-lg font-semibold text-theme">{activeNav.label}</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-xl border border-theme bg-white/5 px-3 py-2 text-right sm:block">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-theme-muted">Operator</p>
                  <p className="text-sm font-medium text-theme">{currentUser}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (Notification.permission === 'default') {
                      soundAndNotify.requestBrowserPermission();
                    }
                    setIsNotificationsOpen(true);
                  }}
                  className="relative rounded-xl border border-theme bg-white/5 p-2.5 text-theme-muted hover:text-theme"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>

          <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8">{renderView()}</div>
        </main>
      </div>

      <NotificationModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} onNavigate={handleNavigate} />
      <ToastContainer />
    </div>
  );
}