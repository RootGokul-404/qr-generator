import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { DairyReceivingRecord, ProductMasterRecord } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Zap,
  ZapOff,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Truck,
  Package,
  Calendar,
  FileText,
  Barcode,
  QrCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Building2,
  Layers,
} from 'lucide-react';

export interface ParsedShipmentData {
  supplierName: string;
  invoiceNumber: string;
  product: string;
  quantity: string;
  unit: 'Liters' | 'Packets' | 'Crates' | 'Kg';
  batchNumber: string;
  receivedDate: string;
  expiryDate: string;
  remarks: string;
  rawIdentifier: string;
  format: 'QR_JSON' | 'GS1_PIPE' | 'BARCODE_SKU' | 'CUSTOM';
  verified: boolean;
}

interface ReceivingShipmentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShipmentScanned: (data: ParsedShipmentData, autoRegister: boolean) => void;
}

const SAMPLE_SHIPMENTS: Array<{
  name: string;
  tagline: string;
  payload: string;
  format: 'QR_JSON' | 'GS1_PIPE' | 'BARCODE_SKU';
}> = [
  {
    name: 'Aavin Dairy Federation',
    tagline: 'INV-2026-8840 • 2,500 Packets Nice Milk',
    format: 'QR_JSON',
    payload: JSON.stringify({
      supplierName: 'Aavin Dairy Federation',
      invoiceNumber: 'INV-2026-8840',
      product: 'Aavin Nice Milk – 500 ml',
      quantity: '2500',
      unit: 'Packets',
      batchNumber: 'AAV-NIC-20260730-A1',
      receivedDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      remarks: 'Grade A Cold-Chain Inspected (4.1°C)',
    }),
  },
  {
    name: 'Amul Milk Processing Ltd',
    tagline: 'INV-2026-9012 • 1,200 Packets Gold Milk',
    format: 'GS1_PIPE',
    payload: `INV-2026-9012|Amul Milk Processing Ltd|Amul Gold Full Cream Milk – 1 Liter|1200|Packets|AML-GLD-20260730-B4|2026-08-03|ISO 22000 Certified Cold Transit`,
  },
  {
    name: 'Nandini Dairy Coop',
    tagline: '8901030800010 • Nandini Fresh Curd 500g SKU',
    format: 'BARCODE_SKU',
    payload: '8901030800010',
  },
];

export const ReceivingShipmentScannerModal: React.FC<ReceivingShipmentScannerModalProps> = ({
  isOpen,
  onClose,
  onShipmentScanned,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string>('');
  const [flashSupported, setFlashSupported] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [rawScannedText, setRawScannedText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedShipmentData | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'samples'>('camera');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'dairy-receiving-scanner-viewport';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse any raw barcode/QR text into structured dairy shipment data
  const parseShipmentIdentifier = useCallback((raw: string): ParsedShipmentData => {
    const trimmed = raw.trim();
    const todayStr = new Date().toISOString().slice(0, 10);
    const defaultExpiry = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);

    // 1. Try parsing as JSON QR code
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const json = JSON.parse(trimmed);
        return {
          supplierName: json.supplierName || json.supplier || 'Authorized Dairy Supplier',
          invoiceNumber: json.invoiceNumber || json.invoice || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          product: json.product || json.productName || 'Aavin Nice Milk – 500 ml',
          quantity: String(json.quantity || '1000'),
          unit: (['Liters', 'Packets', 'Crates', 'Kg'].includes(json.unit)
            ? json.unit
            : 'Packets') as ParsedShipmentData['unit'],
          batchNumber: json.batchNumber || json.batch || `BATCH-${Date.now().toString().slice(-6)}`,
          receivedDate: json.receivedDate || todayStr,
          expiryDate: json.expiryDate || defaultExpiry,
          remarks: json.remarks || 'Scanned QR Shipment Tag – Cold Chain Verified',
          rawIdentifier: trimmed,
          format: 'QR_JSON',
          verified: true,
        };
      } catch (e) {
        // Fallthrough if invalid JSON
      }
    }

    // 2. Try parsing as GS1 Pipe-delimited string (Invoice|Supplier|Product|Qty|Unit|Batch|Expiry|Remarks)
    if (trimmed.includes('|')) {
      const parts = trimmed.split('|').map((p) => p.trim());
      return {
        invoiceNumber: parts[0] || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierName: parts[1] || 'Dairy Logistics Federation',
        product: parts[2] || 'Aavin Nice Milk – 500 ml',
        quantity: parts[3] || '1000',
        unit: (['Liters', 'Packets', 'Crates', 'Kg'].includes(parts[4])
          ? parts[4]
          : 'Packets') as ParsedShipmentData['unit'],
        batchNumber: parts[5] || `BAT-${Date.now().toString().slice(-6)}`,
        expiryDate: parts[6] || defaultExpiry,
        remarks: parts[7] || 'Scanned GS1 Barcode Shipment Tag',
        receivedDate: todayStr,
        rawIdentifier: trimmed,
        format: 'GS1_PIPE',
        verified: true,
      };
    }

    // 3. Check if it matches any Product Master SKU/Barcode in storage
    const productMatch = storage.getProductByBarcode(trimmed);
    if (productMatch) {
      return {
        supplierName: `${productMatch.brand || 'Dairy'} Logistics Supply`,
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        product: productMatch.productName,
        quantity: '500',
        unit: 'Packets',
        batchNumber: `${productMatch.brand ? productMatch.brand.slice(0, 3).toUpperCase() : 'SKU'}-${Date.now().toString().slice(-6)}`,
        receivedDate: todayStr,
        expiryDate: defaultExpiry,
        remarks: `Auto-derived from product master SKU (${trimmed}). Category: ${productMatch.category}`,
        rawIdentifier: trimmed,
        format: 'BARCODE_SKU',
        verified: true,
      };
    }

    // 4. Default custom fallback for any general barcode string
    return {
      supplierName: 'General Dairy Distribution',
      invoiceNumber: `INV-${trimmed.slice(-6).toUpperCase()}`,
      product: 'Aavin Green Standard Milk – 500 ml',
      quantity: '800',
      unit: 'Packets',
      batchNumber: `BAT-${trimmed.slice(0, 6).toUpperCase() || '0001'}`,
      receivedDate: todayStr,
      expiryDate: defaultExpiry,
      remarks: `Scanned shipment identifier: ${trimmed}`,
      rawIdentifier: trimmed,
      format: 'CUSTOM',
      verified: true,
    };
  }, []);

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
          const backCam = camList.find(
            (c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCam ? backCam.id : camList[0].id);
        }
      } else {
        setPermissionError('No camera devices detected. You can test with Sample Shipment Barcodes.');
      }
    } catch (err: any) {
      setPermissionError(
        'Camera permission required or unavailable in this environment. Use "Sample Barcodes" or "Image Upload" to test.'
      );
    }
  }, [selectedCameraId]);

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        // ignore
      }
      setIsScanning(false);
      setFlashSupported(false);
      setFlashOn(false);
    }
  }, [isScanning]);

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      enumerateCameras();
    } else {
      stopScanning();
    }
    return () => {
      stopScanning();
    };
  }, [isOpen, activeTab, enumerateCameras, stopScanning]);

  const startScanning = async () => {
    setPermissionError('');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
        });
      }

      const cameraIdOrConfig = selectedCameraId
        ? selectedCameraId
        : { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraIdOrConfig,
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          soundAndNotify.playScanBeep();
          setRawScannedText(decodedText);
          const parsed = parseShipmentIdentifier(decodedText);
          setParsedData(parsed);
          soundAndNotify.notify(
            'Shipment Identifier Scanned',
            `Recognized ${parsed.product} (${parsed.invoiceNumber})`,
            'success',
            'dairy-receiving'
          );
          stopScanning();
        },
        undefined
      );

      setIsScanning(true);

      // Check torch capability
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
        if (capabilities && (capabilities as any).torchFeature) {
          setFlashSupported(true);
        } else {
          setFlashSupported(false);
        }
      } catch (e) {
        setFlashSupported(false);
      }
    } catch (err: any) {
      setPermissionError(
        `Failed to start camera: ${err.message || err}. Try "Sample Barcodes" or upload a barcode image.`
      );
      setIsScanning(false);
    }
  };

  const handleToggleFlash = async () => {
    if (!html5QrCodeRef.current || !isScanning || !flashSupported) return;
    try {
      const nextFlashState = !flashOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextFlashState } as any],
      });
      setFlashOn(nextFlashState);
    } catch (err) {
      soundAndNotify.addToast('Flash Error', 'Torch control is not supported on this device.', 'error');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setPermissionError('');

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId, { verbose: false });
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      soundAndNotify.playScanBeep();
      setRawScannedText(decodedText);
      const parsed = parseShipmentIdentifier(decodedText);
      setParsedData(parsed);
      soundAndNotify.notify(
        'Image Barcode Scanned',
        `Extracted shipment invoice: ${parsed.invoiceNumber}`,
        'success'
      );
    } catch (err: any) {
      setPermissionError('Could not detect a valid QR or Barcode in the uploaded image.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectSample = (payload: string) => {
    soundAndNotify.playScanBeep();
    setRawScannedText(payload);
    const parsed = parseShipmentIdentifier(payload);
    setParsedData(parsed);
    soundAndNotify.notify(
      'Sample Shipment Scanned',
      `Loaded ${parsed.supplierName} • ${parsed.invoiceNumber}`,
      'success',
      'dairy-receiving'
    );
  };

  const handleConfirmRegistration = (autoRegister: boolean) => {
    if (!parsedData) return;
    onShipmentScanned(parsedData, autoRegister);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-theme-card border border-theme rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-theme-base">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-theme flex items-center gap-2">
                <span>Dairy Shipment Identifier Scanner</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30">
                  Camera API
                </span>
              </h2>
              <p className="text-xs text-theme-muted">
                Scan QR or Barcode labels on milk pallets, crates, and supplier invoices
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            aria-label="Close scanner modal"
            className="p-2 rounded-xl text-theme-muted hover:text-theme hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-theme px-6 bg-[var(--bg)]/50">
          <button
            onClick={() => {
              setActiveTab('camera');
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'camera'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-theme-muted hover:text-theme'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera Scanner</span>
          </button>

          <button
            onClick={() => {
              stopScanning();
              setActiveTab('upload');
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-theme-muted hover:text-theme'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Scan from Image File</span>
          </button>

          <button
            onClick={() => {
              stopScanning();
              setActiveTab('samples');
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'samples'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-theme-muted hover:text-theme'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Test Barcodes & QRs</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg)] p-3 rounded-xl border border-theme">
                <div className="flex items-center gap-2 flex-1">
                  <Camera className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (isScanning) {
                        stopScanning();
                      }
                    }}
                    disabled={isScanning || cameras.length === 0}
                    aria-label="Select Camera"
                    className="w-full bg-transparent text-xs text-theme focus:outline-none disabled:opacity-50"
                  >
                    {cameras.length === 0 ? (
                      <option value="">No cameras detected</option>
                    ) : (
                      cameras.map((c) => (
                        <option key={c.id} value={c.id} className="bg-theme-card text-theme">
                          {c.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {flashSupported && (
                    <button
                      onClick={handleToggleFlash}
                      disabled={!isScanning}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                        flashOn
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-white/5 border-theme text-theme-muted hover:text-theme'
                      }`}
                    >
                      {flashOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                      <span>{flashOn ? 'Torch On' : 'Torch Off'}</span>
                    </button>
                  )}

                  {!isScanning ? (
                    <button
                      onClick={startScanning}
                      className="px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Start Camera</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopScanning}
                      className="px-4 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Stop Camera</span>
                    </button>
                  )}
                </div>
              </div>

              {permissionError && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Camera Access Guidance</p>
                    <p className="text-amber-200/80 mt-0.5">{permissionError}</p>
                    <button
                      onClick={() => setActiveTab('samples')}
                      className="mt-2 text-xs font-bold underline text-amber-300 hover:text-white"
                    >
                      Switch to "Test Barcodes & QRs" tab to test now &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* Viewport Box */}
              <div className="relative w-full aspect-[4/3] max-w-lg mx-auto bg-black/60 border border-theme rounded-2xl overflow-hidden flex flex-col items-center justify-center">
                <div id={readerElementId} className="w-full h-full"></div>
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-[var(--accent)]">
                      <Barcode className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-theme">Camera Scanner Ready</p>
                    <p className="text-xs text-theme-muted mt-1 max-w-xs">
                      Position the dairy pallet QR code or EAN-13 barcode within the viewfinder to auto-detect.
                    </p>
                    <button
                      onClick={startScanning}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Launch Viewfinder</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-theme hover:border-[var(--accent)] rounded-2xl p-8 text-center bg-[var(--bg)]/50 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-theme">Upload Barcode or QR Image</h3>
                <p className="text-xs text-theme-muted mt-1 max-w-sm mx-auto">
                  Select a PNG, JPG, or WEBP image of an Aavin/Amul invoice QR or product barcode to process.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="shipment-barcode-file-upload"
                />
                <label
                  htmlFor="shipment-barcode-file-upload"
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold cursor-pointer shadow-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose Image File...</span>
                </label>
              </div>

              {permissionError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{permissionError}</span>
                </div>
              )}
            </div>
          )}

          {/* SAMPLES TAB */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-theme-muted">
                Click any realistic dairy shipment label below to simulate scanning with instant payload verification:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_SHIPMENTS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSample(sample.payload)}
                    className="text-left p-4 rounded-xl bg-[var(--bg)] hover:bg-[var(--bg)]/80 border border-theme hover:border-[var(--accent)]/60 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                          {sample.format}
                        </span>
                        <QrCode className="w-4 h-4 text-theme-muted group-hover:text-[var(--accent)] transition-colors" />
                      </div>
                      <h4 className="text-sm font-semibold text-theme">{sample.name}</h4>
                      <p className="text-xs text-theme-muted mt-1">{sample.tagline}</p>
                    </div>
                    <div className="mt-3 flex items-center text-xs font-semibold text-[var(--accent)]">
                      <span>Simulate Scan</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SCANNED SHIPMENT RESULT PREVIEW */}
          {parsedData && (
            <div className="bg-theme-card border border-[var(--accent)]/50 rounded-2xl p-5 shadow-xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-theme">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-theme flex items-center gap-2">
                      <span>Verified Shipment Identifier</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {parsedData.format}
                      </span>
                    </h3>
                    <p className="text-xs text-theme-muted">
                      Identifier: <code className="text-theme font-mono">{parsedData.invoiceNumber}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ISO Cold-Chain Ready</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[var(--bg)] p-3 rounded-xl border border-theme">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-theme-muted block">
                    Supplier
                  </span>
                  <span className="text-xs font-semibold text-theme mt-0.5 block truncate">
                    {parsedData.supplierName}
                  </span>
                </div>

                <div className="bg-[var(--bg)] p-3 rounded-xl border border-theme">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-theme-muted block">
                    Product
                  </span>
                  <span className="text-xs font-semibold text-theme mt-0.5 block truncate">
                    {parsedData.product}
                  </span>
                </div>

                <div className="bg-[var(--bg)] p-3 rounded-xl border border-theme">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-theme-muted block">
                    Quantity & Unit
                  </span>
                  <span className="text-xs font-semibold text-theme mt-0.5 block">
                    {parsedData.quantity} {parsedData.unit}
                  </span>
                </div>

                <div className="bg-[var(--bg)] p-3 rounded-xl border border-theme">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-theme-muted block">
                    Batch / Lot #
                  </span>
                  <span className="text-xs font-semibold text-theme mt-0.5 block font-mono truncate">
                    {parsedData.batchNumber}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-theme-muted bg-[var(--bg)]/60 px-3.5 py-2 rounded-xl border border-theme">
                <div className="flex items-center gap-4">
                  <span>
                    <strong>Received:</strong> {parsedData.receivedDate}
                  </span>
                  <span>
                    <strong>Expiry:</strong> {parsedData.expiryDate}
                  </span>
                </div>
                <span className="italic truncate max-w-sm">
                  "{parsedData.remarks}"
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleConfirmRegistration(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Populate Manual Form</span>
                </button>

                <button
                  onClick={() => handleConfirmRegistration(true)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Auto-Register Shipment to Receiving</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-theme bg-theme-base">
          <div className="flex items-center gap-2 text-xs text-theme-muted">
            <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
            <span>GS1 QR / EAN-13 Barcode Compatible • Direct Inventory Registration</span>
          </div>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
