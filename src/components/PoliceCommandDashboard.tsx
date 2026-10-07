import React, { useState } from 'react';
import { IncidentReport, IncidentStatus, AgencyType } from '../types';
import { Shield, Eye, Lock, FileCheck, CheckCircle2, Clock, AlertTriangle, UserCheck, ExternalLink, MapPin, Send, RefreshCw } from 'lucide-react';
import { generateCourtCertificate, CourtCertificate } from '../services/evidenceVault';

interface PoliceCommandDashboardProps {
  incidents: IncidentReport[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (inc: IncidentReport) => void;
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus) => void;
  onReassignAgency: (incidentId: string, newAgency: AgencyType) => void;
  onOpenCertificateModal: (cert: CourtCertificate) => void;
}

export const PoliceCommandDashboard: React.FC<PoliceCommandDashboardProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  onUpdateStatus,
  onReassignAgency,
  onOpenCertificateModal
}) => {
  const [filterAgency, setFilterAgency] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeNoteText, setActiveNoteText] = useState('');

  const filteredIncidents = incidents.filter(inc => {
    if (filterAgency !== 'ALL' && inc.assignedAgency !== filterAgency) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left List: Incident Queue */}
      <div className="lg:col-span-5 space-y-4">
        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold text-white">Agency Triage Queue</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 font-bold">
              {filteredIncidents.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Agencies</option>
              <option value="GPS_CID">GPS / CID (Crime)</option>
              <option value="DOVVSU">DOVVSU (Abuse)</option>
              <option value="EPA">EPA (Galamsey)</option>
              <option value="MTTD">MTTD (Traffic)</option>
              <option value="AMA">AMA (Sanitation)</option>
            </select>
          </div>
        </div>

        {/* Incident Cards */}
        <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filteredIncidents.map(inc => {
            const isSelected = selectedIncident?.id === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`cursor-pointer p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-ghana-gold border border-slate-800">
                      {inc.trackingCode}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      inc.severity === 'RED' ? 'bg-red-900/60 text-red-300 border border-red-700/50' :
                      inc.severity === 'HIGH' ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50' :
                      'bg-blue-900/60 text-blue-300'
                    }`}>
                      {inc.severity} PRIORITY
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white line-clamp-1 mb-1">
                  {inc.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {inc.description}
                </p>

                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80">
                  <span className="font-mono text-blue-400 font-bold flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{inc.ghanaPostCode}</span>
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                      {inc.assignedAgency}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${
                      inc.status === 'DISPATCHED' ? 'bg-emerald-400 animate-pulse' :
                      inc.status === 'UNDER_INVESTIGATION' ? 'bg-blue-400' :
                      'bg-slate-500'
                    }`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Details: Video Evidence, Chain of Custody & Dispatch Controls */}
      <div className="lg:col-span-7">
        {selectedIncident ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Header / Tracking */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-mono font-black text-ghana-gold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {selectedIncident.trackingCode}
                  </span>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    Assigned: {selectedIncident.assignedAgency}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    selectedIncident.status === 'DISPATCHED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    selectedIncident.status === 'COURT_EVIDENCE_FILED' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    STATUS: {selectedIncident.status.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-2">
                  {selectedIncident.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>{selectedIncident.locationName} ({selectedIncident.ghanaPostCode})</span>
                </p>
              </div>

              {/* Court Evidence Certificate Button */}
              <button
                onClick={() => onOpenCertificateModal(generateCourtCertificate(selectedIncident))}
                className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center space-x-2 transition"
              >
                <FileCheck className="w-4 h-4" />
                <span>Legal Evidence Vault (Act 772)</span>
              </button>
            </div>

            {/* Video / Photo Evidence Player with Watermark */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Tamper-Proof Citizen Evidence (Max 60s Video)</span>
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  SHA-256 Signature Validated
                </span>
              </div>

              {selectedIncident.media.map((mediaItem) => (
                <div key={mediaItem.id} className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src={mediaItem.thumbnailUrl}
                    alt="Evidence thumbnail"
                    className="w-full h-72 object-cover opacity-80"
                  />
                  
                  {/* Live Watermark Overlay (UTC, GhanaPost, GPS, Frame Hash) */}
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md p-2.5 rounded-lg border border-slate-700 text-[11px] font-mono text-white space-y-0.5">
                    <p className="text-ghana-gold font-bold">🇬🇭 CITIZEN-ALERT WATERMARK</p>
                    <p className="text-slate-300">UTC: {mediaItem.timestampUtc}</p>
                    <p className="text-slate-300">GPS: {mediaItem.gpsWatermark.lat.toFixed(5)}, {mediaItem.gpsWatermark.lng.toFixed(5)} (±{mediaItem.gpsWatermark.accuracyMeters}m)</p>
                    <p className="text-amber-400 font-bold">ADDRESS: {mediaItem.gpsWatermark.ghanaPostCode}</p>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-md border border-slate-700 text-[10px] font-mono text-emerald-400 flex items-center space-x-1.5">
                    <Lock className="w-3 h-3" />
                    <span>In-Camera Cryptographic Seal</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Reporter Profile & Verification Mode */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-bold block mb-1">REPORTER VERIFICATION</span>
                {selectedIncident.reporter.isAnonymous ? (
                  <div className="flex items-center space-x-2 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                      ANONYMOUS WHISTLEBLOWER
                    </span>
                    <span className="text-slate-500">(Whistleblower Act, Act 720)</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-white flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedIncident.reporter.name}</span>
                    </p>
                    <p className="text-slate-400 font-mono">Ghana Card: {selectedIncident.reporter.ghanaCardId}</p>
                    <p className="text-slate-400 font-mono">Phone: {selectedIncident.reporter.phone}</p>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">CITIZEN TRUST METRIC</span>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${selectedIncident.reporter.trustScore}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedIncident.reporter.trustScore}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Based on past verified reports & eKYC</p>
              </div>
            </div>

            {/* Quick Action Dispatch & Re-routing Toolbar */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Command Dispatch & Action Panel
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => onUpdateStatus(selectedIncident.id, 'DISPATCHED')}
                  className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20"
                >
                  ⚡ Dispatch Unit
                </button>
                <button
                  onClick={() => onUpdateStatus(selectedIncident.id, 'UNDER_INVESTIGATION')}
                  className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                >
                  🔍 Set Investigating
                </button>
                <button
                  onClick={() => onUpdateStatus(selectedIncident.id, 'COURT_EVIDENCE_FILED')}
                  className="px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition"
                >
                  ⚖️ File Court Evidence
                </button>
                <button
                  onClick={() => onUpdateStatus(selectedIncident.id, 'RESOLVED')}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  ✅ Mark Resolved
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <Shield className="w-12 h-12 mx-auto text-slate-700 mb-3" />
            <p className="font-bold text-slate-400">Select an incident from the queue</p>
            <p className="text-xs text-slate-600 mt-1">View video evidence, verify digital signatures, or dispatch units</p>
          </div>
        )}
      </div>
    </div>
  );
};
