import React, { useState } from 'react';
import { PoliceCaseBrief, AiTriageResult } from '../services/geminiAiService';
import { AgencyType } from '../types';
import {
  Shield,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Lock,
  Printer,
  Copy,
  Check,
  Building2,
  Clock,
  ListChecks,
  Scale
} from 'lucide-react';

interface AiCaseBriefModalProps {
  brief: PoliceCaseBrief | null;
  triage: AiTriageResult | null;
  isLoading: boolean;
  onClose: () => void;
  onApplyTriageAgency?: (agency: AgencyType) => void;
}

export const AiCaseBriefModal: React.FC<AiCaseBriefModalProps> = ({
  brief,
  triage,
  isLoading,
  onClose,
  onApplyTriageAgency
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'EXECUTIVE' | 'LEGAL' | 'CHECKLIST' | 'EVIDENCE'>('EXECUTIVE');

  const handleCopy = () => {
    if (!brief) return;
    const text = `
=== GHANA POLICE SERVICE CID - AI CASE DOSSIER ===
Dossier No: ${brief.dossierNumber}
Incident: ${brief.incidentTrackingCode} - ${brief.title}
Generated: ${brief.generatedAt}

EXECUTIVE SUMMARY:
${brief.executiveSummary}

STATUTORY LEGAL FRAMEWORK:
${brief.legalFramework.map((f, i) => `${i + 1}. ${f}`).join('\n')}

GEOSPATIAL & TACTICAL DISPATCH:
Location: ${brief.geospatialAssessment.locationName}
GPS: ${brief.geospatialAssessment.coordinates}
Nearest Station: ${brief.geospatialAssessment.closestStationName} (ETA ~${brief.geospatialAssessment.estimatedEtaMinutes} mins)

FORENSIC EVIDENCE AUDIT:
SHA-256 Seal: ${brief.forensicEvidenceAudit.sha256Seal}
Status: ${brief.forensicEvidenceAudit.tamperProofStatus}
Chain of Custody: ${brief.forensicEvidenceAudit.chainOfCustodySummary}

COMMAND ACTION DIRECTIVES:
${brief.commandActionDirectives.map((d, i) => `• ${d}`).join('\n')}

INVESTIGATIVE CHECKLIST:
${brief.investigativeChecklist.map((c, i) => `[ ] ${c}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full p-5 sm:p-8 shadow-2xl relative overflow-hidden text-left space-y-5 my-auto max-h-[92vh] flex flex-col">
        {/* Ghana Flag Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#006B3F]" />
        </div>

        {/* Modal Top Header */}
        <div className="flex items-start justify-between gap-4 pt-1 pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-blue-500/20 to-purple-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-800">
                  AI INVESTIGATION DOSSIER
                </span>
                {brief && (
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {brief.dossierNumber}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-1 truncate">
                {brief ? brief.title : 'Generating Forensic Case Brief...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {brief && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-bold flex items-center space-x-1"
                  title="Copy Dossier to Clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-bold flex items-center space-x-1"
                  title="Print Police Case Brief"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading Spinner View */}
        {isLoading ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Synthesizing AI Forensic Dossier...</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Auditing Act 772 cryptographic checksums, analyzing geospatial corridors, and cross-referencing Ghana Criminal Code statutes.
              </p>
            </div>
          </div>
        ) : !brief ? (
          <div className="py-12 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-sm font-bold text-white">Could not generate AI case brief.</p>
            <p className="text-xs text-slate-400">Please verify network connectivity or select an incident.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('EXECUTIVE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'EXECUTIVE'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Executive Brief</span>
              </button>
              <button
                onClick={() => setActiveTab('LEGAL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'LEGAL'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Statutory Offenses</span>
              </button>
              <button
                onClick={() => setActiveTab('CHECKLIST')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'CHECKLIST'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Investigator Checklist</span>
              </button>
              <button
                onClick={() => setActiveTab('EVIDENCE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'EVIDENCE'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Act 772 Chain of Custody</span>
              </button>
            </div>

            {/* TAB 1: EXECUTIVE BRIEF */}
            {activeTab === 'EXECUTIVE' && (
              <div className="space-y-4">
                {/* Situation Assessment */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                      SITUATION ASSESSMENT & THREAT BRIEF
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{brief.generatedAt}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {brief.executiveSummary}
                  </p>
                </div>

                {/* Geospatial & Dispatch Origin Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-slate-400 font-bold block flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>Scene Coordinates & Sector</span>
                    </span>
                    <p className="text-white font-mono font-bold text-xs">{brief.geospatialAssessment.coordinates}</p>
                    <p className="text-slate-400">{brief.geospatialAssessment.locationName}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-slate-400 font-bold block flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Command Station & Sirens ETA</span>
                    </span>
                    <p className="text-blue-400 font-bold text-xs truncate">{brief.geospatialAssessment.closestStationName}</p>
                    <p className="text-emerald-400 font-mono font-bold">~{brief.geospatialAssessment.estimatedEtaMinutes} mins Emergency Response ETA</p>
                  </div>
                </div>

                {/* Directives */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase text-blue-400 tracking-wider block">
                    ⚡ IMMEDIATE CAD COMMAND DIRECTIVES
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    {brief.commandActionDirectives.map((action, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <span className="text-blue-400 font-bold shrink-0">{idx + 1}.</span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendation Banner */}
                {triage && onApplyTriageAgency && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-purple-950/60 border border-blue-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2.5">
                      <Shield className="w-5 h-5 text-blue-400 shrink-0" />
                      <div>
                        <p className="text-white font-bold">Recommended Jurisdiction: <span className="text-amber-400">{triage.recommendedAgency}</span></p>
                        <p className="text-slate-400 text-[11px]">AI Confidence Score: {triage.confidenceScore}%</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onApplyTriageAgency(triage.recommendedAgency)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow"
                    >
                      Apply Re-Assignment
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LEGAL FRAMEWORK */}
            {activeTab === 'LEGAL' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                    <Scale className="w-4 h-4" />
                    <span>Statutory Offense Mapping (Republic of Ghana)</span>
                  </div>
                  <div className="space-y-2">
                    {brief.legalFramework.map((statute, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-start space-x-2.5">
                        <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 font-mono font-bold shrink-0 text-[10px]">
                          §{idx + 1}
                        </span>
                        <span className="text-slate-200 font-medium">{statute}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block">Whistleblower Legal Safeguards</span>
                  <p className="text-slate-300 leading-relaxed">
                    Under the <strong className="text-white">Whistleblower Act, 2006 (Act 720)</strong> and <strong className="text-white">Data Protection Act, 2012 (Act 843)</strong>, any disclosure made in good faith grants the reporter statutory protection against victimization, civil litigation, or unlawful identity release.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: INVESTIGATOR CHECKLIST */}
            {activeTab === 'CHECKLIST' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-2">
                      <ListChecks className="w-4 h-4 text-emerald-400" />
                      <span>CID Tactical Field Checklist</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">5 Steps Required</span>
                  </div>
                  <div className="space-y-2">
                    {brief.investigativeChecklist.map((task, idx) => (
                      <label key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-start space-x-3 cursor-pointer hover:border-slate-700 transition">
                        <input type="checkbox" defaultChecked={idx === 0} className="accent-amber-400 rounded mt-0.5" />
                        <span className="text-slate-200 leading-snug">{task}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: EVIDENCE AUDIT */}
            {activeTab === 'EVIDENCE' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <Lock className="w-4 h-4" />
                    <span>Act 772 Electronic Evidence Verification</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">SHA-256 Checksum Seal</span>
                      <p className="font-mono text-emerald-400 break-all text-[11px]">{brief.forensicEvidenceAudit.sha256Seal}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Chain of Custody Certificate</span>
                      <p className="text-slate-300 text-xs leading-relaxed">{brief.forensicEvidenceAudit.chainOfCustodySummary}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 font-mono">Ghana CAD AI Engine • Act 772 Verified</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
