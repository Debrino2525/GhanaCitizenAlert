import React from 'react';
import { Shield, FileCheck, Copy, Download, Check, X, Lock, MapPin, Hash, Printer } from 'lucide-react';
import { CourtCertificate } from '../services/evidenceVault';
import { printHtmlDocument, buildCourtCertificateHtml } from '../utils/printDocument';

interface CourtCertificateModalProps {
  certificate: CourtCertificate | null;
  onClose: () => void;
}

export const CourtCertificateModal: React.FC<CourtCertificateModalProps> = ({
  certificate,
  onClose
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!certificate) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(certificate, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin shadow-2xl relative text-slate-100 p-6 md:p-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileCheck className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              REPUBLIC OF GHANA • EVIDENCE VAULT
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Digital Evidence Certificate (Chain of Custody)
            </h2>
            <p className="text-xs text-slate-400 font-mono">Ref: {certificate.certificateId}</p>
          </div>
        </div>

        <div className="space-y-4 text-xs md:text-sm">
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono">
            <div>
              <span className="text-slate-500 block text-[11px]">CASE TRACKING CODE</span>
              <span className="font-bold text-white">{certificate.trackingCode}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">INCIDENT LOCATION</span>
              <span className="font-bold text-amber-400 truncate block">
                {certificate.locationName || 'Location pending'}
                {certificate.coordinates ? ` (${certificate.coordinates[0].toFixed(4)}° N, ${certificate.coordinates[1].toFixed(4)}° W)` : ' (GPS unavailable)'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {certificate.mediaItems.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-blue-300">Attachment #{idx + 1} ({item.type})</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    item.isVerifiedHex
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {item.isVerifiedHex ? 'SHA-256 Validated' : 'Unverified Hash'}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-400 break-all bg-slate-900 p-2 rounded mt-1">
                  SHA-256: {item.sha256Hash}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-blue-200 text-xs">
            <p className="font-semibold text-blue-300 mb-1">⚖️ Statutory Notice:</p>
            <p>{certificate.statutoryNotice}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end space-x-3">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Evidence Signature'}</span>
          </button>
          <button
            onClick={() => {
              if (certificate) {
                printHtmlDocument('Evidence Vault Certificate - ' + certificate.trackingCode, buildCourtCertificateHtml(certificate));
              }
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-2 shadow-lg shadow-amber-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>Export Official Court Dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
};
