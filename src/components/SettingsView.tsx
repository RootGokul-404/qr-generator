import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { soundAndNotify } from '../services/soundAndNotify.ts';
import { ConfirmDialog } from './common/ConfirmDialog.tsx';
import {
  Settings,
  Volume2,
  VolumeX,
  Palette,
  QrCode,
  Barcode,
  MapPin,
  Download,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  User,
  Sliders,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);

  useEffect(() => {
    setSettings(storage.getSettings());
  }, []);

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setIsSaved(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveSettings(settings);
    soundAndNotify.setSoundEnabled(settings.soundEnabled);
    setIsSaved(true);
    soundAndNotify.notify(
      'Settings Saved',
      'System preferences updated globally.',
      'success',
      'settings'
    );
  };

  const handleFactoryReset = () => {
    storage.factoryReset();
    setConfirmResetOpen(false);
    setSettings(storage.getSettings());
    soundAndNotify.notify(
      'System Reset Complete',
      'Factory defaults restored and initial seed data reloaded.',
      'info',
      'settings'
    );
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-theme-card border border-theme rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--accent)]" />
            <span>Vesta Dairy OS System Settings</span>
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Configure default scanning behaviors, error correction levels, sound feedback, and export options.
          </p>
        </div>
        <button
          onClick={() => setConfirmResetOpen(true)}
          className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Factory Reset System</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. Interface & Theme Preferences */}
        <div className="bg-theme-card border border-theme rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-theme flex items-center gap-2 border-b border-theme pb-3">
            <Palette className="w-4 h-4 text-[var(--accent)]" />
            <span>Interface & Theme Preferences</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-theme uppercase tracking-wider block">
                Visual Theme Preference
              </label>
              <p className="text-xs text-theme-muted mt-0.5 mb-2">
                Select visual appearance for UI elements and layouts.
              </p>
              <select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value as AppSettings['theme'])}
                className="w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="dark">Elegant Dark Theme (Recommended)</option>
                <option value="light">High-Contrast Light Theme</option>
                <option value="system">System Automatic Match</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-theme uppercase tracking-wider block">
                Sound Effects Feedback
              </label>
              <p className="text-xs text-theme-muted mt-0.5 mb-2">
                Enable audio beeps on successful barcode and QR code scans.
              </p>
              <button
                type="button"
                onClick={() => handleChange('soundEnabled', !settings.soundEnabled)}
                className={`w-full py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  settings.soundEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-white/5 border-theme text-theme-muted hover:text-theme'
                }`}
              >
                {settings.soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Sound Beeps Enabled</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>Muted (Silent Scanning)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Default QR & Barcode Generation Settings */}
        <div className="bg-theme-card border border-theme rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-theme flex items-center gap-2 border-b border-theme pb-3">
            <QrCode className="w-4 h-4 text-[var(--accent)]" />
            <span>Default QR Code & Barcode Parameters</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-theme uppercase tracking-wider block">
                QR Code Error Correction Level
              </label>
              <p className="text-xs text-theme-muted mt-0.5 mb-2">
                Higher levels restore damaged codes but increase pattern density.
              </p>
              <select
                value={settings.defaultQRErrorCorrection}
                onChange={(e) =>
                  handleChange('defaultQRErrorCorrection', e.target.value as any)
                }
                className="w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="L">L – Low (~7% data recovery)</option>
                <option value="M">M – Medium (~15% data recovery)</option>
                <option value="Q">Q – Quartile (~25% data recovery - Default)</option>
                <option value="H">H – High (~30% data recovery)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-theme uppercase tracking-wider block">
                Default Barcode Format
              </label>
              <p className="text-xs text-theme-muted mt-0.5 mb-2">
                Primary barcode standard for dairy logistics and retail items.
              </p>
              <select
                value={settings.defaultBarcodeType}
                onChange={(e) => handleChange('defaultBarcodeType', e.target.value as any)}
                className="w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="EAN-13">EAN-13 (Standard Retail Barcode)</option>
                <option value="EAN-8">EAN-8 (Compact Package Barcode)</option>
                <option value="UPC-A">UPC-A (North American Standard)</option>
                <option value="UPC-E">UPC-E (Compact Retail)</option>
                <option value="Code-128">Code-128 (Logistics & Serial Data)</option>
                <option value="QR">2D QR Code Standard</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Location & Export Parameters */}
        <div className="bg-theme-card border border-theme rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-theme flex items-center gap-2 border-b border-theme pb-3">
            <Sliders className="w-4 h-4 text-[var(--accent)]" />
            <span>Facility Location & Export Parameters</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-theme uppercase tracking-wider block">
                Default Scan Station Location
              </label>
              <p className="text-xs text-theme-muted mt-0.5 mb-2">
                Attached to every scan history record for logistics trace.
              </p>
              <input
                type="text"
                value={settings.defaultLocation}
                onChange={(e) => handleChange('defaultLocation', e.target.value)}
                placeholder="e.g., Warehouse Bay 1 / Receiving Dock A"
                className="w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-theme uppercase tracking-wider block">
                Default Export Format Preference
              </label>
              <p className="text-xs text-theme-muted mt-0.5 mb-2">
                Format used when saving or printing data tables.
              </p>
              <select
                value={settings.exportFormatPreference}
                onChange={(e) =>
                  handleChange('exportFormatPreference', e.target.value as any)
                }
                className="w-full bg-[var(--bg)] border border-theme rounded-xl px-3.5 py-2.5 text-sm text-theme focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="PNG">PNG Raster Image</option>
                <option value="SVG">SVG Scalable Vector</option>
                <option value="PDF">PDF Printable Report</option>
                <option value="CSV">CSV Comma Separated Spreadsheet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between p-4 bg-theme-card border border-theme rounded-2xl">
          <div className="flex items-center gap-2 text-xs text-theme-muted">
            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
            <span>Changes persist immediately to local storage</span>
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-theme-accent hover:bg-[var(--accent-hover)] text-sm font-semibold text-white transition-all shadow-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? 'Settings Applied!' : 'Save System Preferences'}</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Factory Reset */}
      <ConfirmDialog
        isOpen={confirmResetOpen}
        title="Factory Reset Vesta System"
        message="Are you sure you want to perform a full factory reset? This will erase all custom QR history, barcode scans, and dairy receiving records, and restore the initial seed database."
        confirmText="Reset to Factory Defaults"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleFactoryReset}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
};
