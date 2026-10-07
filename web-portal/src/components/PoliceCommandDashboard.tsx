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

  const filteredIncidents = incidents.filter(inc => {
    if (filterAgency !== 'ALL' && inc.assignedAgency !== filterAgency) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left List */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold text-white">Agency CAD Dispatch Queue</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 font-bold">
              {filteredIncidents.length}
            </span>
          </div>

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
          </select>
        </div>

        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
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
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-ghana-gold border border-slate-800">
                    {inc.trackingCode}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    inc.severity === 'RED' ? 'bg-red-900/60 text-red-300' : 'bg-blue-900/60 text-blue-300'
                  }`}>
                    {inc.severity}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white line-clamp-1 mb-1">{inc.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{inc.description}</p>
                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80">
                  <span className="font-mono text-blue-400 font-bold">📍 {inc.ghanaPostCode}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                    {inc.assignedAgency}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Details */}
      <div className="lg:col-span-7">
        {selectedIncident ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-sm font-mono font-black text-ghana-gold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {selectedIncident.trackingCode}
                </span>
                <h2 className="text-lg font-bold text-white mt-2">{selectedIncident.title}</h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">📍 {selectedIncident.locationName} ({selectedIncident.ghanaPostCode})</p>
              </div>

              <button
                onClick={() => onOpenCertificateModal(generateCourtCertificate(selectedIncident))}
                className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center space-x-2 transition"
              >
                <FileCheck className="w-4 h-4" />
                <span>Legal Evidence Vault (Act 772)</span>
              </button>
            </div>

            {/* Video Evidence */}
            {selectedIncident.media.map(m => (
              <div key={m.id} className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <img src={m.thumbnailUrl} alt="Evidence" className="w-full h-64 object-cover opacity-80" />
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md p-2 rounded-lg border border-slate-700 text-[11px] font-mono text-white space-y-0.5">
                  <p className="text-ghana-gold font-bold">🇬🇭 CITIZEN-ALERT WATERMARK</p>
                  <p className="text-slate-300">GPS: {m.gpsWatermark.lat.toFixed(5)}, {m.gpsWatermark.lng.toFixed(5)}</p>
                  <p className="text-amber-400 font-bold">ADDRESS: {m.gpsWatermark.ghanaPostCode}</p>
                </div>
              </div>
            ))}

            {/* Dispatch Action Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                onClick={() => onUpdateStatus(selectedIncident.id, 'DISPATCHED')}
                className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20"
              >
                ⚡ Dispatch Unit
              </button>
              <button
                onClick={() => onUpdateStatus(selectedIncident.id, 'UNDER_ACTIVE_INVESTIGATION')}
                className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
              >
                🔍 Set Investigating
              </button>
              <button
                onClick={() => onUpdateStatus(selectedIncident.id, 'COURT_EVIDENCE_PACKAGED')}
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
        ) : (
          <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500">
            Select an incident to view evidence.
          </div>
        )}
      </div>
    </div>
  );
};
