import React, { useState, useEffect, useMemo } from 'react';
import { DairyReceivingRecord } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import { ConfirmDialog } from './common/ConfirmDialog.tsx';
import { ReceivingShipmentScannerModal, ParsedShipmentData } from './ReceivingShipmentScannerModal.tsx';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  X,
  AlertCircle,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  QrCode,
} from 'lucide-react';

export const DairyReceivingView: React.FC = () => {
  const [records, setRecords] = useState<DairyReceivingRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'receivedDate' | 'supplierName' | 'quantity'>('receivedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Confirm Delete State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form Fields
  const [supplierName, setSupplierName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [product, setProduct] = useState<string>('Aavin Nice Milk – 500 ml');
  const [quantity, setQuantity] = useState<string>('1000');
  const [unit, setUnit] = useState<'Liters' | 'Packets' | 'Crates' | 'Kg'>('Packets');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [expiryDate, setExpiryDate] = useState<string>(
    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
  );
  const [remarks, setRemarks] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  const loadData = () => {
    setRecords(storage.getDairyReceiving());
  };

  const handleShipmentScanned = (data: ParsedShipmentData, autoRegister: boolean) => {
    if (autoRegister) {
      storage.addDairyReceiving({
        supplierName: data.supplierName,
        invoiceNumber: data.invoiceNumber,
        product: data.product,
        quantity: Number(data.quantity) || 1000,
        unit: data.unit,
        batchNumber: data.batchNumber,
        receivedDate: data.receivedDate,
        expiryDate: data.expiryDate,
        remarks: data.remarks,
      });
      soundAndNotify.notify(
        'Shipment Auto-Registered',
        `Invoice ${data.invoiceNumber} from ${data.supplierName} added to receiving table.`,
        'success',
        'dairy-receiving'
      );
      loadData();
    } else {
      setSupplierName(data.supplierName);
      setInvoiceNumber(data.invoiceNumber);
      setProduct(data.product);
      setQuantity(data.quantity);
      setUnit(data.unit);
      setBatchNumber(data.batchNumber);
      setReceivedDate(data.receivedDate);
      setExpiryDate(data.expiryDate);
      setRemarks(data.remarks);
      setModalMode('add');
      setSelectedId(null);
      setFormError('');
      setIsModalOpen(true);
      soundAndNotify.addToast('Form Populated', 'Scanned identifier data loaded into manual entry form.', 'info');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Suppliers list for filtering
  const suppliersList = useMemo(() => {
    const s = new Set(records.map((r) => r.supplierName));
    return ['ALL', ...Array.from(s)];
  }, [records]);

  // Filter & Sort
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          r.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSupplier = supplierFilter === 'ALL' || r.supplierName === supplierFilter;
        return matchesSearch && matchesSupplier;
      })
      .sort((a, b) => {
        if (sortField === 'quantity') {
          return sortOrder === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
        }
        if (sortField === 'supplierName') {
          return sortOrder === 'asc'
            ? a.supplierName.localeCompare(b.supplierName)
            : b.supplierName.localeCompare(a.supplierName);
        }
        return sortOrder === 'asc'
          ? a.receivedDate.localeCompare(b.receivedDate)
          : b.receivedDate.localeCompare(a.receivedDate);
      });
  }, [records, searchQuery, supplierFilter, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const openAddModal = () => {
    setModalMode('add');
    setSelectedId(null);
    setSupplierName('');
    setInvoiceNumber('INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
    setProduct('Aavin Nice Milk – 500 ml');
    setQuantity('1000');
    setUnit('Packets');
    setBatchNumber('AAV-B' + Math.floor(100 + Math.random() * 900));
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setExpiryDate(new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10));
    setRemarks('Standard chilled delivery verified at 3.9°C.');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (r: DairyReceivingRecord) => {
    setModalMode('edit');
    setSelectedId(r.id);
    setSupplierName(r.supplierName);
    setInvoiceNumber(r.invoiceNumber);
    setProduct(r.product);
    setQuantity(String(r.quantity));
    setUnit(r.unit);
    setBatchNumber(r.batchNumber);
    setReceivedDate(r.receivedDate);
    setExpiryDate(r.expiryDate);
    setRemarks(r.remarks || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const openViewModal = (r: DairyReceivingRecord) => {
    setModalMode('view');
    setSelectedId(r.id);
    setSupplierName(r.supplierName);
    setInvoiceNumber(r.invoiceNumber);
    setProduct(r.product);
    setQuantity(String(r.quantity));
    setUnit(r.unit);
    setBatchNumber(r.batchNumber);
    setReceivedDate(r.receivedDate);
    setExpiryDate(r.expiryDate);
    setRemarks(r.remarks || 'No remarks provided.');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!supplierName.trim() || !invoiceNumber.trim() || !product.trim() || !batchNumber.trim()) {
      setFormError('Supplier Name, Invoice Number, Product, and Batch Number are required.');
      return;
    }
    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setFormError('Quantity must be a positive number greater than 0.');
      return;
    }
    if (new Date(expiryDate) < new Date(receivedDate)) {
      setFormError('Expiry Date cannot be earlier than Received Date.');
      return;
    }

    if (modalMode === 'add') {
      const result = storage.addDairyReceiving({
        supplierName: supplierName.trim(),
        invoiceNumber: invoiceNumber.trim(),
        product: product.trim(),
        quantity: qtyNum,
        unit,
        batchNumber: batchNumber.trim(),
        receivedDate,
        expiryDate,
        remarks: remarks.trim(),
      });
      if (!result.success) {
        setFormError(result.error || 'Failed to save record.');
        return;
      }
      soundAndNotify.notify('Receiving Added', `Invoice ${invoiceNumber} added successfully.`, 'success', 'dairy-receiving');
    } else if (modalMode === 'edit' && selectedId) {
      const result = storage.updateDairyReceiving(selectedId, {
        supplierName: supplierName.trim(),
        invoiceNumber: invoiceNumber.trim(),
        product: product.trim(),
        quantity: qtyNum,
        unit,
        batchNumber: batchNumber.trim(),
        receivedDate,
        expiryDate,
        remarks: remarks.trim(),
      });
      if (!result.success) {
        setFormError(result.error || 'Failed to update record.');
        return;
      }
      soundAndNotify.notify('Receiving Updated', `Invoice ${invoiceNumber} updated successfully.`, 'success', 'dairy-receiving');
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteId) return;
    storage.deleteDairyReceiving(confirmDeleteId);
    setConfirmDeleteId(null);
    soundAndNotify.addToast('Record Deleted', 'Receiving entry removed from database.', 'info');
    loadData();
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      soundAndNotify.addToast('No Data', 'No receiving records match current filter', 'warning');
      return;
    }
    const headers = [
      'ID',
      'Supplier Name',
      'Invoice Number',
      'Product',
      'Quantity',
      'Unit',
      'Batch Number',
      'Received Date',
      'Expiry Date',
      'Remarks',
    ];
    const rows = filteredRecords.map((r) => [
      r.id,
      `"${r.supplierName.replace(/"/g, '""')}"`,
      r.invoiceNumber,
      `"${r.product.replace(/"/g, '""')}"`,
      r.quantity,
      r.unit,
      r.batchNumber,
      r.receivedDate,
      r.expiryDate,
      `"${r.remarks.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dairy_receiving_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundAndNotify.addToast('Export Successful', 'Downloaded dairy receiving CSV.', 'success');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar */}
      <div className="bg-theme-card border border-theme rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
            <Truck className="w-5 h-5 text-[var(--accent)]" />
            <span>Dairy Receiving Management</span>
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Register incoming milk deliveries, invoices, batch numbers, and lab verification notes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 border border-[var(--accent)]/40 text-xs font-bold text-[var(--accent)] transition-colors flex items-center gap-2 shadow-sm"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Shipment Identifier</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-theme text-xs font-semibold text-theme transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[var(--accent)]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-theme-accent hover:bg-[var(--accent-hover)] text-xs font-semibold text-white transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Receiving Record</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-theme-card border border-theme rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by supplier, invoice, product, or batch number..."
            className="w-full bg-[var(--bg)] border border-theme rounded-xl pl-10 pr-4 py-2 text-xs text-theme focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-theme rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-theme-muted" />
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs text-theme focus:outline-none"
            >
              {suppliersList.map((sup) => (
                <option key={sup} value={sup} className="bg-[var(--card)] text-theme">
                  {sup === 'ALL' ? 'All Suppliers' : sup}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-theme rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-theme-muted" />
            <select
              value={`${sortField}_${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('_');
                setSortField(field as any);
                setSortOrder(order as any);
              }}
              className="bg-transparent text-xs text-theme focus:outline-none"
            >
              <option value="receivedDate_desc" className="bg-[var(--card)]">Date (Newest First)</option>
              <option value="receivedDate_asc" className="bg-[var(--card)]">Date (Oldest First)</option>
              <option value="quantity_desc" className="bg-[var(--card)]">Quantity (High to Low)</option>
              <option value="quantity_asc" className="bg-[var(--card)]">Quantity (Low to High)</option>
              <option value="supplierName_asc" className="bg-[var(--card)]">Supplier (A to Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Receiving Table */}
      <div className="bg-theme-card border border-theme rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-theme text-theme-muted bg-white/[0.02]">
                <th className="p-4 font-medium">Invoice #</th>
                <th className="p-4 font-medium">Supplier</th>
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Batch #</th>
                <th className="p-4 font-medium">Quantity</th>
                <th className="p-4 font-medium">Received Date</th>
                <th className="p-4 font-medium">Expiry Date</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-theme-muted">
                    No dairy receiving records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-mono font-medium text-[var(--accent)]">
                      {r.invoiceNumber}
                    </td>
                    <td className="p-4 font-semibold text-theme">{r.supplierName}</td>
                    <td className="p-4 text-theme">{r.product}</td>
                    <td className="p-4 font-mono text-theme-muted">{r.batchNumber}</td>
                    <td className="p-4 font-semibold text-theme">
                      {r.quantity.toLocaleString()} <span className="text-theme-muted font-normal">{r.unit}</span>
                    </td>
                    <td className="p-4 text-theme-muted">{r.receivedDate}</td>
                    <td className="p-4 text-theme-muted">{r.expiryDate}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openViewModal(r)}
                          className="p-1.5 rounded-lg text-theme-muted hover:text-theme hover:bg-white/5 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded-lg text-theme-muted hover:text-[var(--accent)] hover:bg-white/5 transition-colors"
                          title="Edit Record"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-1.5 rounded-lg text-theme-muted hover:text-red-400 hover:bg-white/5 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-theme flex items-center justify-between text-xs text-theme-muted">
          <span>
            Showing <strong className="text-theme">{paginatedRecords.length}</strong> of{' '}
            <strong className="text-theme">{filteredRecords.length}</strong> records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-theme transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-theme">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-theme transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit / View Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-theme-card border border-theme rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-theme pb-4">
              <h3 className="text-base font-semibold text-theme flex items-center gap-2">
                {modalMode === 'add' && <Plus className="w-5 h-5 text-[var(--accent)]" />}
                {modalMode === 'edit' && <Edit className="w-5 h-5 text-[var(--accent)]" />}
                {modalMode === 'view' && <Eye className="w-5 h-5 text-[var(--accent)]" />}
                <span>
                  {modalMode === 'add'
                    ? 'Add New Dairy Receiving Record'
                    : modalMode === 'edit'
                    ? 'Edit Dairy Receiving Record'
                    : 'Receiving Record Details'}
                </span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-theme-muted hover:text-theme p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-theme uppercase tracking-wider">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g., Salem District Milk Producers"
                    className="mt-1 w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-theme uppercase tracking-wider">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g., INV-2026-0812"
                    className="mt-1 w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)] disabled:opacity-60 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-theme uppercase tracking-wider">
                    Product *
                  </label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="e.g., Aavin Nice Milk – 500 ml"
                    className="mt-1 w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-theme uppercase tracking-wider">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    disabled={modalMode === 'view'}
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g., AAV-B2026-778"
                    className="mt-1 w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)] disabled:opacity-60 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-theme uppercase tracking-wider">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    disabled={modalMode === 'view'}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1000"
                    className="mt-1 w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-theme uppercase tracking-wider">
                    Unit *
                  </label>
                  <select
                    disabled={modalMode === 'view'}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="mt-1 w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  >
                    <option value="Packets">Packets</option>
                    <option value="Liters">Liters</option>
                    <option value="Crates">Crates</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-theme uppercase tracking-wider">
                    Received Date *
                  </label>
                  <input
                    type="date"
                    disabled={modalMode === 'view'}
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="mt-1 w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-theme uppercase tracking-wider">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    disabled={modalMode === 'view'}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="mt-1 w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-theme uppercase tracking-wider">
                  Remarks / QC Notes
                </label>
                <textarea
                  disabled={modalMode === 'view'}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="e.g., Quality grade A. Chilled transport verified."
                  className="mt-1 w-full bg-[var(--bg)] border border-theme rounded-xl p-3 text-sm text-theme focus:outline-none focus:border-[var(--accent)] disabled:opacity-60 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-theme-muted hover:text-theme bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-theme-accent hover:bg-[var(--accent-hover)] text-white transition-colors shadow-lg"
                  >
                    {modalMode === 'add' ? 'Save Receiving Record' : 'Update Record'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Receiving Record"
        message="Are you sure you want to permanently delete this dairy receiving record? This action cannot be undone."
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Shipment Identifier QR/Barcode Scanner Modal */}
      <ReceivingShipmentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onShipmentScanned={handleShipmentScanned}
      />
    </div>
  );
};
