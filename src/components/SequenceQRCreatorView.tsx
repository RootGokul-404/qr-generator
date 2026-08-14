import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, ListOrdered, QrCode, Trash2 } from 'lucide-react';
import {
  copyToClipboard,
  detectQRContentType,
  downloadFile,
  generateQRPngDataUrl,
} from '../services/qrUtils.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';

interface SequenceQrEntry {
  id: string;
  value: string;
  dataUrl: string;
  type: ReturnType<typeof detectQRContentType>;
}

const prefixOptions = ['CKKN3', 'CKKN4', 'CKKN5'];
const zoneOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const rackOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const shelfOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const positionOptions = Array.from({ length: 50 }, (_, index) => String(index + 1));

export const SequenceQRCreatorView: React.FC = () => {
  const [startRange, setStartRange] = useState<number>(1);
  const [endRange, setEndRange] = useState<number>(10);
  const [prefix, setPrefix] = useState<string>('CKKN3');
  const [zoneStart, setZoneStart] = useState<string>('A');
  const [zoneEnd, setZoneEnd] = useState<string>('C');
  const [rackStart, setRackStart] = useState<string>('1');
  const [rackEnd, setRackEnd] = useState<string>('3');
  const [shelfStart, setShelfStart] = useState<string>('A');
  const [shelfEnd, setShelfEnd] = useState<string>('C');
  const [qrSize, setQrSize] = useState<number>(220);
  const [foregroundColor, setForegroundColor] = useState('#111827');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [entries, setEntries] = useState<SequenceQrEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const sequenceValues = useMemo(() => {
    const safeStart = Number.isFinite(startRange) ? Math.max(0, Math.floor(startRange)) : 0;
    const safeEnd = Number.isFinite(endRange) ? Math.max(safeStart, Math.floor(endRange)) : safeStart;

    if (safeStart === safeEnd) {
      return [safeStart];
    }

    const values = [] as number[];
    for (let value = safeStart; value <= safeEnd; value += 1) {
      values.push(value);
    }
    return values;
  }, [startRange, endRange]);

  const getValueRange = (options: string[], startValue: string, endValue: string) => {
    const startIndex = options.indexOf(startValue);
    const endIndex = options.indexOf(endValue);
    if (startIndex === -1 || endIndex === -1) {
      return options;
    }

    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    return options.slice(from, to + 1);
  };

  const generatedQrValues = useMemo(() => {
    const zoneValues = getValueRange(zoneOptions, zoneStart, zoneEnd);
    const rackValues = getValueRange(rackOptions, rackStart, rackEnd);
    const shelfValues = getValueRange(shelfOptions, shelfStart, shelfEnd);

    const combinedValues: string[] = [];

    zoneValues.forEach((zoneValue) => {
      rackValues.forEach((rackValue) => {
        shelfValues.forEach((shelfValue) => {
          sequenceValues.forEach((positionValue) => {
            combinedValues.push(`${prefix.trim().toUpperCase()}-${zoneValue}-${rackValue}-${shelfValue}-${positionValue}`);
          });
        });
      });
    });

    return combinedValues;
  }, [prefix, zoneStart, zoneEnd, rackStart, rackEnd, shelfStart, shelfEnd, sequenceValues]);

  useEffect(() => {
    if (!generatedQrValues.length) {
      setEntries([]);
      return;
    }

    let isCancelled = false;

    const generateEntries = async () => {
      setIsGenerating(true);
      setError('');

      try {
        const generatedEntries = await Promise.all(
          generatedQrValues.map(async (qrValue, index) => {
            const dataUrl = await generateQRPngDataUrl(qrValue, {
              width: qrSize,
              margin: 1,
              color: {
                dark: foregroundColor,
                light: backgroundColor,
              },
            });

            return {
              id: `${qrValue}-${index}-${Date.now()}`,
              value: qrValue,
              dataUrl,
              type: detectQRContentType(qrValue),
            };
          })
        );

        if (!isCancelled) {
          setEntries(generatedEntries);
        }
      } catch (e: any) {
        if (!isCancelled) {
          setError(e?.message || 'Failed to generate sequence QR codes.');
          setEntries([]);
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    generateEntries();

    return () => {
      isCancelled = true;
    };
  }, [generatedQrValues, qrSize, foregroundColor, backgroundColor]);

  const handleDownloadSingle = (entry: SequenceQrEntry) => {
    const safeName = entry.value.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40) || 'sequence-qr';
    downloadFile(entry.dataUrl, `${safeName}.png`, false);
    soundAndNotify.notify('QR downloaded', `${safeName} was downloaded successfully.`, 'success');
  };

  const handleDownloadAll = () => {
    if (!entries.length) return;

    entries.forEach((entry, index) => {
      const safeName = (entry.value.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40) || `sequence-qr-${index + 1}`)
        .toLowerCase();
      downloadFile(entry.dataUrl, `${safeName}-${index + 1}.png`, false);
    });

    soundAndNotify.notify('Sequence QR download started', `${entries.length} files are being downloaded.`, 'info');
  };

  const handleCopyValue = async (value: string) => {
    const ok = await copyToClipboard(value);
    if (ok) {
      soundAndNotify.addToast('Copied', 'Sequence QR value copied to clipboard.', 'success');
    }
  };

  const resetEntries = () => setEntries([]);

  const generateSequenceEntries = async () => {
    if (!generatedQrValues.length) {
      setError('Enter a valid start and end range to generate sequence QR codes.');
      setEntries([]);
      return;
    }

    setError('');
    setIsGenerating(true);

    try {
      const generatedEntries = await Promise.all(
        generatedQrValues.map(async (qrValue, index) => {
          const dataUrl = await generateQRPngDataUrl(qrValue, {
            width: qrSize,
            margin: 1,
            color: {
              dark: foregroundColor,
              light: backgroundColor,
            },
          });

          return {
            id: `${qrValue}-${index}-${Date.now()}`,
            value: qrValue,
            dataUrl,
            type: detectQRContentType(qrValue),
          };
        })
      );

      setEntries(generatedEntries);
      soundAndNotify.notify(
        'Sequence QR codes generated',
        `${generatedEntries.length} QR codes created from the selected range.`,
        'success',
        'qr-generator'
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to generate sequence QR codes.');
      setEntries([]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5 bg-theme-card border border-theme rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ListOrdered className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-theme">Sequence QR Creator</h2>
        </div>

        <p className="text-xs text-theme-muted mb-4">
          Set a start and end range to generate a full sequence of QR codes automatically.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Start range
            </label>
            <select
              value={String(startRange)}
              onChange={(event) => setStartRange(Number(event.target.value || 1))}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {positionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              End range
            </label>
            <select
              value={String(endRange)}
              onChange={(event) => setEndRange(Number(event.target.value || 1))}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {positionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Prefix
            </label>
            <select
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {prefixOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Zone start
            </label>
            <select
              value={zoneStart}
              onChange={(event) => setZoneStart(event.target.value)}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {zoneOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Zone end
            </label>
            <select
              value={zoneEnd}
              onChange={(event) => setZoneEnd(event.target.value)}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {zoneOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Rack start
            </label>
            <select
              value={rackStart}
              onChange={(event) => setRackStart(event.target.value)}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {rackOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Rack end
            </label>
            <select
              value={rackEnd}
              onChange={(event) => setRackEnd(event.target.value)}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {rackOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Shelf start
            </label>
            <select
              value={shelfStart}
              onChange={(event) => setShelfStart(event.target.value)}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {shelfOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Shelf end
            </label>
            <select
              value={shelfEnd}
              onChange={(event) => setShelfEnd(event.target.value)}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {shelfOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Position start
            </label>
            <select
              value={String(startRange)}
              onChange={(event) => setStartRange(Number(event.target.value || 1))}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {positionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
              Position end
            </label>
            <select
              value={String(endRange)}
              onChange={(event) => setEndRange(Number(event.target.value || 1))}
              className="rounded-xl border border-theme bg-[var(--bg)] p-3 text-sm text-theme outline-none focus:border-[var(--accent)]"
            >
              {positionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
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
              <input
                type="color"
                value={foregroundColor}
                onChange={(event) => setForegroundColor(event.target.value)}
                className="h-10 w-12 rounded border-0 bg-transparent p-0"
              />
              <span className="font-mono text-xs text-theme">{foregroundColor}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-theme-muted">
          <span>{generatedQrValues.length} QR item(s)</span>
          <span>{startRange} to {endRange}</span>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={generateSequenceEntries}
            className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isGenerating || !generatedQrValues.length}
          >
            {isGenerating ? 'Generating...' : 'Generate Sequence'}
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
          <QrCode className="w-5 h-5 text-[var(--accent)]" />
          <h3 className="text-lg font-semibold text-theme">Generated QR Sequence</h3>
        </div>

        {entries.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-theme bg-[var(--bg)] text-sm text-theme-muted">
            Pick a start and end range to preview the generated QR sequence.
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
                    onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}
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
