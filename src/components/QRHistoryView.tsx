import React, { useState, useEffect, useMemo } from 'react';
import { QRHistoryRecord } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import {
  generateQRPngDataUrl,
  generateQRSvgString,
  downloadFile,
  shareContent,
  printImageElement,
  copyToClipboard,
} from '../services/qrUtils.ts';
import { ConfirmDialog } from './common/ConfirmDialog.tsx';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Share2,
  Printer,
  Check,
  X,
  FileText,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';

export const QRHistoryView: React.FC = () => {
  const [records, setRecords] = useState<QRHistoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'date' | 'content'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // View Details Modal
  const [viewRecord, setViewRecord] = useState<QRHistoryRecord | null>(null);
  const [viewPngUrl, setViewPngUrl] = useState<string>('');
  const [viewSvgStr, setViewSvgStr] = useState<string>('');

  // Confirmation modals
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState<boolean>(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState<boolean>(false);

  const loadData = () => {
    setRecords(storage.getQRHistory());
    setSelectedIds([]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter.toUpperCase();
        const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          const comp = (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time);
          return sortOrder === 'asc' ? comp : -comp;
        }
        return sortOrder === 'asc'
          ? a.content.localeCompare(b.content)
          : b.content.localeCompare(a.content);
      });
  }, [records, searchQuery, statusFilter, typeFilter, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  // Handle single view details modal
  const handleOpenViewModal = async (r: QRHistoryRecord) => {
    setViewRecord(r);
    if (r.image) {
      setViewPngUrl(r.image);
    } else {
      const url = await generateQRPngDataUrl(r.content, { width: 300 });
      setViewPngUrl(url);
    }
    const svg = await generateQRSvgString(r.content, { width: 300 });
    setViewSvgStr(svg);
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmSingleDelete = () => {
    if (!confirmDeleteId) return;
    storage.deleteQRHistory(confirmDeleteId);
    setConfirmDeleteId(null);
    soundAndNotify.addToast('Record Deleted', 'QR record removed from history', 'info');
    loadData();
  };

  const handleConfirmBulkDelete = () => {
    if (selectedIds.length === 0) return;
    storage.deleteMultipleQRHistory(selectedIds);
    setConfirmBulkDeleteOpen(false);
    soundAndNotify.addToast('Bulk Deletion Complete', `Deleted ${selectedIds.length} QR records`, 'info');
    loadData();
  };

  const handleConfirmClearAll = () => {
    storage.clearQRHistory();
    setConfirmClearAllOpen(false);
    soundAndNotify.addToast('History Cleared', 'All QR records deleted.', 'info');
    loadData();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      soundAndNotify.addToast('No Data', 'No QR records to export', 'warning');
      return;
    }
    const headers = [
      'ID',
      'Content',
      'Date',
      'Time',
      'Location',
      'Status',
      'File Size',
      'Created By',
      'Type',
    ];
    const rows = filteredRecords.map((r) => [
      r.id,
      `"${r.content.replace(/"/g, '""')}"`,
      r.date,
      r.time,
      `"${r.location.replace(/"/g, '""')}"`,
      r.status,
      r.fileSize,
      `"${r.createdBy.replace(/"/g, '""')}"`,
      r.type,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vesta_qr_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundAndNotify.addToast('Export Successful', 'QR history CSV downloaded.', 'success');
  };

  // Export PDF/Print report
  const handleExportPDFPrint = () => {
    if (filteredRecords.length === 0) {
      soundAndNotify.addToast('No Data', 'No QR records to print', 'warning');
      return;
    }
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const rowsHtml = filteredRecords
      .map(
        (r) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ccc;">${r.date} ${r.time}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ccc; font-family: monospace; word-break: break-all;">${r.content}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ccc;">${r.location}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ccc;">${r.status}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ccc;">${r.createdBy}</td>
      </tr>
    `
      )
      .join('');

    printWin.document.write(`
      <html>
        <head>
          <title>QR History Report - Vesta Dairy OS</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #111; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            p { font-size: 13px; color: #666; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { text-align: left; background: #f4f4f5; padding: 10px; border-bottom: 2px solid #333; }
          </style>
        </head>
        <body>
          <h1>Vesta Dairy OS — QR Code History Report</h1>
          <p>Generated on ${new Date().toLocaleString()} • Total Records: ${filteredRecords.length}</p>
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>QR Content</th>
                <th>Location</th>
                <th>Status</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-theme-card border border-theme rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--accent)]" />
            <span>QR Code Audit History & Logs</span>
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Complete persistent record of every generated and scanned QR code with location tags and metadata.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[var(--accent)]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDFPrint}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-purple-400" />
            <span>Print Report (PDF)</span>
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

      {/* Filter, Search & Bulk Toolbar */}
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
            placeholder="Search by QR content, location, or creator..."
            className="w-full bg-[var(--bg)] border border-theme rounded-xl pl-10 pr-4 py-2 text-xs text-theme focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setConfirmBulkDeleteOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-lg animate-in fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-theme rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-theme-muted" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs text-theme focus:outline-none"
            >
              <option value="ALL" className="bg-[var(--card)]">All Status</option>
              <option value="GENERATED" className="bg-[var(--card)]">Generated Only</option>
              <option value="SCANNED" className="bg-[var(--card)]">Scanned Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-theme rounded-xl px-3 py-1.5">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs text-theme focus:outline-none"
            >
              <option value="ALL" className="bg-[var(--card)]">All Content Types</option>
              <option value="url" className="bg-[var(--card)]">URL Links</option>
              <option value="json" className="bg-[var(--card)]">JSON Data</option>
              <option value="text" className="bg-[var(--card)]">Text / Remarks</option>
              <option value="email" className="bg-[var(--card)]">Email Address</option>
              <option value="phone" className="bg-[var(--card)]">Phone Number</option>
            </select>
          </div>
        </div>
      </div>

      {/* QR History Table */}
      <div className="bg-theme-card border border-theme rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-theme text-theme-muted bg-white/[0.02]">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedRecords.length > 0 &&
                      paginatedRecords.every((r) => selectedIds.includes(r.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-theme bg-[var(--bg)] text-[var(--accent)] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-medium">QR Content / Payload</th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Created By</th>
                <th className="p-4 font-medium">Size</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-theme-muted">
                    No QR code records found in history.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const isChecked = selectedIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isChecked ? 'bg-[var(--accent)]/5' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(r.id)}
                          className="rounded border-theme bg-[var(--bg)] text-[var(--accent)] focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-[var(--accent)]/10 text-[var(--accent)] shrink-0">
                            {r.type}
                          </span>
                          <span className="font-mono text-theme truncate" title={r.content}>
                            {r.content}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-theme-muted whitespace-nowrap">
                        {r.date} • {r.time}
                      </td>
                      <td className="p-4 text-theme">{r.location}</td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            r.status === 'Generated'
                              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-theme-muted">{r.createdBy}</td>
                      <td className="p-4 text-theme-muted font-mono">{r.fileSize}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenViewModal(r)}
                            className="p-1.5 rounded-lg text-theme-muted hover:text-theme hover:bg-white/5 transition-colors"
                            title="View QR Details & Image"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              copyToClipboard(r.content);
                              soundAndNotify.addToast('Copied', 'QR content copied', 'success');
                            }}
                            className="p-1.5 rounded-lg text-theme-muted hover:text-[var(--accent)] hover:bg-white/5 transition-colors"
                            title="Copy Content"
                          >
                            <FileText className="w-4 h-4" />
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
                  );
                })
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

      {/* View QR Details Modal */}
      {viewRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-theme-card border border-theme rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-theme pb-4">
              <div>
                <h3 className="text-base font-semibold text-theme">QR Record Audit Details</h3>
                <p className="text-xs text-theme-muted mt-0.5">
                  ID: {viewRecord.id} • {viewRecord.status}
                </p>
              </div>
              <button
                onClick={() => setViewRecord(null)}
                className="text-theme-muted hover:text-theme p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white p-4 rounded-xl shadow border-2 border-gray-100 shrink-0">
                {viewPngUrl ? (
                  <img src={viewPngUrl} alt="QR Code" className="w-40 h-40 object-contain" />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-gray-400 text-xs">
                    Generating...
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-xs w-full">
                <div>
                  <span className="text-theme-muted block">QR Content</span>
                  <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-theme font-mono text-theme break-all mt-1">
                    {viewRecord.content}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-theme-muted block">Date & Time</span>
                    <span className="font-semibold text-theme">
                      {viewRecord.date} {viewRecord.time}
                    </span>
                  </div>
                  <div>
                    <span className="text-theme-muted block">Location</span>
                    <span className="font-semibold text-theme">{viewRecord.location}</span>
                  </div>
                  <div>
                    <span className="text-theme-muted block">Created By</span>
                    <span className="font-semibold text-theme">{viewRecord.createdBy}</span>
                  </div>
                  <div>
                    <span className="text-theme-muted block">File Size</span>
                    <span className="font-mono text-theme">{viewRecord.fileSize}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-theme">
              <button
                onClick={() => {
                  downloadFile(viewPngUrl, `qr_history_${viewRecord.id}.png`, false);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Download PNG</span>
              </button>
              <button
                onClick={() => {
                  if (viewSvgStr) {
                    downloadFile(viewSvgStr, `qr_history_${viewRecord.id}.svg`, true);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download SVG</span>
              </button>
              <button
                onClick={() => {
                  printImageElement(viewPngUrl, `Vesta QR Code History Report #${viewRecord.id}`);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
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

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete QR History Record"
        message="Remove this QR code entry from history? This action cannot be undone."
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmSingleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        isOpen={confirmBulkDeleteOpen}
        title="Bulk Delete QR Records"
        message={`Are you sure you want to permanently delete ${selectedIds.length} selected QR code records from history?`}
        confirmText="Delete Selected"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setConfirmBulkDeleteOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmClearAllOpen}
        title="Clear All QR History"
        message="Are you sure you want to delete ALL QR code history records? This will remove every generated and scanned QR log."
        confirmText="Clear All History"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmClearAll}
        onCancel={() => setConfirmClearAllOpen(false)}
      />
    </div>
  );
};
