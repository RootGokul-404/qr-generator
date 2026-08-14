import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, QrCode, Sparkles, Trash2 } from 'lucide-react';
import { copyToClipboard, detectQRContentType, downloadFile, generateQRPngDataUrl } from '../services/qrUtils.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';

interface BulkQrEntry {
  id: string;
  value: string;
  dataUrl: string;
  type: ReturnType<typeof detectQRContentType>;
}

const splitBulkInput = (rawValue: string): string[] =>
  rawValue
    .split(/[\s,;\r\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);

export const BulkQRGenerationView: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>(
    'CKKN3-A-1-A-1\nCKKN3-A-2-A-1\nCKKN3-A-3-A-1\nCKKN3-A-4-A-1'
  );
  const [entries, setEntries] = useState<BulkQrEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [qrSize, setQrSize] = useState(240);
  const [foregroundColor, setForegroundColor] = useState('#111827');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  const parsedValues = useMemo(() => splitBulkInput(inputValue), [inputValue]);

  useEffect(() => {
    const values = splitBulkInput(inputValue);

    if (!values.length) {
      setEntries([]);
      setError('');
      return;
    }

    let isCancelled = false;

    const generateLive = async () => {
      setIsGenerating(true);
      setError('');

      try {
        const generatedEntries = await Promise.all(
          values.map(async (value, index) => {
            const dataUrl = await generateQRPngDataUrl(value, {
              width: qrSize,
              margin: 1,
              color: {
                dark: foregroundColor,
                light: backgroundColor,
              },
            });

            return {
              id: `${value}-${index}-${Date.now()}`,
              value,
              dataUrl,
              type: detectQRContentType(value),
            };
          })
        );

        if (!isCancelled) {
          setEntries(generatedEntries);
        }
      } catch (e: any) {
        if (!isCancelled) {
          setError(e?.message || 'Failed to generate bulk QR codes.');
          setEntries([]);
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    generateLive();

    return () => {
      isCancelled = true;
    };
  }, [inputValue, qrSize, foregroundColor, backgroundColor]);

  const handleGenerate = async () => {
    const values = splitBulkInput(inputValue);

    if (!values.length) {
      setError('Enter at least one QR payload value to generate bulk codes.');
      setEntries([]);
      return;
    }

    setError('');
    setIsGenerating(true);

    try {
      const generatedEntries = await Promise.all(
        values.map(async (value, index) => {
          const dataUrl = await generateQRPngDataUrl(value, {
            width: qrSize,
            margin: 1,
            color: {
              dark: foregroundColor,
              light: backgroundColor,
            },
          });

          return {
            id: `${value}-${index}-${Date.now()}`,
            value,
            dataUrl,
            type: detectQRContentType(value),
          };
        })
      );

      setEntries(generatedEntries);
      soundAndNotify.notify(
        'Bulk QR codes generated',
        `${generatedEntries.length} QR codes created from the input list.`,
        'success',
        'qr-generator'
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to generate bulk QR codes.');
      setEntries([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSingle = (entry: BulkQrEntry) => {
    const safeName = entry.value.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40) || 'bulk-qr';
    downloadFile(entry.dataUrl, `${safeName}.png`, false);
    soundAndNotify.notify('QR downloaded', `${safeName} was downloaded successfully.`, 'success');
  };

  const handleDownloadAll = () => {
    if (!entries.length) return;

    entries.forEach((entry, index) => {
      const safeName = (entry.value.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40) || `bulk-qr-${index + 1}`)
        .toLowerCase();
      downloadFile(entry.dataUrl, `${safeName}-${index + 1}.png`, false);
    });

    soundAndNotify.notify('Bulk QR download started', `${entries.length} files are being downloaded.`, 'info');
  };

  const handleCopyValue = async (value: string) => {
    const ok = await copyToClipboard(value);
    if (ok) {
      soundAndNotify.addToast('Copied', 'QR data copied to clipboard.', 'success');
    }
  };

  const resetEntries = () => setEntries([]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5 bg-theme-card border border-theme rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-theme">Bulk QR Generation</h2>
        </div>

        <p className="text-xs text-theme-muted mb-4">
          Paste multiple values in one input. Each space-separated value will be treated as a separate QR entry.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
          Input data
        </label>
        <textarea
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          rows={10}
          className="mt-2 w-full rounded-2xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
          placeholder="CKKN3-A-1-A-1\nCKKN3-A-2-A-1\nCKKN3-A-3-A-1"
        />

        <div className="mt-4 flex items-center justify-between text-[11px] text-theme-muted">
          <span>{parsedValues.length} data item(s)</span>
          <span>{Math.max(parsedValues.length, 0)} QR to generate</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              QR size
            </label>
            <input
              type="range"
              min={160}
              max={420}
              step={20}
              value={qrSize}
              onChange={(event) => setQrSize(Number(event.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="text-xs text-theme-muted">{qrSize}px</div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Color
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-theme bg-[var(--bg)] px-3 py-2">
              <input type="color" value={foregroundColor} onChange={(event) => setForegroundColor(event.target.value)} className="h-10 w-12 rounded border-0 bg-transparent p-0" />
              <span className="font-mono text-xs text-theme">{foregroundColor}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? 'Generating...' : 'Generate Bulk QR Codes'}
          </button>
          <button
            type="button"
            onClick={resetEntries}
            className="rounded-xl border border-theme bg-white/5 px-4 py-3 text-sm font-semibold text-theme"
          >
            Clear
          </button>
        </div>

        {entries.length > 0 && (
          <div className="mt-5">
            <button
              type="button"
              onClick={handleDownloadAll}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300"
            >
              <Download className="w-4 h-4" />
              Download all QR codes
            </button>
          </div>
        )}
      </div>

      <div className="xl:col-span-7 bg-theme-card border border-theme rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          <h3 className="text-lg font-semibold text-theme">Generated QR Codes</h3>
        </div>

        {entries.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-theme bg-[var(--bg)] text-sm text-theme-muted">
            Generate QR codes from your bulk data list to preview them here.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-theme bg-[var(--bg)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
                    {entry.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyValue(entry.value)}
                    className="rounded-lg border border-theme p-1.5 text-theme-muted hover:text-theme"
                    aria-label="Copy QR data"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex justify-center rounded-xl bg-white p-3">
                  <img src={entry.dataUrl} alt={entry.value} className="h-[180px] w-[180px] object-contain" />
                </div>

                <div className="mt-3 text-center text-[11px] text-theme-muted">QR Data</div>
                <div className="mt-1 break-all rounded-xl border border-theme bg-white/5 px-2 py-2 text-center text-[11px] font-semibold text-theme">
                  {entry.value}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(entry)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-theme bg-white/5 px-3 py-2 text-xs font-medium text-theme"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntries((current) => current.filter((item) => item.id !== entry.id));
                    }}
                    className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300"
                    aria-label="Remove QR"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
