import React, { useState, useEffect, useMemo } from 'react';
import {
  PREDEFINED_PUTAWAY_PRODUCTS,
  DairyPutawayProduct,
  DairyPutawayRecord,
} from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import {
  generateQRPngDataUrl,
  generateQRSvgString,
  downloadFile,
  shareContent,
  printImageElement,
} from '../services/qrUtils.ts';
import { ConfirmDialog } from './common/ConfirmDialog.tsx';
import {
  Box,
  QrCode,
  Download,
  Share2,
  Printer,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileCode,
  Check,
} from 'lucide-react';

export const DairyPutawayView: React.FC = () => {
  const [selectedEAN, setSelectedEAN] = useState<string>(
    PREDEFINED_PUTAWAY_PRODUCTS[0].ean
  );
  const [expiryInput, setExpiryInput] = useState<string>('310726');
  const [validationError, setValidationError] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [historyRecords, setHistoryRecords] = useState<DairyPutawayRecord[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedProduct: DairyPutawayProduct = useMemo(() => {
    return (
      PREDEFINED_PUTAWAY_PRODUCTS.find((p) => p.ean === selectedEAN) ||
      PREDEFINED_PUTAWAY_PRODUCTS[0]
    );
  }, [selectedEAN]);

  const loadHistory = () => {
    setHistoryRecords(storage.getDairyPutaway());
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Validate DDMMYY date format strictly
  const validateExpiry = (val: string): { valid: boolean; error?: string } => {
    if (!val || val.length === 0) {
      return { valid: false, error: 'Expiry date is required.' };
    }
    if (!/^\d{6}$/.test(val)) {
      return { valid: false, error: 'Expiry date must be exactly six digits in DDMMYY format.' };
    }
    const day = parseInt(val.slice(0, 2), 10);
    const month = parseInt(val.slice(2, 4), 10);
    if (day < 1 || day > 31) {
      return { valid: false, error: 'Invalid day value (01-31).' };
    }
    if (month < 1 || month > 12) {
      return { valid: false, error: 'Invalid month value (01-12).' };
    }
    return { valid: true };
  };

  // Generate QR when EAN or valid Expiry changes
  useEffect(() => {
    const valRes = validateExpiry(expiryInput);
    if (!valRes.valid) {
      setValidationError(valRes.error || 'Invalid date format');
      setQrDataUrl('');
      setQrSvg('');
      return;
    }
    setValidationError('');
    const jsonPayload = JSON.stringify({
      ean: selectedProduct.ean,
      expiry: expiryInput,
    });

    generateQRPngDataUrl(jsonPayload, {
      errorCorrectionLevel: 'Q',
      width: 400,
      margin: 2,
    }).then((url) => {
      setQrDataUrl(url);
      setIsSaved(false);
    });

    generateQRSvgString(jsonPayload, {
      errorCorrectionLevel: 'Q',
      width: 400,
      margin: 2,
    }).then((svg) => setQrSvg(svg));
  }, [selectedEAN, expiryInput, selectedProduct]);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const filename = `putaway_qr_${selectedProduct.ean}_${expiryInput}.png`;
    downloadFile(qrDataUrl, filename, false);
    soundAndNotify.notify('Putaway QR Downloaded', `Downloaded PNG (${filename})`, 'success');
  };

  const handleDownloadSvg = () => {
    if (!qrSvg) return;
    const filename = `putaway_qr_${selectedProduct.ean}_${expiryInput}.svg`;
    downloadFile(qrSvg, filename, true);
    soundAndNotify.notify('Putaway QR Downloaded', `Downloaded SVG (${filename})`, 'success');
  };

  const handleShare = async () => {
    const jsonStr = JSON.stringify({ ean: selectedProduct.ean, expiry: expiryInput });
    const ok = await shareContent(
      `Dairy Putaway: ${selectedProduct.productName}`,
      `Putaway QR Code Payload: ${jsonStr}`
    );
    if (ok) {
      soundAndNotify.notify('Shared', 'Putaway QR shared successfully', 'info');
    } else {
      soundAndNotify.addToast('Share info', 'Web Share unsupported on this browser.', 'info');
    }
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    printImageElement(
      qrDataUrl,
      `Dairy Putaway QR: ${selectedProduct.productName} (EXP: ${expiryInput})`
    );
  };

  const handleSaveHistory = () => {
    if (!qrDataUrl || !!validationError) return;
    const now = new Date();
    const jsonStr = JSON.stringify({ ean: selectedProduct.ean, expiry: expiryInput });

    const newRecord = storage.addDairyPutaway({
      productName: selectedProduct.productName,
      ean: selectedProduct.ean,
      expiryDate: expiryInput,
      qrContent: jsonStr,
      qrImage: qrDataUrl,
      generatedDate: now.toISOString().slice(0, 10),
      generatedTime: now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      createdBy: storage.getSettings().currentUser || 'Putaway Supervisor',
    });

    // Also mirror into main QR history
    storage.addQRHistory({
      image: qrDataUrl,
      content: jsonStr,
      date: newRecord.generatedDate,
      time: newRecord.generatedTime,
      location: storage.getSettings().defaultLocation || 'Warehouse Bay 2',
      status: 'Generated',
      fileSize: `${Math.round(qrDataUrl.length / 1024)} KB`,
      createdBy: newRecord.createdBy,
      type: 'json',
      errorCorrectionLevel: 'Q',
      metadata: {
        ean: selectedProduct.ean,
        expiry: expiryInput,
        productName: selectedProduct.productName,
      },
    });

    setIsSaved(true);
    loadHistory();
    soundAndNotify.notify(
      'Putaway QR Saved',
      `Stored QR code for ${selectedProduct.productName} (EXP: ${expiryInput}) in Putaway History.`,
      'success',
      'dairy-putaway'
    );
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteId) return;
    storage.deleteDairyPutaway(confirmDeleteId);
    setConfirmDeleteId(null);
    soundAndNotify.addToast('Deleted', 'Putaway history record removed.', 'info');
    loadHistory();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="bg-theme-card border border-theme rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
            <Box className="w-5 h-5 text-[var(--accent)]" />
            <span>Dairy Putaway QR Generator</span>
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Generate standardized JSON QR codes for warehouse putaway using predefined EAN numbers.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-theme px-3 py-1.5 rounded-xl text-xs text-theme-muted">
          <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
          <span>Manual EAN entry strictly disabled</span>
        </div>
      </div>

      {/* Generator Grid: Left: Selection & Validation; Right: Live QR Preview & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Panel */}
        <div className="lg:col-span-7 bg-theme-card border border-theme rounded-2xl p-6 flex flex-col gap-5">
          <h3 className="text-sm font-semibold text-theme uppercase tracking-wider">
            1. Select Predefined Dairy Product
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-theme-muted">
              Product Master Selection (EAN & Volume)
            </label>
            <select
              value={selectedEAN}
              onChange={(e) => setSelectedEAN(e.target.value)}
              className="w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-3 text-sm text-theme focus:outline-none focus:border-[var(--accent)] font-medium"
            >
              {PREDEFINED_PUTAWAY_PRODUCTS.map((p) => (
                <option key={p.ean} value={p.ean} className="bg-[var(--card)] text-theme">
                  {p.productName} — [EAN: {p.ean}]
                </option>
              ))}
            </select>
          </div>

          {/* Selected Product Card */}
          <div className="p-4 rounded-xl bg-[var(--bg)] border border-theme grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-theme-muted block">Brand</span>
              <span className="font-semibold text-theme mt-0.5 block">{selectedProduct.brand}</span>
            </div>
            <div>
              <span className="text-theme-muted block">EAN Barcode</span>
              <span className="font-mono font-semibold text-[var(--accent)] mt-0.5 block">
                {selectedProduct.ean}
              </span>
            </div>
            <div>
              <span className="text-theme-muted block">Package Volume</span>
              <span className="font-semibold text-theme mt-0.5 block">{selectedProduct.volume}</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-theme uppercase tracking-wider mt-2">
            2. Enter Expiry Date
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-theme-muted flex items-center justify-between">
              <span>Expiry Date (DDMMYY format) *</span>
              <span className="font-mono text-xs text-[var(--accent)]">Example: 310726</span>
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                value={expiryInput}
                onChange={(e) => setExpiryInput(e.target.value.replace(/\D/g, ''))}
                placeholder="DDMMYY (e.g. 310726)"
                className={`w-full bg-[var(--bg)] border rounded-xl px-3.5 py-3 text-sm font-mono text-theme focus:outline-none ${
                  validationError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-theme focus:border-[var(--accent)]'
                }`}
              />
              <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
            </div>
            {validationError ? (
              <p className="text-xs text-red-400 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationError}</span>
              </p>
            ) : (
              <p className="text-xs text-[var(--success)] flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Format verified: 6 digits DDMMYY</span>
              </p>
            )}
          </div>

          <div className="mt-2">
            <button
              onClick={handleSaveHistory}
              disabled={!qrDataUrl || !!validationError || isSaved}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                isSaved
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-theme-accent hover:bg-[var(--accent-hover)] text-white'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved to Putaway History</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save QR to Putaway History</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Preview Card */}
        <div className="lg:col-span-5 bg-theme-card border border-theme rounded-2xl p-6 flex flex-col items-center justify-between gap-6">
          <div className="w-full flex items-center justify-between border-b border-theme pb-3">
            <h3 className="text-sm font-semibold text-theme">Generated JSON QR Code</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-mono">
              EAN + Expiry
            </span>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center justify-center border-4 border-gray-100 max-w-[280px] w-full">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Putaway QR Code" className="w-56 h-56 object-contain" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-gray-400 text-xs">
                Invalid date format
              </div>
            )}
            <div className="mt-3 text-black font-bold text-xs tracking-wide uppercase text-center max-w-[230px] truncate">
              {selectedProduct.productName}
            </div>
            <div className="text-gray-600 font-mono text-[11px] mt-0.5">
              EXP: {expiryInput || 'DDMMYY'}
            </div>
          </div>

          {/* JSON preview */}
          <div className="w-full p-3 rounded-xl bg-[var(--bg)] border border-theme font-mono text-xs text-theme">
            <div className="text-[10px] text-theme-muted uppercase mb-1">Encoded JSON Payload</div>
            <code>
              {JSON.stringify(
                { ean: selectedProduct.ean, expiry: expiryInput || '000000' },
                null,
                2
              )}
            </code>
          </div>

          {/* Buttons */}
          <div className="w-full grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadPng}
              disabled={!qrDataUrl}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-[var(--accent)]" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handleDownloadSvg}
              disabled={!qrSvg}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center justify-center gap-2"
            >
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Download SVG</span>
            </button>
            <button
              onClick={handleShare}
              className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-medium text-theme-muted hover:text-theme transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-medium text-theme-muted hover:text-theme transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Putaway QR History Table */}
      <div className="bg-theme-card border border-theme rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-theme flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-theme">Putaway QR Code History</h3>
            <p className="text-xs text-theme-muted">
              Persistent log of generated dairy EAN & Expiry QR codes
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-theme text-theme">
            {historyRecords.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-theme text-theme-muted bg-white/[0.02]">
                <th className="p-4 font-medium">Product Name</th>
                <th className="p-4 font-medium">EAN Number</th>
                <th className="p-4 font-medium">Expiry Date</th>
                <th className="p-4 font-medium">Encoded JSON</th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {historyRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-theme-muted">
                    No putaway QR codes generated yet. Use the generator above to add records.
                  </td>
                </tr>
              ) : (
                historyRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-semibold text-theme">{r.productName}</td>
                    <td className="p-4 font-mono font-medium text-[var(--accent)]">{r.ean}</td>
                    <td className="p-4 font-mono text-theme">{r.expiryDate}</td>
                    <td className="p-4 font-mono text-theme-muted truncate max-w-[180px]">
                      {r.qrContent}
                    </td>
                    <td className="p-4 text-theme-muted">
                      {r.generatedDate} • {r.generatedTime}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="p-1.5 rounded-lg text-theme-muted hover:text-red-400 hover:bg-white/5 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Putaway Record"
        message="Remove this putaway QR record from history? This cannot be undone."
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
