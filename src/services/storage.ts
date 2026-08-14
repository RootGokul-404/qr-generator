import {
  QRHistoryRecord,
  DairyReceivingRecord,
  DairyPutawayRecord,
  ProductMasterRecord,
  BarcodeHistoryRecord,
  AppSettings,
  INITIAL_PRODUCT_MASTER,
} from '../types/index.ts';

const STORAGE_KEYS = {
  QR_HISTORY: 'dairy_app_qr_history_v1',
  DAIRY_RECEIVING: 'dairy_app_receiving_v1',
  DAIRY_PUTAWAY: 'dairy_app_putaway_v1',
  PRODUCT_MASTER: 'dairy_app_product_master_v1',
  BARCODE_HISTORY: 'dairy_app_barcode_history_v1',
  APP_SETTINGS: 'dairy_app_settings_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  notificationsEnabled: true,
  soundEnabled: true,
  autoCopyOnScan: true,
  defaultLocation: 'Dairy Warehouse A - Sector 4',
  currentUser: 'Supply Chain Manager',
  errorCorrectionDefault: 'M',
  defaultQRErrorCorrection: 'Q',
  defaultBarcodeType: 'EAN-13',
  exportFormatPreference: 'PNG',
};

// Seed sample QR history records
const INITIAL_QR_HISTORY: QRHistoryRecord[] = [
  {
    id: 'qrh-1',
    image: '', // Will be generated on demand or sample badge
    content: 'https://aavinmilk.com/quality-standards',
    date: '2026-07-30',
    time: '09:15:22',
    location: 'Dairy Warehouse A - Sector 4',
    status: 'Generated',
    fileSize: '1.8 KB',
    createdBy: 'Supply Chain Manager',
    type: 'url',
    errorCorrectionLevel: 'M',
  },
  {
    id: 'qrh-2',
    image: '',
    content: '{"ean":"8904011301564","expiry":"310726"}',
    date: '2026-07-30',
    time: '10:04:11',
    location: 'Cold Storage Bay 2',
    status: 'Generated',
    fileSize: '2.1 KB',
    createdBy: 'Putaway Supervisor',
    type: 'json',
    errorCorrectionLevel: 'Q',
    metadata: {
      ean: '8904011301564',
      expiry: '310726',
      productName: 'Aavin Nice Milk – 500 ml',
    },
  },
  {
    id: 'qrh-3',
    image: '',
    content: 'INV-2026-0789 - Batch AAV-9920 - Qty: 4500 Liters',
    date: '2026-07-29',
    time: '14:30:00',
    location: 'Receiving Dock 1',
    status: 'Scanned',
    fileSize: '2.0 KB',
    createdBy: 'Quality Control Inspector',
    type: 'text',
  },
];

// Seed sample Dairy Receiving records
const INITIAL_DAIRY_RECEIVING: DairyReceivingRecord[] = [
  {
    id: 'rec-101',
    supplierName: 'Salem District Milk Producers Union',
    invoiceNumber: 'INV-2026-0812',
    product: 'Aavin Nice Milk – 500 ml',
    quantity: 5000,
    unit: 'Packets',
    batchNumber: 'AAV-B2026-778',
    receivedDate: '2026-07-30',
    expiryDate: '2026-08-03',
    remarks: 'Quality grade A. Chilled transport verified at 3.8°C.',
    createdAt: '2026-07-30T08:30:00.000Z',
    updatedAt: '2026-07-30T08:30:00.000Z',
  },
  {
    id: 'rec-102',
    supplierName: 'Erode Cooperative Dairy Federation',
    invoiceNumber: 'INV-2026-0813',
    product: 'Arokya Standardised Milk – 500 ml',
    quantity: 3600,
    unit: 'Packets',
    batchNumber: 'AR-B2026-441',
    receivedDate: '2026-07-29',
    expiryDate: '2026-08-02',
    remarks: 'Standardised fat 4.5% verified by laboratory.',
    createdAt: '2026-07-29T10:15:00.000Z',
    updatedAt: '2026-07-29T10:15:00.000Z',
  },
  {
    id: 'rec-103',
    supplierName: 'Madurai Dairy Processing Plant',
    invoiceNumber: 'INV-2026-0815',
    product: 'Aavin Green Magic Standardised Milk – 500 ml',
    quantity: 4200,
    unit: 'Packets',
    batchNumber: 'AAV-GM-902',
    receivedDate: '2026-07-28',
    expiryDate: '2026-08-01',
    remarks: 'Received in clean insulated crates. No leaks observed.',
    createdAt: '2026-07-28T09:00:00.000Z',
    updatedAt: '2026-07-28T09:00:00.000Z',
  },
];

// Seed sample Dairy Putaway records
const INITIAL_DAIRY_PUTAWAY: DairyPutawayRecord[] = [
  {
    id: 'put-201',
    productName: 'Aavin Nice Milk – 500 ml',
    ean: '8904011301564',
    expiryDate: '310726',
    qrContent: '{"ean":"8904011301564","expiry":"310726"}',
    qrImage: '',
    generatedDate: '2026-07-30',
    generatedTime: '10:04:11',
    createdBy: 'Putaway Supervisor',
  },
  {
    id: 'put-202',
    productName: 'Arokya Full Cream Milk – 500 ml',
    ean: '8904057395770',
    expiryDate: '010826',
    qrContent: '{"ean":"8904057395770","expiry":"010826"}',
    qrImage: '',
    generatedDate: '2026-07-30',
    generatedTime: '11:20:45',
    createdBy: 'Putaway Supervisor',
  },
];

// Seed sample Barcode History
const INITIAL_BARCODE_HISTORY: BarcodeHistoryRecord[] = [
  {
    id: 'bch-1',
    productName: 'Aavin Nice Milk – 500 ml',
    barcodeNumber: '8904011301564',
    productImage: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
    date: '2026-07-30',
    time: '08:45:12',
    status: 'Scanned',
    category: 'Dairy - Fluid Milk',
    brand: 'Aavin',
    format: 'EAN-13',
  },
  {
    id: 'bch-2',
    productName: 'Arokya Standardised Milk – 500 ml',
    barcodeNumber: '8904057395107',
    productImage: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=400&q=80',
    date: '2026-07-29',
    time: '16:10:05',
    status: 'Searched',
    category: 'Dairy - Fluid Milk',
    brand: 'Arokya',
    format: 'EAN-13',
  },
];

class StorageService {
  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!localStorage.getItem(STORAGE_KEYS.PRODUCT_MASTER)) {
        localStorage.setItem(STORAGE_KEYS.PRODUCT_MASTER, JSON.stringify(INITIAL_PRODUCT_MASTER));
      }
      if (!localStorage.getItem(STORAGE_KEYS.QR_HISTORY)) {
        localStorage.setItem(STORAGE_KEYS.QR_HISTORY, JSON.stringify(INITIAL_QR_HISTORY));
      }
      if (!localStorage.getItem(STORAGE_KEYS.DAIRY_RECEIVING)) {
        localStorage.setItem(STORAGE_KEYS.DAIRY_RECEIVING, JSON.stringify(INITIAL_DAIRY_RECEIVING));
      }
      if (!localStorage.getItem(STORAGE_KEYS.DAIRY_PUTAWAY)) {
        localStorage.setItem(STORAGE_KEYS.DAIRY_PUTAWAY, JSON.stringify(INITIAL_DAIRY_PUTAWAY));
      }
      if (!localStorage.getItem(STORAGE_KEYS.BARCODE_HISTORY)) {
        localStorage.setItem(STORAGE_KEYS.BARCODE_HISTORY, JSON.stringify(INITIAL_BARCODE_HISTORY));
      }
      if (!localStorage.getItem(STORAGE_KEYS.APP_SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (e) {
      console.error('Storage init error:', e);
    }
  }

  // --- App Settings ---
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(updated));
    return updated;
  }

  // --- QR History ---
  getQRHistory(): QRHistoryRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QR_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addQRHistory(record: Omit<QRHistoryRecord, 'id'>): QRHistoryRecord {
    const records = this.getQRHistory();
    const newRecord: QRHistoryRecord = {
      ...record,
      id: 'qrh-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    records.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.QR_HISTORY, JSON.stringify(records));
    return newRecord;
  }

  deleteQRHistory(id: string): void {
    const records = this.getQRHistory().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.QR_HISTORY, JSON.stringify(records));
  }

  deleteMultipleQRHistory(ids: string[]): void {
    const records = this.getQRHistory().filter((r) => !ids.includes(r.id));
    localStorage.setItem(STORAGE_KEYS.QR_HISTORY, JSON.stringify(records));
  }

  clearQRHistory(): void {
    localStorage.setItem(STORAGE_KEYS.QR_HISTORY, JSON.stringify([]));
  }

  // --- Dairy Receiving CRUD ---
  getDairyReceiving(): DairyReceivingRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAIRY_RECEIVING);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addDairyReceiving(record: Omit<DairyReceivingRecord, 'id' | 'createdAt' | 'updatedAt'>): { success: boolean; record?: DairyReceivingRecord; error?: string } {
    const records = this.getDairyReceiving();
    // Duplicate invoice check
    const dup = records.find((r) => r.invoiceNumber.toLowerCase().trim() === record.invoiceNumber.toLowerCase().trim());
    if (dup) {
      return { success: false, error: `An invoice with number "${record.invoiceNumber}" already exists.` };
    }
    const now = new Date().toISOString();
    const newRecord: DairyReceivingRecord = {
      ...record,
      id: 'rec-' + Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    records.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.DAIRY_RECEIVING, JSON.stringify(records));
    return { success: true, record: newRecord };
  }

  updateDairyReceiving(id: string, updates: Partial<DairyReceivingRecord>): { success: boolean; record?: DairyReceivingRecord; error?: string } {
    const records = this.getDairyReceiving();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) {
      return { success: false, error: 'Record not found' };
    }
    // Check invoice duplicate if changed
    if (updates.invoiceNumber && updates.invoiceNumber !== records[idx].invoiceNumber) {
      const dup = records.find((r) => r.id !== id && r.invoiceNumber.toLowerCase() === updates.invoiceNumber?.toLowerCase());
      if (dup) {
        return { success: false, error: `An invoice with number "${updates.invoiceNumber}" already exists.` };
      }
    }
    records[idx] = {
      ...records[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.DAIRY_RECEIVING, JSON.stringify(records));
    return { success: true, record: records[idx] };
  }

  deleteDairyReceiving(id: string): void {
    const records = this.getDairyReceiving().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.DAIRY_RECEIVING, JSON.stringify(records));
  }

  // --- Dairy Putaway Records ---
  getDairyPutaway(): DairyPutawayRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAIRY_PUTAWAY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addDairyPutaway(record: Omit<DairyPutawayRecord, 'id'>): DairyPutawayRecord {
    const records = this.getDairyPutaway();
    const newRecord: DairyPutawayRecord = {
      ...record,
      id: 'put-' + Date.now(),
    };
    records.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.DAIRY_PUTAWAY, JSON.stringify(records));
    return newRecord;
  }

  deleteDairyPutaway(id: string): void {
    const records = this.getDairyPutaway().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.DAIRY_PUTAWAY, JSON.stringify(records));
  }

  // --- Product Master ---
  getProductMaster(): ProductMasterRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCT_MASTER);
      return data ? JSON.parse(data) : INITIAL_PRODUCT_MASTER;
    } catch {
      return INITIAL_PRODUCT_MASTER;
    }
  }

  getProductByBarcode(barcode: string): ProductMasterRecord | undefined {
    const products = this.getProductMaster();
    return products.find((p) => p.barcodeNumber.trim() === barcode.trim());
  }

  addProductMaster(product: Omit<ProductMasterRecord, 'id'>): { success: boolean; record?: ProductMasterRecord; error?: string } {
    const products = this.getProductMaster();
    const dup = products.find((p) => p.barcodeNumber.trim() === product.barcodeNumber.trim());
    if (dup) {
      return { success: false, error: `Product with barcode ${product.barcodeNumber} already exists in Product Master.` };
    }
    const newProd: ProductMasterRecord = {
      ...product,
      id: 'pm-' + Date.now(),
    };
    products.push(newProd);
    localStorage.setItem(STORAGE_KEYS.PRODUCT_MASTER, JSON.stringify(products));
    return { success: true, record: newProd };
  }

  // --- Barcode History ---
  getBarcodeHistory(): BarcodeHistoryRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BARCODE_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addBarcodeHistory(record: Omit<BarcodeHistoryRecord, 'id'>): BarcodeHistoryRecord {
    const records = this.getBarcodeHistory();
    const newRecord: BarcodeHistoryRecord = {
      ...record,
      id: 'bch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    records.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.BARCODE_HISTORY, JSON.stringify(records));
    return newRecord;
  }

  deleteBarcodeHistory(id: string): void {
    const records = this.getBarcodeHistory().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.BARCODE_HISTORY, JSON.stringify(records));
  }

  clearBarcodeHistory(): void {
    localStorage.setItem(STORAGE_KEYS.BARCODE_HISTORY, JSON.stringify([]));
  }

  // --- Backup & Restore ---
  exportDatabaseJSON(): string {
    const dump = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      qrHistory: this.getQRHistory(),
      dairyReceiving: this.getDairyReceiving(),
      dairyPutaway: this.getDairyPutaway(),
      productMaster: this.getProductMaster(),
      barcodeHistory: this.getBarcodeHistory(),
      settings: this.getSettings(),
    };
    return JSON.stringify(dump, null, 2);
  }

  importDatabaseJSON(jsonStr: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonStr);
      if (data.qrHistory && Array.isArray(data.qrHistory)) {
        localStorage.setItem(STORAGE_KEYS.QR_HISTORY, JSON.stringify(data.qrHistory));
      }
      if (data.dairyReceiving && Array.isArray(data.dairyReceiving)) {
        localStorage.setItem(STORAGE_KEYS.DAIRY_RECEIVING, JSON.stringify(data.dairyReceiving));
      }
      if (data.dairyPutaway && Array.isArray(data.dairyPutaway)) {
        localStorage.setItem(STORAGE_KEYS.DAIRY_PUTAWAY, JSON.stringify(data.dairyPutaway));
      }
      if (data.productMaster && Array.isArray(data.productMaster)) {
        localStorage.setItem(STORAGE_KEYS.PRODUCT_MASTER, JSON.stringify(data.productMaster));
      }
      if (data.barcodeHistory && Array.isArray(data.barcodeHistory)) {
        localStorage.setItem(STORAGE_KEYS.BARCODE_HISTORY, JSON.stringify(data.barcodeHistory));
      }
      if (data.settings) {
        localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(data.settings));
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Invalid backup file format' };
    }
  }

  resetToDefaultSeed(): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCT_MASTER, JSON.stringify(INITIAL_PRODUCT_MASTER));
    localStorage.setItem(STORAGE_KEYS.QR_HISTORY, JSON.stringify(INITIAL_QR_HISTORY));
    localStorage.setItem(STORAGE_KEYS.DAIRY_RECEIVING, JSON.stringify(INITIAL_DAIRY_RECEIVING));
    localStorage.setItem(STORAGE_KEYS.DAIRY_PUTAWAY, JSON.stringify(INITIAL_DAIRY_PUTAWAY));
    localStorage.setItem(STORAGE_KEYS.BARCODE_HISTORY, JSON.stringify(INITIAL_BARCODE_HISTORY));
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }

  factoryReset(): void {
    this.resetToDefaultSeed();
  }
}

export const storage = new StorageService();
