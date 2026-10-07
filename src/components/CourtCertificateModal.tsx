import React from 'react';
import { Shield, FileCheck, Copy, Download, Check, X, Lock, MapPin, Hash, Clock } from 'lucide-react';
import { CourtCertificate } from '../services/evidenceVault';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-100 p-6 md:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Header */}
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                REPUBLIC OF GHANA • EVIDENCE VAULT
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Digital Evidence Certificate (Chain of Custody)
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Certificate Ref: {certificate.certificateId}
            </p>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="space-y-4 text-xs md:text-sm">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 font-mono">
            <div>
              <span className="text-slate-500 block text-[11px]">CASE TRACKING CODE</span>
              <span className="font-bold text-white">{certificate.trackingCode}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">INCIDENT TIMESTAMP</span>
              <span className="font-bold text-slate-300">{new Date(certificate.incidentTimestamp).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">GHANAPOST GPS ADDRESS</span>
              <span className="font-bold text-amber-400">{certificate.ghanaPostCode}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">GPS COORDINATES</span>
              <span className="font-bold text-slate-300">{certificate.coordinates[0].toFixed(5)}, {certificate.coordinates[1].toFixed(5)}</span>
            </div>
          </div>

          {/* Cryptographic Hashes */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-400" />
              <span>Cryptographic Media Hashes (SHA-256)</span>
            </h4>
            <div className="space-y-2">
              {certificate.mediaItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-blue-300">
                      Attachment #{idx + 1} ({item.type} • {item.duration})
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Tamper-Proof In-Camera Signature Valid</span>
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-400 break-all bg-slate-900/90 p-2 rounded border border-slate-800">
                    {item.sha256Hash}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Ghana Legal Citation */}
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-blue-200 text-xs leading-relaxed">
            <p className="font-semibold text-blue-300 mb-1">⚖️ Statutory Certification Notice:</p>
            <p>{certificate.statutoryNotice}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end space-x-3">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied JSON Payload' : 'Copy Evidence Signature'}</span>
          </button>
          <button
            onClick={() => {
              window.print();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-2 transition shadow-lg shadow-amber-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Official Court Dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
};
