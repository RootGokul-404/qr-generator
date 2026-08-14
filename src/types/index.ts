export type ModuleId =
  | 'dashboard'
  | 'qr-generator'
  | 'bulk-qr-generation'
  | 'sequence-qr-creator'
  | 'pigeon-hole-qr'
  | 'qr-scanner'
  | 'dairy-receiving'
  | 'dairy-putaway'
  | 'barcode-scanner'
  | 'product-search'
  | 'qr-history'
  | 'barcode-history'
  | 'settings';

export type QRStatus = 'Generated' | 'Scanned';

export interface QRHistoryRecord {
  id: string;
  image: string; // PNG Data URL or SVG string
  content: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  location: string;
  status: QRStatus;
  fileSize: string;
  createdBy: string;
  type: 'url' | 'email' | 'phone' | 'wifi' | 'geo' | 'json' | 'text';
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  metadata?: Record<string, any>;
}

export interface DairyReceivingRecord {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  product: string;
  quantity: number;
  unit: 'Liters' | 'Packets' | 'Crates' | 'Kg';
  batchNumber: string;
  receivedDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface DairyPutawayProduct {
  productName: string;
  ean: string;
  volume: string;
  brand: string;
}

export interface DairyPutawayRecord {
  id: string;
  productName: string;
  ean: string;
  expiryDate: string; // DDMMYY
  qrContent: string; // JSON string: { "ean": "...", "expiry": "..." }
  qrImage: string; // Data URL PNG
  generatedDate: string; // YYYY-MM-DD
  generatedTime: string; // HH:mm:ss
  createdBy: string;
}

export interface ProductMasterRecord {
  id: string;
  productName: string;
  brand: string;
  barcodeNumber: string; // EAN or UPC
  productImage: string;
  category: string;
  manufacturer: string;
  description: string;
  packageSize: string;
  status: 'Active' | 'Discontinued' | 'Seasonal';
  countryOfOrigin: string;
}

export interface BarcodeHistoryRecord {
  id: string;
  productName: string;
  barcodeNumber: string;
  productImage: string;
  date: string;
  time: string;
  status: 'Scanned' | 'Searched';
  category: string;
  brand: string;
  format?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'success' | 'info' | 'warning' | 'error';
  read: boolean;
  linkModule?: ModuleId;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  autoCopyOnScan: boolean;
  defaultLocation: string;
  currentUser: string;
  errorCorrectionDefault: 'L' | 'M' | 'Q' | 'H';
  defaultQRErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  defaultBarcodeType?: string;
  exportFormatPreference?: string;
}

export const PREDEFINED_PUTAWAY_PRODUCTS: DairyPutawayProduct[] = [
  {
    productName: 'Aavin Nice Milk – 500 ml',
    ean: '8904011301564',
    volume: '500 ml',
    brand: 'Aavin',
  },
  {
    productName: 'Aavin Green Magic Standardised Milk – 500 ml',
    ean: '8904011301595',
    volume: '500 ml',
    brand: 'Aavin',
  },
  {
    productName: 'Arokya Standardised Milk – 500 ml',
    ean: '8904057395107',
    volume: '500 ml',
    brand: 'Arokya',
  },
  {
    productName: 'Arokya Full Cream Milk – 500 ml',
    ean: '8904057395770',
    volume: '500 ml',
    brand: 'Arokya',
  },
  {
    productName: 'Arokya Toned Milk – 500 ml',
    ean: '8904057396166',
    volume: '500 ml',
    brand: 'Arokya',
  },
  {
    productName: 'Aavin Delight Milk – 500 ml',
    ean: '8904011301656',
    volume: '500 ml',
    brand: 'Aavin',
  },
  {
    productName: 'Aavin Pasteurised Full Cream Milk – 500 ml',
    ean: '8904011301601',
    volume: '500 ml',
    brand: 'Aavin',
  },
  {
    productName: 'Hatsun Cow Milk – 500 ml',
    ean: '8904057395794',
    volume: '500 ml',
    brand: 'Hatsun',
  },
];

export const INITIAL_PRODUCT_MASTER: ProductMasterRecord[] = [
  {
    id: 'pm-1',
    productName: 'Aavin Nice Milk – 500 ml',
    brand: 'Aavin',
    barcodeNumber: '8904011301564',
    productImage: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fluid Milk',
    manufacturer: 'Tamil Nadu Co-operative Milk Producers Federation Ltd (Aavin)',
    description: 'Toned pasteurised fresh milk enriched with Vitamin A and D. 3.0% Fat, 8.5% SNF.',
    packageSize: '500 ml Pouch',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-2',
    productName: 'Aavin Green Magic Standardised Milk – 500 ml',
    brand: 'Aavin',
    barcodeNumber: '8904011301595',
    productImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fluid Milk',
    manufacturer: 'Tamil Nadu Co-operative Milk Producers Federation Ltd (Aavin)',
    description: 'Standardised pasteurised milk ideal for tea, coffee, and curd preparation. 4.5% Fat, 8.5% SNF.',
    packageSize: '500 ml Pouch',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-3',
    productName: 'Arokya Standardised Milk – 500 ml',
    brand: 'Arokya',
    barcodeNumber: '8904057395107',
    productImage: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fluid Milk',
    manufacturer: 'Hatsun Agro Product Ltd',
    description: 'Rich, creamy standardised milk sourced from select dairy farms. 4.5% Fat, 8.5% SNF.',
    packageSize: '500 ml Pouch',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-4',
    productName: 'Arokya Full Cream Milk – 500 ml',
    brand: 'Arokya',
    barcodeNumber: '8904057395770',
    productImage: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fluid Milk',
    manufacturer: 'Hatsun Agro Product Ltd',
    description: 'Full cream dairy milk with extra richness for traditional sweets and desserts. 6.0% Fat, 9.0% SNF.',
    packageSize: '500 ml Pouch',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-5',
    productName: 'Arokya Toned Milk – 500 ml',
    brand: 'Arokya',
    barcodeNumber: '8904057396166',
    productImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fluid Milk',
    manufacturer: 'Hatsun Agro Product Ltd',
    description: 'Light and nutritious toned milk suitable for daily consumption. 3.0% Fat, 8.5% SNF.',
    packageSize: '500 ml Pouch',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-6',
    productName: 'Aavin Delight Milk – 500 ml',
    brand: 'Aavin',
    barcodeNumber: '8904011301656',
    productImage: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fluid Milk',
    manufacturer: 'Tamil Nadu Co-operative Milk Producers Federation Ltd (Aavin)',
    description: 'Delight homogenised milk with long shelf life when chilled. 3.5% Fat, 8.5% SNF.',
    packageSize: '500 ml Pouch',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-7',
    productName: 'Aavin Pasteurised Full Cream Milk – 500 ml',
    brand: 'Aavin',
    barcodeNumber: '8904011301601',
    productImage: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fluid Milk',
    manufacturer: 'Tamil Nadu Co-operative Milk Producers Federation Ltd (Aavin)',
    description: 'Premium orange pouch full cream milk with maximum cream content. 6.0% Fat, 9.0% SNF.',
    packageSize: '500 ml Pouch',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-8',
    productName: 'Hatsun Cow Milk – 500 ml',
    brand: 'Hatsun',
    barcodeNumber: '8904057395794',
    productImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fluid Milk',
    manufacturer: 'Hatsun Agro Product Ltd',
    description: 'Pure cow milk with natural sweetness and easy digestibility. 3.5% Fat, 8.5% SNF.',
    packageSize: '500 ml Pouch',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-9',
    productName: 'Amul Taaza Homogenised Milk – 1000 ml',
    brand: 'Amul',
    barcodeNumber: '8901262150020',
    productImage: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fluid Milk',
    manufacturer: 'Gujarat Co-operative Milk Marketing Federation Ltd',
    description: 'UHT treated homogenised toned milk in Tetra Pak.',
    packageSize: '1000 ml Carton',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-10',
    productName: 'Amul Pasteurised Butter – 100g',
    brand: 'Amul',
    barcodeNumber: '8901262010010',
    productImage: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Butter & Ghee',
    manufacturer: 'Gujarat Co-operative Milk Marketing Federation Ltd',
    description: 'Classic salted table butter made from fresh cream.',
    packageSize: '100 g Pack',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-11',
    productName: 'Aavin Pure Ghee – 500 ml',
    brand: 'Aavin',
    barcodeNumber: '8904011302011',
    productImage: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Butter & Ghee',
    manufacturer: 'Tamil Nadu Co-operative Milk Producers Federation Ltd (Aavin)',
    description: 'Traditional aromatic Agmark pure ghee prepared from dairy butter.',
    packageSize: '500 ml Jar',
    status: 'Active',
    countryOfOrigin: 'India',
  },
  {
    id: 'pm-12',
    productName: 'Hatsun Curd – 500g Pouch',
    brand: 'Hatsun',
    barcodeNumber: '8904057397026',
    productImage: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80',
    category: 'Dairy - Fermented Products',
    manufacturer: 'Hatsun Agro Product Ltd',
    description: 'Thick, fresh dahi cultured with beneficial lactic fermenters.',
    packageSize: '500 g Pouch',
    status: 'Active',
    countryOfOrigin: 'India',
  },
];
