import React, { useEffect, useMemo, useState } from 'react';
import { Download, QrCode, Sparkles } from 'lucide-react';
import { downloadFile, generateQRPngDataUrl } from '../services/qrUtils';

const pigeonHoleGroups = {
  RED: ['RED_1', 'RED_2', 'RED_3'],
  GRN: ['GRN_1', 'GRN_2', 'GRN_3', 'GRN_4', 'GRN_5', 'GRN_6', 'GRN_7', 'GRN_8', 'GRN_9'],
  BLU: ['BLU_1', 'BLU_2', 'BLU_3', 'BLU_4', 'BLU_5', 'BLU_6', 'BLU_7', 'BLU_8', 'BLU_9'],
  WHT: ['WHT_1', 'WHT_2', 'WHT_3', 'WHT_4', 'WHT_5', 'WHT_6', 'WHT_7', 'WHT_8', 'WHT_9'],
  YLW: ['YLW_1', 'YLW_2', 'YLW_3', 'YLW_4', 'YLW_5', 'YLW_6', 'YLW_7', 'YLW_8', 'YLW_9'],
} as const;

const groupOrder = Object.keys(pigeonHoleGroups) as Array<keyof typeof pigeonHoleGroups>;
const allPigeonHoles = groupOrder.flatMap((group) => pigeonHoleGroups[group]);

const groupStyles = {
  RED: {
    dot: 'bg-red-600',
    inactive: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
    active: 'border-red-700 bg-red-700 text-white shadow-md shadow-red-900/25',
  },
  GRN: {
    dot: 'bg-green-600',
    inactive: 'border-green-600 bg-green-600 text-white hover:bg-green-700',
    active: 'border-green-700 bg-green-700 text-white shadow-md shadow-green-900/25',
  },
  BLU: {
    dot: 'bg-blue-600',
    inactive: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    active: 'border-blue-700 bg-blue-700 text-white shadow-md shadow-blue-900/25',
  },
  WHT: {
    dot: 'bg-slate-300',
    inactive: 'border-slate-300 bg-slate-200 text-slate-900 hover:bg-slate-300',
    active: 'border-slate-600 bg-slate-800 text-white shadow-md shadow-slate-900/25',
  },
  YLW: {
    dot: 'bg-yellow-400',
    inactive: 'border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-500',
    active: 'border-yellow-600 bg-yellow-500 text-black shadow-md shadow-yellow-900/25',
  },
} as const;

const buildPayload = (selected: string) => {
  const trimmed = selected.trim();
  if (!trimmed) return 'RES_1 {}';

  return trimmed;
};

export const PigeonHoleQRView: React.FC = () => {
  const [selectedPigeonHole, setSelectedPigeonHole] = useState<string>('RED_1');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const payload = useMemo(() => buildPayload(selectedPigeonHole), [selectedPigeonHole]);

  useEffect(() => {
    const generate = async () => {
      setIsGenerating(true);
      setError('');

      try {
        const qrValue = payload;
        const dataUrl = await generateQRPngDataUrl(qrValue, {
          width: 320,
          margin: 1,
          color: {
            dark: '#111827',
            light: '#ffffff',
          },
        });

        setQrDataUrl(dataUrl);
      } catch (e: any) {
        setError(e?.message || 'Failed to generate QR code.');
        setQrDataUrl('');
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [selectedPigeonHole]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const fileName = `${selectedPigeonHole.toUpperCase()}-pigeon-hole-qr.png`;
    downloadFile(qrDataUrl, fileName, false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="rounded-2xl border border-theme bg-theme-card p-6 xl:col-span-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-theme">Pigeon Hole QR Generator</h2>
        </div>

        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
          Select pigeon hole
        </label>

        <div className="mt-4 space-y-4">
          {groupOrder.map((group) => {
            const styles = groupStyles[group];
            return (
              <div key={group} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-theme-muted">
                    {group}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {pigeonHoleGroups[group].map((value) => {
                    const isActive = value === selectedPigeonHole;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedPigeonHole(value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                          isActive ? styles.active : styles.inactive
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-theme bg-[var(--bg)] p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
            Selected pigeon hole
          </p>
          <div className="text-sm font-medium text-theme">{selectedPigeonHole}</div>
          <p className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-muted">
            Payload output
          </p>
          <pre className="whitespace-pre-wrap break-words text-sm text-theme">{payload}</pre>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!qrDataUrl || isGenerating}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Download className="h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Download QR'}
        </button>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-theme bg-theme-card p-6 xl:col-span-7">
        <div className="mb-4 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-[var(--accent)]" />
          <h3 className="text-lg font-semibold text-theme">QR Preview</h3>
        </div>

        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-theme bg-[var(--bg)] p-6">
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrDataUrl} alt="Pigeon hole QR code" className="max-h-[340px] w-full max-w-[320px] rounded-2xl bg-white p-3 shadow-lg" />
              <p className="text-center text-sm font-medium text-theme">{payload}</p>
            </div>
          ) : (
            <p className="text-sm text-theme-muted">
              {isGenerating ? 'Generating QR code...' : 'QR preview will appear here.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
