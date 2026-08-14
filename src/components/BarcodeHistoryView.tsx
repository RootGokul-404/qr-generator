import React, { useState, useEffect, useMemo } from 'react';
import { BarcodeHistoryRecord } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import { generateBarcodeDataURL, generateBarcodeSVGString } from '../services/barcodeUtils.ts';
import { downloadFile, printImageElement } from '../services/qrUtils.ts';
import { ConfirmDialog } from './common/ConfirmDialog.tsx';
import {
  Barcode,
  Search,
  Filter,
  Download,
  Trash2,
  Printer,
  Eye,
  X,
  Calendar,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const BarcodeHistoryView: React.FC = () => {
  const [records, setRecords] = useState<BarcodeHistoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // View modal
  const [viewRecord, setViewRecord] = useState<BarcodeHistoryRecord | null>(null);

  // Confirm delete modals
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState<boolean>(false);

  const loadData = () => {
    setRecords(storage.getBarcodeHistory());
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const s = new Set(records.map((r) => r.category));
    return ['ALL', ...Array.from(s)];
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.barcodeNumber.includes(searchQuery) ||
          r.brand.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = categoryFilter === 'ALL' || r.category === categoryFilter;
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        return (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time);
      });
  }, [records, searchQuery, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleConfirmSingleDelete = () => {
    if (!confirmDeleteId) return;
    storage.deleteBarcodeHistory(confirmDeleteId);
    setConfirmDeleteId(null);
    soundAndNotify.addToast('Deleted', 'Barcode record removed from history', 'info');
    loadData();
  };

  const handleConfirmClearAll = () => {
    storage.clearBarcodeHistory();
    setConfirmClearAllOpen(false);
    soundAndNotify.addToast('Cleared', 'All barcode history records removed', 'info');
    loadData();
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      soundAndNotify.addToast('Empty Data', 'No barcode history records to export', 'warning');
      return;
    }
    const headers = [
      'ID',
      'Product Name',
      'Barcode Number',
      'Format',
      'Brand',
      'Category',
      'Date',
      'Time',
      'Status',
    ];
    const rows = filteredRecords.map((r) => [
      r.id,
      `"${r.productName.replace(/"/g, '""')}"`,
      r.barcodeNumber,
      r.format || 'EAN-13',
      `"${r.brand}"`,
      `"${r.category}"`,
      r.date,
      r.time,
      r.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `vesta_barcode_history_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundAndNotify.addToast('Export Complete', 'Barcode history CSV downloaded', 'success');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-theme-card border border-theme rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
            <Barcode className="w-5 h-5 text-[var(--accent)]" />
            <span>Barcode Scan & Lookup History</span>
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Log of EAN-13, UPC, and Code-128 scans with Product Master association and timestamps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[var(--accent)]" />
            <span>Export CSV</span>
          </button>
          {records.length > 0 && (
            <button
              onClick={() => setConfirmClearAllOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-theme-card border border-theme rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by product name, barcode number, or brand..."
            className="w-full bg-[var(--bg)] border border-theme rounded-xl pl-10 pr-4 py-2 text-xs text-theme focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-theme rounded-xl px-3 py-1.5">
          <Filter className="w-3.5 h-3.5 text-theme-muted" />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent text-xs text-theme focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat} className="bg-[var(--card)] text-theme">
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-card border border-theme rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-theme text-theme-muted bg-white/[0.02]">
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Barcode Number</th>
                <th className="p-4 font-medium">Format</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-theme-muted">
                    No barcode history records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {r.productImage ? (
                          <img
                            src={r.productImage}
                            alt={r.productName}
                            className="w-9 h-9 rounded-lg object-cover border border-theme shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-white/5 border border-theme flex items-center justify-center text-theme-muted shrink-0">
                            <Barcode className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-theme truncate">{r.productName}</h4>
                          <p className="text-[11px] text-[var(--accent)] mt-0.5">{r.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium text-[var(--accent)]">
                      {r.barcodeNumber}
                    </td>
                    <td className="p-4 text-theme-muted">{r.format || 'EAN-13'}</td>
                    <td className="p-4 text-theme">{r.category}</td>
                    <td className="p-4 text-theme-muted">
                      {r.date} • {r.time}
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewRecord(r)}
                          className="p-1.5 rounded-lg text-theme-muted hover:text-theme hover:bg-white/5 transition-colors"
                          title="View Barcode & Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-1.5 rounded-lg text-theme-muted hover:text-red-400 hover:bg-white/5 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-theme flex items-center justify-between text-xs text-theme-muted">
          <span>
            Showing <strong className="text-theme">{paginatedRecords.length}</strong> of{' '}
            <strong className="text-theme">{filteredRecords.length}</strong> records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-theme transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-theme">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-theme transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Barcode Details Modal */}
      {viewRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-theme-card border border-theme rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-theme pb-4">
              <h3 className="text-base font-semibold text-theme">Scanned Barcode Record</h3>
              <button
                onClick={() => setViewRecord(null)}
                className="text-theme-muted hover:text-theme p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-theme flex flex-col items-center justify-center shadow-lg">
              <img
                src={generateBarcodeDataURL(viewRecord.barcodeNumber, viewRecord.format || 'EAN13')}
                alt="Barcode"
                className="max-h-24 w-auto object-contain"
              />
              <div className="mt-2 text-black font-bold text-xs font-mono">
                {viewRecord.format || 'EAN-13'}: {viewRecord.barcodeNumber}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-theme">
                <span className="text-theme-muted">Product Name</span>
                <span className="font-semibold text-theme">{viewRecord.productName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-theme">
                <span className="text-theme-muted">Brand</span>
                <span className="font-semibold text-[var(--accent)]">{viewRecord.brand}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-theme">
                <span className="text-theme-muted">Category</span>
                <span className="font-semibold text-theme">{viewRecord.category}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-theme">
                <span className="text-theme-muted">Date & Time</span>
                <span className="font-mono text-theme-muted">
                  {viewRecord.date} {viewRecord.time}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-theme">
              <button
                onClick={() => {
                  const png = generateBarcodeDataURL(
                    viewRecord.barcodeNumber,
                    viewRecord.format || 'EAN13'
                  );
                  downloadFile(png, `barcode_${viewRecord.barcodeNumber}.png`, false);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Download PNG</span>
              </button>
              <button
                onClick={() => setViewRecord(null)}
                className="px-4 py-2 rounded-xl bg-theme-accent hover:bg-[var(--accent-hover)] text-xs font-semibold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirms */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Barcode Record"
        message="Remove this barcode scan from history?"
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmSingleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        isOpen={confirmClearAllOpen}
        title="Clear All Barcode History"
        message="Are you sure you want to delete ALL barcode scan records?"
        confirmText="Clear All"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmClearAll}
        onCancel={() => setConfirmClearAllOpen(false)}
      />
    </div>
  );
};
