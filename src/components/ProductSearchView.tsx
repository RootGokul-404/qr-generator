import React, { useState, useEffect, useMemo } from 'react';
import { ProductMasterRecord } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import {
  generateBarcodeDataURL,
  generateBarcodeSVGString,
} from '../services/barcodeUtils.ts';
import { downloadFile, shareContent, printImageElement } from '../services/qrUtils.ts';
import {
  Search,
  Filter,
  Mic,
  MicOff,
  Download,
  Share2,
  Printer,
  Barcode,
  Clock,
  X,
  Package,
  Tag,
  FileCode,
} from 'lucide-react';

export const ProductSearchView: React.FC = () => {
  const [products, setProducts] = useState<ProductMasterRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Aavin Nice Milk',
    'Arokya Standardised Milk',
    '8904011301564',
  ]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductMasterRecord | null>(null);

  useEffect(() => {
    const list = storage.getProductMaster();
    setProducts(list);
    if (list.length > 0) {
      setSelectedProduct(list[0]);
    }
  }, []);

  const categories = useMemo(() => {
    const s = new Set(products.map((p) => p.category));
    return ['ALL', ...Array.from(s)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        p.productName.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.barcodeNumber.includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, categoryFilter]);

  const handleSearchSubmit = (term: string) => {
    setSearchQuery(term);
    if (term.trim() && !recentSearches.includes(term.trim())) {
      setRecentSearches((prev) => [term.trim(), ...prev.slice(0, 4)]);
    }
  };

  // Voice Search (SpeechRecognition API)
  const toggleVoiceSearch = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      soundAndNotify.addToast(
        'Voice Search Unsupported',
        'Your browser does not support Speech Recognition.',
        'warning'
      );
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognizer = new SpeechRecognitionClass();
      recognizer.lang = 'en-US';
      recognizer.continuous = false;
      recognizer.onstart = () => setIsListening(true);
      recognizer.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSearchSubmit(transcript);
        setIsListening(false);
        soundAndNotify.notify('Voice Input', `Searched for: "${transcript}"`, 'info');
      };
      recognizer.onerror = () => setIsListening(false);
      recognizer.onend = () => setIsListening(false);
      recognizer.start();
    } catch {
      setIsListening(false);
    }
  };

  // Barcode export handlers for the selected product
  const getSelectedBarcodePngUrl = () => {
    if (!selectedProduct) return '';
    return generateBarcodeDataURL(selectedProduct.barcodeNumber, 'EAN13', {
      width: 2,
      height: 80,
    });
  };

  const getSelectedBarcodeSvgStr = () => {
    if (!selectedProduct) return '';
    return generateBarcodeSVGString(selectedProduct.barcodeNumber, 'EAN13');
  };

  const handleDownloadPng = () => {
    if (!selectedProduct) return;
    const url = getSelectedBarcodePngUrl();
    const fname = `barcode_${selectedProduct.barcodeNumber}.png`;
    downloadFile(url, fname, false);
    soundAndNotify.notify('Barcode PNG Downloaded', `Saved ${fname}`, 'success');
  };

  const handleDownloadSvg = () => {
    if (!selectedProduct) return;
    const svg = getSelectedBarcodeSvgStr();
    const fname = `barcode_${selectedProduct.barcodeNumber}.svg`;
    downloadFile(svg, fname, true);
    soundAndNotify.notify('Barcode SVG Downloaded', `Saved ${fname}`, 'success');
  };

  const handleShareProduct = async () => {
    if (!selectedProduct) return;
    const text = `${selectedProduct.productName} (${selectedProduct.brand}) - Barcode: ${selectedProduct.barcodeNumber}`;
    const ok = await shareContent(`Vesta Product: ${selectedProduct.productName}`, text);
    if (ok) {
      soundAndNotify.notify('Shared', 'Product details shared', 'info');
    } else {
      soundAndNotify.addToast('Share info', 'Web Share unsupported on this browser.', 'info');
    }
  };

  const handlePrintBarcode = () => {
    if (!selectedProduct) return;
    const url = getSelectedBarcodePngUrl();
    printImageElement(
      url,
      `Barcode: ${selectedProduct.productName} [${selectedProduct.barcodeNumber}]`
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="bg-theme-card border border-theme rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
            <Search className="w-5 h-5 text-[var(--accent)]" />
            <span>Product Search & Auto-Barcode Generation</span>
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Search dairy Product Master by name, brand, or barcode with instant PNG/SVG barcode rendering.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoiceSearch}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-2 ${
              isListening
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                : 'bg-white/5 border-theme text-theme-muted hover:text-theme'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[var(--accent)]" />}
            <span>{isListening ? 'Listening...' : 'Voice Search'}</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="bg-theme-card border border-theme rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchSubmit(e.target.value)}
              placeholder="Search products by name, brand, category, or EAN number..."
              className="w-full bg-[var(--bg)] border border-theme rounded-xl pl-10 pr-4 py-3 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg)] border border-theme rounded-xl px-3 py-3">
            <Filter className="w-4 h-4 text-theme-muted" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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

        {/* Recent Search Pills */}
        {recentSearches.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-theme-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Recent:</span>
            </span>
            {recentSearches.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSearchSubmit(s)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-theme text-theme transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Left List, Right Detailed Product & Auto Barcode Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Results List */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="text-xs font-semibold text-theme-muted flex items-center justify-between px-1">
            <span>
              Matching Products ({filteredProducts.length})
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-theme-card border border-theme rounded-2xl p-12 text-center text-theme-muted">
              <Package className="w-10 h-10 mx-auto opacity-30 mb-3" />
              <p className="text-sm font-semibold text-theme">No products match your search</p>
              <p className="text-xs mt-1">Try searching for "Aavin", "Arokya", "500 ml", or an EAN number.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-[var(--accent)]/10 border-[var(--accent)] shadow-lg'
                        : 'bg-theme-card border-theme hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.productImage}
                        alt={p.productName}
                        className="w-12 h-12 rounded-xl object-cover border border-theme shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-theme truncate">{p.productName}</h4>
                        <p className="text-xs text-[var(--accent)] font-medium mt-0.5">{p.brand}</p>
                        <span className="inline-block mt-1 text-[10px] text-theme-muted font-mono">
                          EAN: {p.barcodeNumber}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/5 border border-theme text-theme shrink-0">
                      {p.packageSize}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Product & Automatically Generated Barcode */}
        <div className="lg:col-span-5 bg-theme-card border border-theme rounded-2xl p-6 flex flex-col justify-between gap-6">
          {selectedProduct ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-theme pb-3">
                <h3 className="text-sm font-semibold text-theme">Product Details & Barcode</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                  {selectedProduct.status}
                </span>
              </div>

              {/* Product Header */}
              <div className="flex items-center gap-4">
                <img
                  src={selectedProduct.productImage}
                  alt={selectedProduct.productName}
                  className="w-20 h-20 rounded-2xl object-cover border border-theme shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <div>
                  <h4 className="text-base font-semibold text-theme">
                    {selectedProduct.productName}
                  </h4>
                  <p className="text-xs text-[var(--accent)] font-semibold mt-0.5">
                    {selectedProduct.brand} • {selectedProduct.category}
                  </p>
                  <p className="text-xs text-theme-muted mt-1">{selectedProduct.packageSize}</p>
                </div>
              </div>

              {/* Automatically Generated Barcode Box */}
              <div className="p-5 rounded-2xl bg-white border border-theme flex flex-col items-center justify-center shadow-lg">
                <img
                  src={getSelectedBarcodePngUrl()}
                  alt="Generated Barcode"
                  className="max-h-24 w-auto object-contain"
                />
                <div className="mt-2 text-black font-bold text-xs tracking-wider font-mono">
                  EAN-13: {selectedProduct.barcodeNumber}
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg)] border border-theme">
                  <span className="text-theme-muted block">Manufacturer</span>
                  <span className="font-semibold text-theme mt-0.5 block truncate">
                    {selectedProduct.manufacturer}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg)] border border-theme">
                  <span className="text-theme-muted block">Country of Origin</span>
                  <span className="font-semibold text-theme mt-0.5 block">
                    {selectedProduct.countryOfOrigin}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-theme text-xs">
                <span className="text-theme-muted font-semibold uppercase block mb-1">
                  Description
                </span>
                <p className="text-theme leading-relaxed">{selectedProduct.description}</p>
              </div>

              {/* Actions Bar */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDownloadPng}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-[var(--accent)]" />
                    <span>Download PNG</span>
                  </button>
                  <button
                    onClick={handleDownloadSvg}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center justify-center gap-2"
                  >
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span>Download SVG</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleShareProduct}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-medium text-theme transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Details</span>
                  </button>
                  <button
                    onClick={handlePrintBarcode}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-medium text-theme transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Barcode</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-theme-muted">
              <Package className="w-10 h-10 mx-auto opacity-30 mb-3" />
              <p className="text-xs font-medium">Select any product on the left to view specs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
