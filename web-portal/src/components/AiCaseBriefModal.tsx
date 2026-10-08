import React from 'react';
import { PoliceCaseBrief, AiTriageResult } from '../services/geminiAiService';
import { Shield, X, AlertTriangle } from 'lucide-react';

interface AiCaseBriefModalProps {
  brief: PoliceCaseBrief | null;
  triage: AiTriageResult | null;
  isLoading: boolean;
  onClose: () => void;
  onApplyTriageAgency?: (agency: any) => void;
}

export const AiCaseBriefModal: React.FC<AiCaseBriefModalProps> = ({
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-4">
        {/* Ghana Flag Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#006B3F]" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mt-2">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">AI Brief Unavailable</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Automated AI brief and triage features are currently offline under National Security CAD lockdown policy. Case investigations must follow manual officer forensic procedures.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs text-slate-400 space-y-1">
          <div className="flex items-center space-x-2 text-slate-300 font-bold">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Manual CID Chain of Custody Active</span>
          </div>
          <p>Please utilize verified physical scene reports and certified Act 772 court evidence certificates.</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition mt-2"
        >
          Close
        </button>
      </div>
    </div>
  );
};
