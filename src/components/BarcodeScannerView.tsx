import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import { ProductMasterRecord } from '../types/index.ts';
import {
  Barcode,
  Camera,
  CameraOff,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Package,
  Factory,
  Globe,
  Tag,
  Search,
  Upload,
  RefreshCw,
} from 'lucide-react';

export const BarcodeScannerView: React.FC = () => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string>('');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [detectedFormat, setDetectedFormat] = useState<string>('EAN-13');
  const [foundProduct, setFoundProduct] = useState<ProductMasterRecord | null>(null);
  const [isUnknownProduct, setIsUnknownProduct] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'vesta-barcode-reader-viewport';
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const handleBarcodeScan = (barcodeStr: string, formatName: string = 'EAN-13') => {
    const cleanStr = barcodeStr.trim();
    setScannedBarcode(cleanStr);
    setDetectedFormat(formatName);

    const match = storage.getProductByBarcode(cleanStr);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (match) {
      setFoundProduct(match);
      setIsUnknownProduct(false);

      storage.addBarcodeHistory({
        productName: match.productName,
        barcodeNumber: cleanStr,
        productImage: match.productImage,
        date: now.toISOString().slice(0, 10),
        time: timeStr,
        status: 'Scanned',
        category: match.category,
        brand: match.brand,
        format: formatName,
      });

      soundAndNotify.playScanBeep();
      soundAndNotify.notify('Barcode Recognized', `Scanned: ${match.productName}`, 'success');
    } else {
      setFoundProduct(null);
      setIsUnknownProduct(true);

      storage.addBarcodeHistory({
        productName: 'Unknown Product / Unregistered Barcode',
        barcodeNumber: cleanStr,
        productImage: '',
        date: now.toISOString().slice(0, 10),
        time: timeStr,
        status: 'Scanned',
        category: 'Unclassified',
        brand: 'Unknown',
        format: formatName,
      });

      soundAndNotify.playScanBeep();
      soundAndNotify.notify(
        'Unknown Barcode',
        `Barcode ${cleanStr} is not registered in Product Master.`,
        'warning'
      );
    }
  };

  const startCamera = async () => {
    setPermissionError('');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        });
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.33,
        },
        onScanSuccess,
        undefined
      );

      setIsScanning(true);
    } catch (err: any) {
      setPermissionError(
        'Could not access camera for barcode scanning: ' +
          (err?.message || 'Permission denied or no device.')
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {
        // ignore
      }
      setIsScanning(false);
    }
  };

  const onScanSuccess = (decodedText: string, result: any) => {
    const nowTs = Date.now();
    if (decodedText === lastScannedRef.current.code && nowTs - lastScannedRef.current.time < 3000) {
      return;
    }
    lastScannedRef.current = { code: decodedText, time: nowTs };

    let formatName = 'EAN-13';
    if (result && result.result && result.result.format) {
      formatName = result.result.format.formatName || 'EAN-13';
    }

    handleBarcodeScan(decodedText, formatName);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Quick simulation triggers for testing Product Master barcodes immediately
  const sampleBarcodes = [
    { name: 'Aavin Nice Milk 500ml', code: '8904011301564', format: 'EAN-13' },
    { name: 'Arokya Full Cream Milk', code: '8904057395770', format: 'EAN-13' },
    { name: 'Amul Taaza Milk 1L', code: '8901262150020', format: 'EAN-13' },
    { name: 'Hatsun Curd 500g', code: '8904057397026', format: 'EAN-13' },
    { name: 'Unregistered Barcode Example', code: '0001234567890', format: 'UPC-A' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Barcode Camera Viewport & Demo Triggers */}
      <div className="lg:col-span-7 bg-theme-card border border-theme rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
              <Barcode className="w-5 h-5 text-[var(--accent)]" />
              <span>Multi-Format Barcode Scanner</span>
            </h2>
            <p className="text-xs text-theme-muted mt-0.5">
              Supports EAN-13, EAN-8, UPC-A, UPC-E, Code-39, Code-128, and QR with Product Master lookup.
            </p>
          </div>
          <button
            onClick={isScanning ? stopCamera : startCamera}
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
                <span>Start Barcode Camera</span>
              </>
            )}
          </button>
        </div>

        {permissionError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="flex-1">{permissionError}</p>
            <button
              onClick={startCamera}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-semibold text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Viewport */}
        <div className="relative w-full aspect-video max-h-[380px] bg-black rounded-2xl overflow-hidden border border-theme flex items-center justify-center">
          <div id={readerElementId} className="w-full h-full object-cover"></div>
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--card)]/90 backdrop-blur-xs text-center p-6">
              <Barcode className="w-12 h-12 text-theme-muted opacity-60" />
              <div>
                <p className="text-sm font-semibold text-theme">Barcode camera standby</p>
                <p className="text-xs text-theme-muted mt-1">
                  Click "Start Barcode Camera" or test instantly with sample barcodes below.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Simulation Barcodes */}
        <div className="p-4 rounded-xl bg-[var(--bg)] border border-theme flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme uppercase tracking-wider">
              Quick Test Barcodes (Product Master Lookup)
            </span>
            <span className="text-[10px] text-theme-muted">Click any to simulate instant scan</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleBarcodes.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleBarcodeScan(item.code, item.format)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-theme text-xs font-medium text-theme transition-colors flex items-center gap-1.5"
              >
                <Barcode className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{item.name}</span>
                <span className="font-mono text-[10px] text-theme-muted">[{item.code}]</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Scanned Product Master Details Card */}
      <div className="lg:col-span-5 bg-theme-card border border-theme rounded-2xl p-6 flex flex-col justify-between gap-6">
        <div>
          <div className="flex items-center justify-between border-b border-theme pb-3">
            <h3 className="text-sm font-semibold text-theme">Product Master Result</h3>
            {scannedBarcode && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-mono">
                {detectedFormat} • {scannedBarcode}
              </span>
            )}
          </div>

          {foundProduct ? (
            <div className="mt-5 space-y-4 animate-in fade-in duration-200">
              {/* Image & Header */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg)] border border-theme">
                <img
                  src={foundProduct.productImage}
                  alt={foundProduct.productName}
                  className="w-20 h-20 rounded-xl object-cover border border-theme shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-theme">{foundProduct.productName}</h4>
                  <p className="text-xs text-[var(--accent)] font-semibold mt-0.5">
                    {foundProduct.brand}
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                    {foundProduct.status}
                  </span>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-theme">
                  <span className="text-theme-muted block flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Barcode Number</span>
                  </span>
                  <span className="font-mono font-semibold text-theme mt-1 block">
                    {foundProduct.barcodeNumber}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-theme">
                  <span className="text-theme-muted block flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    <span>Package Size</span>
                  </span>
                  <span className="font-semibold text-theme mt-1 block">
                    {foundProduct.packageSize}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-theme">
                  <span className="text-theme-muted block flex items-center gap-1">
                    <Factory className="w-3.5 h-3.5" />
                    <span>Manufacturer</span>
                  </span>
                  <span className="font-medium text-theme mt-1 block truncate">
                    {foundProduct.manufacturer}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-theme">
                  <span className="text-theme-muted block flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Country of Origin</span>
                  </span>
                  <span className="font-semibold text-theme mt-1 block">
                    {foundProduct.countryOfOrigin}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-theme text-xs">
                <span className="text-theme-muted font-semibold uppercase block mb-1">
                  Product Description
                </span>
                <p className="text-theme leading-relaxed">{foundProduct.description}</p>
              </div>
            </div>
          ) : isUnknownProduct ? (
            <div className="mt-6 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3 animate-in fade-in duration-200">
              <HelpCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-amber-300">
                  Product information not available.
                </h4>
                <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                  Barcode <strong className="font-mono text-theme">{scannedBarcode}</strong> was
                  scanned, but it does not match any registered item in Product Master.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-theme-muted">
              <Barcode className="w-10 h-10 mx-auto opacity-30 mb-3" />
              <p className="text-xs font-medium">Scan any barcode to view product details</p>
              <p className="text-[11px] opacity-75 mt-1">
                EAN-13, UPC, Code-128, and QR formats supported.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-theme text-xs text-theme-muted flex items-center justify-between">
          <span>Zero-crash lookup engine</span>
          <span className="text-[var(--success)] font-medium">Auto-recorded to Barcode History</span>
        </div>
      </div>
    </div>
  );
};
