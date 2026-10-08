import React, { useState } from 'react';
import { PoliceCaseBrief, AiTriageResult } from '../services/geminiAiService';
import { printHtmlDocument, buildPoliceBriefHtml } from '../utils/printDocument';
import {
  Sparkles,
  Shield,
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  X,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Lock,
  Radio,
  Building2,
  ChevronRight
} from 'lucide-react';

interface AiCaseBriefModalProps {
  brief: PoliceCaseBrief | null;
  triage: AiTriageResult | null;
  isLoading: boolean;
  onClose: () => void;
  onApplyTriageAgency?: (agency: any) => void;
}

export const AiCaseBriefModal: React.FC<AiCaseBriefModalProps> = ({
  brief,
  triage,
  isLoading,
  onClose,
  onApplyTriageAgency
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'DOSSIER' | 'TRIAGE'>('DOSSIER');

  if (!brief && !isLoading) return null;

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleCopyText = () => {
    if (!brief) return;
    const text = `
GHANA POLICE SERVICE - INVESTIGATION CASE DOSSIER
DOSSIER NO: ${brief.dossierNumber}
INCIDENT: ${brief.incidentTrackingCode} - ${brief.title}
GENERATED: ${new Date(brief.generatedAt).toLocaleString()}

1. EXECUTIVE SUMMARY:
${brief.executiveSummary}

2. STATUTORY & LEGAL FRAMEWORK:
${brief.legalFramework.map(l => `- ${l}`).join('\n')}

3. GEOSPATIAL TELEMETRY:
- Location: ${brief.geospatialAssessment.locationName}
- GhanaPost GPS: ${brief.geospatialAssessment.ghanaPostCode}
- Coordinates: ${brief.geospatialAssessment.coordinates}
- Sector: ${brief.geospatialAssessment.tacticalSector}

4. FORENSIC EVIDENCE AUDIT:
- Evidence Items: ${brief.forensicEvidenceAudit.evidenceCount}
- SHA-256 Seal: ${brief.forensicEvidenceAudit.sha256Seal}
- Integrity Status: ${brief.forensicEvidenceAudit.tamperProofStatus}
- Chain of Custody: ${brief.forensicEvidenceAudit.chainOfCustodySummary}

5. INVESTIGATIVE CHECKLIST:
${brief.investigativeChecklist.map(c => `[ ] ${c}`).join('\n')}

6. COMMAND ACTION DIRECTIVES:
${brief.commandActionDirectives.map(d => `* ${d}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!brief) return;
    printHtmlDocument('Ghana Police Service Investigation Brief - ' + (brief.incidentTrackingCode || brief.dossierNumber || 'CID'), buildPoliceBriefHtml(brief));
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto border-t-2 border-t-amber-400">
        {/* Modal Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-ghana-gold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                  GOOGLE GEMINI 1.5 INTELLIGENCE
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-bold border border-blue-800">
                  Act 772 Certified
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Ghana Police Service Investigation Brief
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex space-x-1">
              <button
                onClick={() => setActiveTab('DOSSIER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'DOSSIER'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Case Dossier
              </button>
              <button
                onClick={() => setActiveTab('TRIAGE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'TRIAGE'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AI Triage & Threat Analysis
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-base font-bold text-white">Synthesizing Ghana Police Intelligence Brief...</p>
                <p className="text-xs text-slate-400 mt-1">
                  Gemini is analyzing multi-source forensic evidence, GhanaPost telemetry, and legal statutes.
                </p>
              </div>
            </div>
          ) : brief && activeTab === 'DOSSIER' ? (
            <div className="space-y-6">
              {/* Dossier Header Card */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                <div>
                  <span className="text-slate-500 font-bold block">DOSSIER IDENTIFIER:</span>
                  <span className="text-amber-400 font-black text-sm">{brief.dossierNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">INCIDENT TRACKING:</span>
                  <span className="text-white font-bold">{brief.incidentTrackingCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">GENERATION TIMESTAMP:</span>
                  <span className="text-slate-300">{new Date(brief.generatedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* 1. Executive Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>1. Official CID Executive Summary</span>
                </h3>
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-slate-200 leading-relaxed text-xs">
                  {brief.executiveSummary}
                </div>
              </div>

              {/* 2. Legal Framework */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>2. Statutory Jurisdiction & Prosecution Basis</span>
                </h3>
                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                  {brief.legalFramework.map((statute, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-slate-300">
                      <span className="text-emerald-400">⚖️</span>
                      <span className="font-medium">{statute}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Geospatial & Forensic Telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-white flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>Geospatial Sector Telemetry</span>
                  </h4>
                  <p className="text-slate-300"><span className="text-slate-500">Location:</span> {brief.geospatialAssessment.locationName}</p>
                  <p className="text-slate-300"><span className="text-slate-500">GhanaPost GPS:</span> <span className="font-mono text-amber-400 font-bold">{brief.geospatialAssessment.ghanaPostCode}</span></p>
                  <p className="text-slate-300"><span className="text-slate-500">Coordinates:</span> <span className="font-mono text-blue-400">{brief.geospatialAssessment.coordinates}</span></p>
                  <p className="text-slate-300"><span className="text-slate-500">Sector:</span> {brief.geospatialAssessment.tacticalSector}</p>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-white flex items-center space-x-1.5">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Forensic Evidence Audit</span>
                  </h4>
                  <p className="text-slate-300"><span className="text-slate-500">Evidence Count:</span> {brief.forensicEvidenceAudit.evidenceCount} Media Asset(s)</p>
                  <p className="text-slate-300"><span className="text-slate-500">Integrity Seal:</span> <span className="text-emerald-400 font-bold font-mono text-[10px]">VERIFIED</span></p>
                  <p className="text-slate-300 truncate"><span className="text-slate-500">SHA-256:</span> <span className="font-mono text-slate-400 text-[10px]">{brief.forensicEvidenceAudit.sha256Seal}</span></p>
                  <p className="text-slate-400 text-[11px] leading-tight">{brief.forensicEvidenceAudit.chainOfCustodySummary}</p>
                </div>
              </div>

              {/* 4. Action Checklist & Directives */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>3. Recommended Investigative Action Checklist</span>
                </h3>
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  {brief.investigativeChecklist.map((step, i) => (
                    <div key={i} className="flex items-start space-x-2 text-slate-200">
                      <input type="checkbox" className="mt-0.5 accent-amber-400 cursor-pointer" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : triage && activeTab === 'TRIAGE' ? (
            <div className="space-y-6">
              {/* Triage Overview Card */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block">ASSESSED THREAT LEVEL:</span>
                  <span className={`text-base font-black uppercase ${
                    triage.assessedSeverity === 'RED' || triage.assessedSeverity === 'CRITICAL'
                      ? 'text-red-400'
                      : triage.assessedSeverity === 'HIGH'
                      ? 'text-amber-400'
                      : 'text-blue-400'
                  }`}>
                    {triage.assessedSeverity}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">RECOMMENDED AGENCY:</span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-sm font-black text-white">{triage.recommendedAgency}</span>
                    {onApplyTriageAgency && (
                      <button
                        onClick={() => onApplyTriageAgency(triage.recommendedAgency)}
                        className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
                      >
                        Reassign Now
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">AI CONFIDENCE SCORE:</span>
                  <span className="text-emerald-400 font-black text-base">{triage.confidenceScore}%</span>
                </div>
              </div>

              {/* Threat Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                  <span>Tactical Threat Assessment</span>
                </h4>
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-slate-200 text-xs leading-relaxed">
                  {triage.threatSummary}
                </div>
              </div>

              {/* Immediate Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Immediate Dispatch Directives</span>
                </h4>
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  {triage.immediateActions.map((act, i) => (
                    <div key={i} className="flex items-center space-x-2 text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Risk Factors */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Identified Risk Vectors</span>
                </h4>
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                  {triage.keyRiskFactors.map((risk, i) => (
                    <div key={i} className="flex items-center space-x-2 text-slate-300">
                      <span className="text-red-400">⚠️</span>
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Republic of Ghana Law Enforcement Operations</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyText}
              disabled={isLoading || !brief}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Dossier Text'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isLoading || !brief}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
