import React from 'react';
import { IncidentReport } from '../types';
import { BarChart3, Inbox, Clock, MapPin, ShieldAlert, Scale } from 'lucide-react';

interface AnalyticsDashboardProps {
  incidents: IncidentReport[];
}

// Every number on this page is computed from the incidents the officer can see.
// Response times are not shown because the system does not record when a case
// was first actioned; showing an estimate here would be inventing data.

const AGENCY_LABELS: Record<string, string> = {
  GPS_CID: 'Ghana Police / CID',
  DOVVSU: 'DOVVSU',
  EPA: 'EPA',
  MTTD: 'MTTD (Traffic)',
  NADMO: 'NADMO',
  AMA: 'AMA (Accra)',
  KMA: 'KMA (Kumasi)',
  FORESTRY_COMM: 'Forestry Commission',
};

/** "Western Region", "western", "Western" -> "Western"; empty or "UNKNOWN" -> "Not recorded". */
export function normaliseRegion(raw: string | null | undefined): string {
  const r = (raw || '').trim().replace(/\s+region$/i, '');
  if (!r || /^unknown$/i.test(r)) return 'Not recorded';
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function formatAge(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'under an hour';
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ incidents }) => {
  const total = incidents.length;
  const isClosed = (s: string) => s === 'RESOLVED' || s === 'DISMISSED';
  const open = incidents.filter(i => !isClosed(i.status));
  const inProgress = incidents.filter(i => i.status === 'DISPATCHED' || i.status === 'UNDER_ACTIVE_INVESTIGATION').length;
  const courtPackaged = incidents.filter(i => i.status === 'COURT_EVIDENCE_PACKAGED').length;
  const awaitingTriage = incidents.filter(i => i.status === 'RECEIVED_PENDING_TRIAGE').length;

  const oldestOpenMs = open.reduce((max, i) => {
    const age = Date.now() - new Date(i.createdAt).getTime();
    return Number.isFinite(age) && age > max ? age : max;
  }, 0);

  const regionCounts: Record<string, number> = {};
  incidents.forEach(i => {
    const key = normaliseRegion(i.region);
    regionCounts[key] = (regionCounts[key] || 0) + 1;
  });
  const regions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]);

  const agencyCounts: Record<string, number> = {};
  incidents.forEach(i => {
    const key = i.assignedAgency || 'UNASSIGNED';
    agencyCounts[key] = (agencyCounts[key] || 0) + 1;
  });
  const agencies = Object.entries(agencyCounts).sort((a, b) => b[1] - a[1]);

  const pct = (n: number) => Math.round((n / (total || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Report analytics</h2>
            <p className="text-sm text-slate-400">
              Counts from the {total} report{total === 1 ? '' : 's'} you can see. Response times are not tracked yet.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-sm text-slate-400">
            <span>Open reports</span>
            <Inbox className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{open.length}</p>
          <p className="text-xs text-slate-400 mt-1">{awaitingTriage} waiting for triage</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-sm text-slate-400">
            <span>Dispatched or investigating</span>
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{inProgress}</p>
          <p className="text-xs text-slate-400 mt-1">Cases with status Dispatched or Investigating</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-sm text-slate-400">
            <span>Court-packaged</span>
            <Scale className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-1">{courtPackaged}</p>
          <p className="text-xs text-slate-400 mt-1">Marked as court-packaged by an officer</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-sm text-slate-400">
            <span>Oldest open report</span>
            <Clock className="w-4 h-4 text-ghana-gold" />
          </div>
          <p className="text-2xl font-black text-ghana-gold mt-1">{open.length ? formatAge(oldestOpenMs) : '—'}</p>
          <p className="text-xs text-slate-400 mt-1">Time since the oldest open report was received</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-red-400" />
            <span>Reports by region</span>
          </h3>
          <div className="space-y-3 text-sm">
            {regions.length === 0 && <p className="text-slate-400">No reports yet.</p>}
            {regions.map(([region, count]) => (
              <div key={region} className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-200">{region}</span>
                  <span className="font-mono text-ghana-gold">{count} ({pct(count)}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-amber-500 to-red-500 h-full rounded-full" style={{ width: `${pct(count)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span>Reports by assigned agency</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {agencies.length === 0 && <p className="text-slate-400">No reports yet.</p>}
            {agencies.map(([agency, count]) => (
              <div key={agency} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">{AGENCY_LABELS[agency] || (agency === 'UNASSIGNED' ? 'Not assigned' : agency)}</span>
                <span className="text-lg font-bold text-white">{count}</span>
                <span className="text-xs text-slate-500 ml-1.5">({pct(count)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
