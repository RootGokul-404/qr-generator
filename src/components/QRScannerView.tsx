import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import { copyToClipboard, detectQRContentType } from '../services/qrUtils.ts';
import { ExternalLinkPromptModal } from './common/ExternalLinkPromptModal.tsx';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Zap,
  ZapOff,
  Copy,
  Upload,
  CheckCircle2,
  AlertCircle,
  History,
  Settings2,
  ScanLine,
} from 'lucide-react';

export const QRScannerView: React.FC = () => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string>('');
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const [flashSupported, setFlashSupported] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [lastScannedText, setLastScannedText] = useState<string>('');
  const [lastScannedTime, setLastScannedTime] = useState<string>('');
  const [promptModalOpen, setPromptModalOpen] = useState<boolean>(false);
  const [promptContent, setPromptContent] = useState<{
    content: string;
    type: 'url' | 'email' | 'phone' | 'wifi' | 'geo' | 'json' | 'text';
  } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'vesta-qr-reader-viewport';
  const lastScannedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  // Enumerate cameras
  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const camList = devices.map((d, i) => ({
          id: d.id,
          label: d.label || `Camera ${i + 1}`,
        }));
        setCameras(camList);
        if (!selectedCameraId) {
          // prefer back camera if possible
          const backCam = camList.find(
            (c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCam ? backCam.id : camList[0].id);
        }
      } else {
        setPermissionError('No camera devices detected on this system.');
      }
    } catch (err: any) {
      setPermissionError(
        'Camera permission required. Please allow camera access in your browser settings.'
      );
    }
  }, [selectedCameraId]);

  useEffect(() => {
    enumerateCameras();
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    setPermissionError('');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId, { verbose: false });
      }

      const cameraIdOrConfig = selectedCameraId
        ? selectedCameraId
        : { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraIdOrConfig,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        undefined
      );

      setIsScanning(true);

      // Check flash / torch capabilities
      try {
        const stream = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
        if (stream && stream.torchFeature()) {
          setFlashSupported(true);
        }
      } catch {
        setFlashSupported(false);
      }
    } catch (err: any) {
      setPermissionError(
        'Could not start web camera: ' + (err?.message || 'Permission denied or device in use.')
      );
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {
        // ignore clean up error
      }
      setIsScanning(false);
      setFlashOn(false);
    }
  };

  const toggleFlash = async () => {
    if (!html5QrCodeRef.current || !isScanning || !flashSupported) return;
    try {
      const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
      if (capabilities && capabilities.torchFeature()) {
        const newFlashState = !flashOn;
        await capabilities.torchFeature().apply(newFlashState);
        setFlashOn(newFlashState);
      }
    } catch (e) {
      soundAndNotify.addToast('Flash Unavailable', 'Torch unsupported on current camera.', 'warning');
    }
  };

  const handleScanRecord = (decodedText: string) => {
    const now = new Date();
    const type = detectQRContentType(decodedText);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Save to storage
    storage.addQRHistory({
      image: '',
      content: decodedText,
      date: now.toISOString().slice(0, 10),
      time: timeStr,
      location: storage.getSettings().defaultLocation || 'Scanning Station 1',
      status: 'Scanned',
      fileSize: `${Math.round(decodedText.length / 1024 + 1)} KB`,
      createdBy: storage.getSettings().currentUser || 'Scanner Operator',
      type,
    });

    setLastScannedText(decodedText);
    setLastScannedTime(timeStr);

    // Play beep
    soundAndNotify.playScanBeep();

    // Automatically copy QR data to clipboard
    copyToClipboard(decodedText);
    soundAndNotify.addToast('Scan Successful', 'QR data copied successfully.', 'success');

    // Check if prompt required for external links/actions
    if (['url', 'email', 'phone', 'wifi', 'geo'].includes(type)) {
      setPromptContent({ content: decodedText, type });
      setPromptModalOpen(true);
    }
  };

  const onScanSuccess = (decodedText: string) => {
    const nowTs = Date.now();
    // Duplicate scan prevention (within 3 seconds for same barcode)
    if (
      decodedText === lastScannedRef.current.text &&
      nowTs - lastScannedRef.current.time < 3000
    ) {
      return;
    }

    lastScannedRef.current = { text: decodedText, time: nowTs };

    if (!continuousMode) {
      stopScanning();
    }

    handleScanRecord(decodedText);
  };

  // Manual image file fallback scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId, { verbose: false });
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      handleScanRecord(decodedText);
    } catch (err) {
      soundAndNotify.addToast(
        'Scan Failed',
        'Could not decode a QR code from the selected image.',
        'error'
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left / Main Camera Viewport */}
      <div className="lg:col-span-7 bg-theme-card border border-theme rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
              <Camera className="w-5 h-5 text-[var(--accent)]" />
              <span>Web Camera QR Scanner</span>
            </h2>
            <p className="text-xs text-theme-muted mt-0.5">
              Continuous or single scan with automatic clipboard copying and duplicate prevention.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setContinuousMode(!continuousMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                continuousMode
                  ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                  : 'bg-white/5 border-theme text-theme-muted hover:text-theme'
              }`}
              title="Continuous scanning mode"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{continuousMode ? 'Continuous Mode' : 'Single Mode'}</span>
            </button>
          </div>
        </div>

        {permissionError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Camera Error</p>
              <p className="mt-0.5 opacity-90">{permissionError}</p>
            </div>
            <button
              onClick={enumerateCameras}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-semibold text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Camera Selector Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-xl border border-theme">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-xs text-theme-muted">Camera:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                if (isScanning) {
                  stopScanning().then(() => startScanning());
                }
              }}
              disabled={cameras.length === 0}
              className="flex-1 bg-[var(--bg)] border border-theme rounded-lg px-2.5 py-1.5 text-xs text-theme focus:outline-none focus:border-[var(--accent)]"
            >
              {cameras.length === 0 ? (
                <option value="">Default Environment Camera</option>
              ) : (
                cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {flashSupported && (
              <button
                onClick={toggleFlash}
                disabled={!isScanning}
                className={`p-2 rounded-lg border text-xs font-semibold transition-colors ${
                  flashOn
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-white/5 border-theme text-theme-muted hover:text-theme'
                }`}
                title="Toggle Torch/Flash"
              >
                {flashOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={isScanning ? stopScanning : startScanning}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                isScanning
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-theme-accent hover:bg-[var(--accent-hover)] text-white'
              }`}
            >
              {isScanning ? (
                <>
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Scanner</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Start Camera</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Viewport Box */}
        <div className="relative w-full aspect-square sm:aspect-video max-h-[420px] bg-black rounded-2xl overflow-hidden border border-theme flex items-center justify-center">
          <div id={readerElementId} className="w-full h-full object-cover"></div>
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--card)]/90 backdrop-blur-xs text-center p-6">
              <Camera className="w-12 h-12 text-theme-muted opacity-60" />
              <div>
                <p className="text-sm font-semibold text-theme">Camera is currently standby</p>
                <p className="text-xs text-theme-muted mt-1">
                  Click "Start Camera" above or upload an image file containing a QR code.
                </p>
              </div>
              <label className="mt-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-medium text-theme cursor-pointer flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4 text-[var(--accent)]" />
                <span>Upload QR Image File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Scan Result & Last Scanned Action Panel */}
      <div className="lg:col-span-5 bg-theme-card border border-theme rounded-2xl p-6 flex flex-col justify-between gap-6">
        <div>
          <div className="flex items-center justify-between border-b border-theme pb-3">
            <h3 className="text-sm font-semibold text-theme flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--accent)]" />
              <span>Last Scanned Result</span>
            </h3>
            {lastScannedTime && (
              <span className="text-xs text-theme-muted font-mono">{lastScannedTime}</span>
            )}
          </div>

          {lastScannedText ? (
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-xl bg-[var(--bg)] border border-theme">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                    {detectQRContentType(lastScannedText)}
                  </span>
                  <span className="text-xs text-[var(--success)] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Copied to clipboard</span>
                  </span>
                </div>
                <p className="font-mono text-sm text-theme break-all leading-relaxed">
                  {lastScannedText}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    copyToClipboard(lastScannedText);
                    soundAndNotify.addToast('Copied', 'QR data copied successfully.', 'success');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4 text-[var(--accent)]" />
                  <span>Copy Again</span>
                </button>
                <button
                  onClick={() => {
                    const type = detectQRContentType(lastScannedText);
                    if (['url', 'email', 'phone', 'wifi', 'geo'].includes(type)) {
                      setPromptContent({ content: lastScannedText, type });
                      setPromptModalOpen(true);
                    } else {
                      soundAndNotify.addToast('Text QR', 'This QR contains plain text/JSON.', 'info');
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center justify-center gap-2"
                >
                  <span>Open Content</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-theme-muted">
              <ScanLine className="w-10 h-10 mx-auto opacity-30 mb-3" />
              <p className="text-xs font-medium">No QR code scanned in current session</p>
              <p className="text-[11px] opacity-75 mt-1">
                Scanned QR codes will appear here and are stored persistently in QR History.
              </p>
            </div>
          )}
        </div>

        {/* Tip Box */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-theme text-xs text-theme-muted space-y-1">
          <div className="font-semibold text-theme flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
            <span>Automatic History & Clipboard</span>
          </div>
          <p className="leading-relaxed">
            Every successful scan automatically copies the payload to your clipboard and records an entry in your local QR History with timestamp and location tags.
          </p>
        </div>
      </div>

      {/* External Link Security Confirmation Prompt */}
      {promptContent && (
        <ExternalLinkPromptModal
          isOpen={promptModalOpen}
          content={promptContent.content}
          type={promptContent.type}
          onClose={() => setPromptModalOpen(false)}
        />
      )}
    </div>
  );
};
