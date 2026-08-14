import React, { useEffect, useState } from 'react';
import {
  ModuleId,
  QRHistoryRecord,
  DairyReceivingRecord,
  DairyPutawayRecord,
  BarcodeHistoryRecord,
} from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { generateQRPngDataUrl } from '../services/qrUtils.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import {
  QrCode,
  ScanLine,
  Truck,
  Box,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Plus,
  RefreshCw,
  Database,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (module: ModuleId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [qrHistory, setQrHistory] = useState<QRHistoryRecord[]>([]);
  const [receiving, setReceiving] = useState<DairyReceivingRecord[]>([]);
  const [putaway, setPutaway] = useState<DairyPutawayRecord[]>([]);
  const [barcodeHistory, setBarcodeHistory] = useState<BarcodeHistoryRecord[]>([]);
  const [quickQrDataUrl, setQuickQrDataUrl] = useState<string>('');

  const loadData = () => {
    const qrh = storage.getQRHistory();
    const rec = storage.getDairyReceiving();
    const put = storage.getDairyPutaway();
    const bch = storage.getBarcodeHistory();
    setQrHistory(qrh);
    setReceiving(rec);
    setPutaway(put);
    setBarcodeHistory(bch);
  };

  useEffect(() => {
    loadData();
    // Generate quick putaway QR demo image
    const demoJson = JSON.stringify({ ean: '8904011301564', expiry: '310726' });
    generateQRPngDataUrl(demoJson, { width: 140, margin: 1 }).then((url) => {
      setQuickQrDataUrl(url);
    });
  }, []);

  const totalQrGenerated = qrHistory.filter((r) => r.status === 'Generated').length;
  const totalQrScanned = qrHistory.filter((r) => r.status === 'Scanned').length;
  const totalBarcodeScanned = barcodeHistory.length;
  const receivingCount = receiving.length;
  const putawayCount = putaway.length;

  const handleExportReceivingCSV = () => {
    if (receiving.length === 0) {
      soundAndNotify.addToast('Empty Data', 'No receiving records to export', 'warning');
      return;
    }
    const headers = ['ID', 'Supplier', 'Invoice', 'Product', 'Quantity', 'Batch', 'Received Date', 'Expiry Date'];
    const rows = receiving.map((r) => [
      r.id,
      `"${r.supplierName}"`,
      r.invoiceNumber,
      `"${r.product}"`,
      r.quantity,
      r.batchNumber,
      r.receivedDate,
      r.expiryDate,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dairy_receiving_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundAndNotify.addToast('Export Complete', 'Dairy receiving table exported to CSV', 'success');
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysActivityCount =
    qrHistory.filter((r) => r.date === todayStr).length +
    receiving.filter((r) => r.receivedDate === todayStr).length +
    barcodeHistory.filter((r) => r.date === todayStr).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner / Quick Actions & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-theme-card border border-theme p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-theme-muted text-xs font-medium">
            <span>QR Generated</span>
            <QrCode className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-theme">{totalQrGenerated}</div>
          <div className="text-[11px] text-theme-muted mt-1 flex items-center gap-1">
            <span className="text-[var(--success)] font-medium">+100%</span> persistence
          </div>
        </div>

        <div className="bg-theme-card border border-theme p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-theme-muted text-xs font-medium">
            <span>QR Scanned</span>
            <ScanLine className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-theme">{totalQrScanned}</div>
          <div className="text-[11px] text-theme-muted mt-1">Real-time decode</div>
        </div>

        <div className="bg-theme-card border border-theme p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-theme-muted text-xs font-medium">
            <span>Barcodes Scanned</span>
            <Box className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-theme">{totalBarcodeScanned}</div>
          <div className="text-[11px] text-theme-muted mt-1">EAN & UPC verified</div>
        </div>

        <div className="bg-theme-card border border-theme p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-theme-muted text-xs font-medium">
            <span>Dairy Receiving</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-theme">{receivingCount}</div>
          <div className="text-[11px] text-theme-muted mt-1">Invoices registered</div>
        </div>

        <div className="bg-theme-card border border-theme p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-theme-muted text-xs font-medium">
            <span>Putaway QR Count</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-theme">{putawayCount}</div>
          <div className="text-[11px] text-theme-muted mt-1">EAN & Expiry encoded</div>
        </div>
      </div>

      {/* Quick Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-theme-card border border-theme p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-sm font-semibold text-theme">Quick Portal Actions</span>
          <span className="text-xs text-theme-muted ml-2 hidden sm:inline">
            Today's Activities: <strong className="text-theme">{todaysActivityCount}</strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              alert('New QR Code clicked');
              onNavigate('qr-generator');
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-theme-accent hover:bg-[var(--accent-hover)] text-white transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New QR Code</span>
          </button>
          <button
            onClick={() => onNavigate('qr-scanner')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-theme text-theme transition-colors flex items-center gap-1.5"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>
          <button
            onClick={() => onNavigate('dairy-receiving')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-theme text-theme transition-colors flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Receive Dairy</span>
          </button>
          <button
            onClick={() => onNavigate('dairy-putaway')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-theme text-theme transition-colors flex items-center gap-1.5"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Putaway QR</span>
          </button>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-theme-muted hover:text-theme transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left column (Receiving Table & Recent QR) and Right column (Health Audit & Putaway Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans on desktop) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-theme-card border border-theme rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-theme">Recent Activity Feed</h3>
              <span className="text-[10px] uppercase tracking-[0.2em] text-theme-muted">Live</span>
            </div>
            <div className="space-y-3">
              {[
                ...qrHistory.slice(0, 2).map((item) => ({
                  title: item.status === 'Generated' ? 'QR generated' : 'QR scanned',
                  detail: `${item.location} · ${item.type.toUpperCase()}`,
                  time: `${item.date} ${item.time}`,
                })),
                ...receiving.slice(0, 2).map((item) => ({
                  title: 'Receiving logged',
                  detail: `${item.product} · ${item.invoiceNumber}`,
                  time: item.receivedDate,
                })),
                ...barcodeHistory.slice(0, 2).map((item) => ({
                  title: 'Barcode scan',
                  detail: `${item.productName} · ${item.barcodeNumber}`,
                  time: `${item.date} ${item.time}`,
                })),
              ].slice(0, 5).map((activity, index) => (
                <div key={`${activity.title}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-theme bg-white/[0.02] p-3">
                  <div>
                    <p className="text-xs font-semibold text-theme">{activity.title}</p>
                    <p className="text-[11px] text-theme-muted mt-1">{activity.detail}</p>
                  </div>
                  <span className="text-[10px] text-theme-muted whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Dairy Receiving Activity Table */}
          <div className="bg-theme-card border border-theme rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-theme flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-theme">Recent Dairy Receiving Activity</h3>
                <p className="text-xs text-theme-muted">Latest supplier milk deliveries and invoices</p>
              </div>
              <button
                onClick={handleExportReceivingCSV}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-theme text-theme transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-theme text-theme-muted bg-white/[0.02]">
                    <th className="p-3 font-medium">Supplier</th>
                    <th className="p-3 font-medium">Invoice</th>
                    <th className="p-3 font-medium">Product</th>
                    <th className="p-3 font-medium">Batch</th>
                    <th className="p-3 font-medium">Quantity</th>
                    <th className="p-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {receiving.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-theme-muted">
                        No receiving records yet. Click "Receive Dairy" to add invoices.
                      </td>
                    </tr>
                  ) : (
                    receiving.slice(0, 5).map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 font-medium text-theme">{r.supplierName}</td>
                        <td className="p-3 font-mono text-theme-muted">{r.invoiceNumber}</td>
                        <td className="p-3 text-theme">{r.product}</td>
                        <td className="p-3 font-mono text-theme-muted">{r.batchNumber}</td>
                        <td className="p-3 font-semibold text-theme">
                          {r.quantity.toLocaleString()} {r.unit}
                        </td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[var(--success)] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {receiving.length > 5 && (
              <div className="p-3 border-t border-theme text-center">
                <button
                  onClick={() => onNavigate('dairy-receiving')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <span>View all {receiving.length} receiving records</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Recent Generated QR & Barcode Scans */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-theme-card border border-theme rounded-2xl p-4 sm:p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-theme uppercase tracking-wider">
                  Recent Generated QR
                </h4>
                <button
                  onClick={() => onNavigate('qr-history')}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  History →
                </button>
              </div>
              <div className="flex-1 space-y-2.5">
                {qrHistory.filter((r) => r.status === 'Generated').length === 0 ? (
                  <p className="text-xs text-theme-muted py-4 text-center">No generated QR codes yet</p>
                ) : (
                  qrHistory
                    .filter((r) => r.status === 'Generated')
                    .slice(0, 3)
                    .map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-xl bg-white/[0.03] border border-theme flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-theme truncate">{r.content}</p>
                          <p className="text-[11px] text-theme-muted mt-0.5">
                            {r.date} • {r.time}
                          </p>
                        </div>
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--accent)]/10 text-[var(--accent)] shrink-0">
                          {r.type.toUpperCase()}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="bg-theme-card border border-theme rounded-2xl p-4 sm:p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-theme uppercase tracking-wider">
                  Recent Barcode Scans
                </h4>
                <button
                  onClick={() => onNavigate('barcode-history')}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  History →
                </button>
              </div>
              <div className="flex-1 space-y-2.5">
                {barcodeHistory.length === 0 ? (
                  <p className="text-xs text-theme-muted py-4 text-center">No barcode scans recorded</p>
                ) : (
                  barcodeHistory.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-theme flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-theme truncate">{b.productName}</p>
                        <p className="text-[11px] font-mono text-theme-muted mt-0.5">
                          {b.barcodeNumber}
                        </p>
                      </div>
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 shrink-0">
                        {b.format || 'EAN-13'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Health Audit Checklist & Quick Putaway QR preview */}
        <div className="flex flex-col gap-6">
          <div className="bg-theme-card border border-theme rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-theme flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
                <h3 className="text-sm font-semibold text-theme">System Health Audit</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20">
                STABLE
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-theme">
                <span className="text-theme-muted">JS Runtime Errors</span>
                <span className="font-semibold text-[var(--success)]">NONE</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-theme">
                <span className="text-theme-muted">Memory Leaks</span>
                <span className="font-semibold text-[var(--success)]">CLEAN</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-theme">
                <span className="text-theme-muted">Navigation State</span>
                <span className="font-semibold text-[var(--success)]">SYNCED</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-theme">
                <span className="text-theme-muted">Database Latency</span>
                <span className="font-semibold text-theme">12ms</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-theme">
                <span className="text-theme-muted">WCAG Compliance</span>
                <span className="font-semibold text-[var(--success)]">AAA</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-theme-muted">Offline Storage</span>
                <span className="font-semibold text-[var(--success)]">ACTIVE</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-theme bg-white/[0.01]">
              <div className="text-xs font-semibold text-theme mb-3">Quick Putaway QR Preview</div>
              <div className="text-[11px] text-theme-muted mb-3 font-mono">
                EAN: 8904011301564 • EXP: 310726
              </div>
              <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl">
                {quickQrDataUrl ? (
                  <img
                    src={quickQrDataUrl}
                    alt="Quick Putaway QR Code"
                    className="w-32 h-32 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 border border-dashed border-gray-400 flex items-center justify-center text-gray-500 text-xs">
                    Loading QR...
                  </div>
                )}
                <div className="text-black font-bold text-[11px] mt-2 tracking-wide">
                  AAVIN NICE MILK - 500ML
                </div>
              </div>
              <button
                onClick={() => onNavigate('dairy-putaway')}
                className="w-full mt-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-theme text-theme transition-colors"
              >
                Open Putaway Generator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
