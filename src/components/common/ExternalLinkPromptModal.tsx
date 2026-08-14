import React from 'react';
import { Globe, Mail, Phone, Wifi, MapPin, ExternalLink, X, ShieldAlert } from 'lucide-react';

interface ExternalLinkPromptModalProps {
  isOpen: boolean;
  content: string;
  type: 'url' | 'email' | 'phone' | 'wifi' | 'geo' | 'json' | 'text';
  onClose: () => void;
}

export const ExternalLinkPromptModal: React.FC<ExternalLinkPromptModalProps> = ({
  isOpen,
  content,
  type,
  onClose,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'url':
        return <Globe className="w-6 h-6 text-blue-400" />;
      case 'email':
        return <Mail className="w-6 h-6 text-purple-400" />;
      case 'phone':
        return <Phone className="w-6 h-6 text-green-400" />;
      case 'wifi':
        return <Wifi className="w-6 h-6 text-amber-400" />;
      case 'geo':
        return <MapPin className="w-6 h-6 text-rose-400" />;
      default:
        return <Globe className="w-6 h-6 text-[var(--accent)]" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'url':
        return 'External Website Link';
      case 'email':
        return 'Email Address Detected';
      case 'phone':
        return 'Phone / Contact Detected';
      case 'wifi':
        return 'Wi-Fi Configuration Detected';
      case 'geo':
        return 'Geographic Coordinates';
      default:
        return 'External Reference Detected';
    }
  };

  const handleOpen = () => {
    let href = content.trim();
    if (type === 'email' && !href.startsWith('mailto:')) {
      href = 'mailto:' + href;
    } else if (type === 'phone' && !href.startsWith('tel:') && !href.startsWith('sms:')) {
      href = 'tel:' + href;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-theme-card border border-theme rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/5 border border-theme">{getIcon()}</div>
            <div>
              <h3 className="text-lg font-semibold text-theme">{getTitle()}</h3>
              <p className="text-xs text-theme-muted">Security confirmation required before opening</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-theme flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-theme-muted">
            Check that you trust the source before visiting this external address.
          </p>
        </div>

        <div className="mt-3 p-4 rounded-xl bg-[var(--bg)] border border-theme break-all font-mono text-sm text-theme max-h-32 overflow-y-auto">
          {content}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-theme-muted hover:text-theme bg-white/5 hover:bg-white/10 transition-colors"
          >
            Stay in App
          </button>
          <button
            onClick={handleOpen}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-theme-accent hover:bg-[var(--accent-hover)] text-white transition-colors flex items-center gap-2"
          >
            <span>Open External Link</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
