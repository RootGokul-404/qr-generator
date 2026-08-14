import React, { useState, useEffect } from 'react';
import {
  generateQRPngDataUrl,
  generateQRSvgString,
  downloadFile,
  copyToClipboard,
  shareContent,
  printImageElement,
  detectQRContentType,
} from '../services/qrUtils.ts';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import {
  QrCode,
  Download,
  Copy,
  Share2,
  Printer,
  Save,
  MapPin,
  Check,
  AlertCircle,
  FileCode,
  Palette,
  Layers3,
  Hash,
  ListFilter,
} from 'lucide-react';

export const QRGeneratorView: React.FC = () => {
  const settings = storage.getSettings();
  const zoneOptions = Array.from({ length: 10 }, (_, index) => String.fromCharCode(65 + index));
  const rackOptions = Array.from({ length: 35 }, (_, index) => String(index + 1));
  const shelfOptions = Array.from({ length: 10 }, (_, index) => String.fromCharCode(65 + index));

  const [content, setContent] = useState<string>('https://aavinmilk.com/quality-standards');
  const [payloadMode, setPayloadMode] = useState<'raw' | 'json'>('raw');
  const [prefix, setPrefix] = useState<string>('CKKN3');
  const [zone, setZone] = useState<string>('A');
  const [rack, setRack] = useState<string>('1');
  const [shelf, setShelf] = useState<string>('A');
  const [position, setPosition] = useState<string>('1');
  const [foregroundColor, setForegroundColor] = useState<string>('#111827');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>(
    settings.errorCorrectionDefault || 'M'
  );
  const [location, setLocation] = useState<string>(
    settings.defaultLocation || 'Dairy Warehouse A - Sector 4'
  );
  const [qrSize, setQrSize] = useState<number>(420);

  const zoneCategoryMap: Array<{ value: string; label: string }> = [
    { value: 'A', label: 'Food Items' },
    { value: 'B', label: 'Food Items' },
    { value: 'C', label: 'Non-Food Items' },
    { value: 'D', label: 'Food Items' },
    { value: 'E', label: 'FNV & Dairy' },
    { value: 'F', label: 'Cold Items' },
    { value: 'G', label: 'Cold Items' },
    { value: 'H', label: 'Bulk Items' },
  ];

  const getZoneCategory = (value: string): string => {
    const normalized = (value || 'A').toUpperCase();
    return zoneCategoryMap.find((item) => item.value === normalized)?.label || 'General Storage';
  };
  const [dataUrl, setDataUrl] = useState<string>('');
  const [svgStr, setSvgStr] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  const buildPayload = (sequence?: number): string => {
    const safePrefix = (prefix || 'CKKN3').trim().toUpperCase();
    const safeZone = zoneOptions.includes((zone || 'A').toUpperCase()) ? (zone || 'A').toUpperCase() : 'A';
    const safeRack = rackOptions.includes(String(rack || '1')) ? String(rack || '1') : '1';
    const safeShelf = shelfOptions.includes((shelf || 'A').toUpperCase()) ? (shelf || 'A').toUpperCase() : 'A';
    const safePosition = rackOptions.includes(String(position || '1')) ? String(position || '1') : '1';

    const labelCode = [safePrefix, safeZone, safeRack, safeShelf, safePosition].join('-');
    const sequenceSuffix = sequence !== undefined ? `-${String(sequence).padStart(4, '0')}` : '';

    return `${labelCode}${sequenceSuffix}`.toUpperCase();
  };

  const getActivePayload = (): string => {
    if (payloadMode === 'json') {
      return buildPayload();
    }

    const rawValue = (content || '').trim();
    return rawValue || buildPayload();
  };

  const validateInput = (val: string): boolean => {
    if (!val.trim()) {
      setValidationError('QR content cannot be empty.');
      return false;
    }
    if (val.length > 2953) {
      setValidationError('Content exceeds QR Code maximum capacity (2,953 characters).');
      return false;
    }
    setValidationError('');
    return true;
  };

  const generateCurrentQr = async (forcedContent?: string) => {
    const nextContent = forcedContent ?? getActivePayload();
    if (!validateInput(nextContent)) return;
    try {
      const pngUrl = await generateQRPngDataUrl(nextContent, {
        errorCorrectionLevel: errorCorrection,
        width: qrSize,
        margin: 2,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
      });
      const svg = await generateQRSvgString(nextContent, {
        errorCorrectionLevel: errorCorrection,
        width: qrSize,
        margin: 2,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
      });
      setDataUrl(pngUrl);
      setSvgStr(svg);
      setIsSaved(false);
    } catch (e: any) {
      setValidationError('Failed to generate QR Code: ' + (e?.message || 'Unknown error'));
    }
  };

  const handleGenerate = async () => {
    await generateCurrentQr();
  };

  useEffect(() => {
    handleGenerate();
  }, [payloadMode, prefix, zone, rack, shelf, position, location, content, errorCorrection, qrSize, foregroundColor, backgroundColor]);

  const handleSaveToHistory = () => {
    const nextContent = getActivePayload();
    if (!dataUrl) return;
    if (!validateInput(nextContent)) return;

    const now = new Date();
    const newRecord = storage.addQRHistory({
      image: dataUrl,
      content: nextContent.trim(),
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      location: normalizedLocation,
      status: 'Generated',
      fileSize: `${Math.round(dataUrl.length / 1024)} KB`,
      createdBy: settings.currentUser || 'Supply Chain Manager',
      type: detectQRContentType(nextContent),
      errorCorrectionLevel: errorCorrection,
      metadata: {
        prefix,
        zone,
        rack,
        shelf,
        position,
        payloadMode,
      },
    });

    setIsSaved(true);
    soundAndNotify.notify(
      'QR Saved to History',
      `Saved warehouse label (${newRecord.type.toUpperCase()}) for ${newRecord.location}`,
      'success',
      'qr-history'
    );
  };

  const normalizedLocation = (location || 'Dairy Warehouse A - Sector 4').trim() || 'Dairy Warehouse A - Sector 4';
  const payloadPreview = getActivePayload();

  const handleDownloadPng = () => {
    if (!dataUrl) return;
    const filename = `vesta_qr_${Date.now()}.png`;
    downloadFile(dataUrl, filename, false);
    soundAndNotify.notify('QR Downloaded', `Downloaded PNG image (${filename})`, 'success');
  };

  const handleDownloadSvg = () => {
    if (!svgStr) return;
    const filename = `vesta_qr_${Date.now()}.svg`;
    downloadFile(svgStr, filename, true);
    soundAndNotify.notify('QR Downloaded', `Downloaded SVG vector file (${filename})`, 'success');
  };

  const handleCopy = async () => {
    const copyValue = payloadPreview.trim();
    const ok = await copyToClipboard(copyValue);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      soundAndNotify.addToast('Copied to Clipboard', 'QR content copied successfully.', 'success');
    }
  };

  const handleShare = async () => {
    const shareValue = payloadPreview.trim();
    const ok = await shareContent('Vesta QR Code', shareValue, shareValue.startsWith('http') ? shareValue : undefined);
    if (ok) {
      soundAndNotify.notify('QR Shared', 'QR content shared successfully via Web Share API', 'info');
    } else {
      handleCopy();
      soundAndNotify.addToast('Link Copied', 'Web Share unsupported on this device. Content copied to clipboard.', 'info');
    }
  };

  const handlePrint = () => {
    if (!dataUrl) return;
    printImageElement(dataUrl, 'Vesta Dairy OS QR Code Printout');
    soundAndNotify.notify('Print Initiated', 'Sent QR code to printer dialog', 'info');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Form & Configuration */}
      <div className="lg:col-span-7 bg-theme-card border border-theme rounded-2xl p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[var(--accent)]" />
            <span>High-Resolution QR Code Generator</span>
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Create QR codes with error correction, location tagging, and instant SVG/PNG exports.
          </p>
        </div>

        {validationError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-theme uppercase tracking-wider">
              Payload Mode
            </label>
            <div className="inline-flex rounded-xl border border-theme bg-[var(--bg)] p-1">
              {(['raw', 'json'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPayloadMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    payloadMode === mode
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-theme-muted hover:text-theme'
                  }`}
                >
                  {mode === 'raw' ? 'Raw Text' : 'JSON Payload'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Prefix</label>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="CKKN3"
                className="bg-[var(--bg)] border border-theme rounded-xl px-3 py-2 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Zone</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="bg-[var(--bg)] border border-theme rounded-xl px-3 py-2 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              >
                {zoneOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Rack</label>
              <select
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                className="bg-[var(--bg)] border border-theme rounded-xl px-3 py-2 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              >
                {rackOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Shelf</label>
              <select
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
                className="bg-[var(--bg)] border border-theme rounded-xl px-3 py-2 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              >
                {shelfOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="bg-[var(--bg)] border border-theme rounded-xl px-3 py-2 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              >
                {rackOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-theme bg-[var(--bg)] p-3">
            <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider text-theme-muted">
              <Hash className="w-3.5 h-3.5" />
              <span>Generated label ID</span>
            </div>
            <div className="font-mono text-sm text-theme break-all">{buildPayload()}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-theme uppercase tracking-wider">
            QR Content / Data
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Enter URL, email, phone number, Wi-Fi credentials, or JSON payload..."
            className="w-full bg-[var(--bg)] border border-theme rounded-xl p-3 text-sm text-theme focus:outline-none focus:border-[var(--accent)] font-mono resize-y"
          />
          <div className="flex items-center justify-between text-xs text-theme-muted">
            <span>
              Detected Type:{' '}
              <strong className="text-[var(--accent)] uppercase">{detectQRContentType(payloadPreview)}</strong>
            </span>
            <span>{payloadPreview.length} / 2,953 characters</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-theme uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>Foreground Color</span>
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-theme bg-[var(--bg)] px-3 py-2">
              <input type="color" value={foregroundColor} onChange={(e) => setForegroundColor(e.target.value)} className="h-10 w-12 rounded border-0 bg-transparent p-0" />
              <span className="font-mono text-xs text-theme">{foregroundColor}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-theme uppercase tracking-wider flex items-center gap-1.5">
              <Layers3 className="w-3.5 h-3.5" />
              <span>Background Color</span>
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-theme bg-[var(--bg)] px-3 py-2">
              <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-10 w-12 rounded border-0 bg-transparent p-0" />
              <span className="font-mono text-xs text-theme">{backgroundColor}</span>
            </div>
          </div>
        </div>

        {/* Error Correction Level */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-theme uppercase tracking-wider">
            Error Correction Level
          </label>
          <div className="grid grid-cols-4 gap-3">
            {(
              [
                { level: 'L', label: 'Low (7%)', desc: 'Smallest file' },
                { level: 'M', label: 'Medium (15%)', desc: 'Balanced' },
                { level: 'Q', label: 'Quartile (25%)', desc: 'Industrial' },
                { level: 'H', label: 'High (30%)', desc: 'Max redundancy' },
              ] as const
            ).map((item) => (
              <button
                key={item.level}
                type="button"
                onClick={() => setErrorCorrection(item.level)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  errorCorrection === item.level
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-theme'
                    : 'border-theme bg-[var(--bg)] text-theme-muted hover:text-theme'
                }`}
              >
                <div className="font-semibold text-xs">{item.label}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Location Tagging & Resolution */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-theme uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-theme-muted" />
              <span>Location Tag</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Cold Storage Bay 2"
              className="w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="rounded-xl border border-theme bg-[var(--bg)] px-2.5 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-theme-muted mb-2">
                Zone mapping
              </div>
              <div className="flex flex-wrap gap-1.5">
                {zoneCategoryMap.map((item) => (
                  <span
                    key={item.value}
                    className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-medium ${
                      zone === item.value
                        ? 'border-[var(--accent)] bg-[var(--accent)]/12 text-[var(--accent)]'
                        : 'border-theme bg-[var(--bg)] text-theme-muted'
                    }`}
                  >
                    {item.value} → {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-theme uppercase tracking-wider flex items-center gap-1.5">
              <ListFilter className="w-3.5 h-3.5 text-theme-muted" />
              <span>Resolution (px)</span>
            </label>
            <div className="rounded-xl border border-theme bg-[var(--bg)] px-3 py-2">
              <input
                type="range"
                min={128}
                max={1024}
                step={16}
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <div className="mt-2 flex items-center justify-between text-[10px] text-theme-muted">
                <span>128</span>
                <span className="font-semibold text-theme">{qrSize}px</span>
                <span>1024</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save to History CTA */}
        <div className="mt-2">
          <button
            onClick={handleSaveToHistory}
            disabled={!dataUrl || !!validationError || isSaved}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              isSaved
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-theme-accent hover:bg-[var(--accent-hover)] text-white'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved to QR History</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save QR Code to History</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Live High-Resolution Preview & Action Bar */}
      <div className="lg:col-span-5 bg-theme-card border border-theme rounded-2xl p-6 flex flex-col items-center justify-between gap-6">
        <div className="w-full flex items-center justify-between border-b border-theme pb-3">
          <h3 className="text-sm font-semibold text-theme">Live QR Preview</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-mono">
            {errorCorrection} • {qrSize}px
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center justify-center border-4 border-gray-100 max-w-[280px] w-full">
          {dataUrl ? (
            <img src={dataUrl} alt="Generated QR Preview" className="w-56 h-56 object-contain" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-gray-400 text-xs">
              Generating...
            </div>
          )}
          <div className="mt-3 w-full border-t border-gray-200 pt-3 text-center">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-1">QR Data</div>
            <div className="text-black font-bold text-xs tracking-wider uppercase break-all">
              {payloadPreview || 'CKKN3-A-01-A-01'}
            </div>
          </div>
          <div className="mt-2 text-black font-bold text-[10px] tracking-wider uppercase text-center max-w-[220px] truncate">
            {normalizedLocation}
          </div>
        </div>

        {/* Export & Sharing Bar */}
        <div className="w-full space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadPng}
              disabled={!dataUrl}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-[var(--accent)]" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handleDownloadSvg}
              disabled={!svgStr}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center justify-center gap-2"
            >
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Download SVG</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleCopy}
              className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-medium text-theme-muted hover:text-theme transition-colors flex items-center justify-center gap-1.5"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={handleShare}
              className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-medium text-theme-muted hover:text-theme transition-colors flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!dataUrl}
              className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-medium text-theme-muted hover:text-theme transition-colors flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
