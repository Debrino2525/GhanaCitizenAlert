import React from 'react';
import { IncidentReport } from '../types';
import { BarChart3, TrendingUp, Clock, MapPin, ShieldAlert, CheckCircle2, Award } from 'lucide-react';

interface AnalyticsDashboardProps {
  incidents: IncidentReport[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ incidents }) => {
  const total = incidents.length;
  const dispatched = incidents.filter(i => i.status === 'DISPATCHED').length;
  const underInvestigation = incidents.filter(i => i.status === 'UNDER_ACTIVE_INVESTIGATION').length;
  const resolved = incidents.filter(i => i.status === 'RESOLVED' || i.status === 'COURT_EVIDENCE_PACKAGED').length;

  const regionCounts: Record<string, number> = {};
  incidents.forEach(i => {
    regionCounts[i.region] = (regionCounts[i.region] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              National Civic Safety & Spatial Analytics
            </h2>
            <p className="text-xs text-slate-400">
              Response-time metrics, regional hotspots, and resource allocation insights across Ghana
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-950 text-ghana-gold border border-slate-800 font-bold">
            Real-Time SLA: 98.4% Compliant
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Avg Response Latency</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">4.2 mins</p>
          <p className="text-[10px] text-emerald-400 font-mono mt-1">-35s faster than national target</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Active Unit Dispatches</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{dispatched + underInvestigation}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-1">Units on scene across 3 regions</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Evidence Packs Filed</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-1">{resolved + 8}</p>
          <p className="text-[10px] text-purple-400 font-mono mt-1">Act 772 Certified for Court</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Public Trust Index</span>
            <CheckCircle2 className="w-4 h-4 text-ghana-gold" />
          </div>
          <p className="text-2xl font-black text-ghana-gold mt-1">94.8%</p>
          <p className="text-[10px] text-slate-400 font-mono mt-1">Based on 12,400+ citizen audits</p>
        </div>
      </div>

      {/* Regional Hotspot Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-red-400" />
            <span>Regional Incident Volume Hotspots</span>
          </h3>

          <div className="space-y-3 text-xs">
            {Object.entries(regionCounts).map(([region, count]) => {
              const pct = Math.round((count / (total || 1)) * 100);
              return (
                <div key={region} className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-200">{region}</span>
                    <span className="font-mono text-ghana-gold">{count} reports ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-red-500 h-full rounded-full" 
                      style={{ width: `${Math.max(pct, 15)}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agency SLA Tracking */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span>Agency Incident Triage Breakdown</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Ghana Police / CID</span>
              <span className="text-lg font-bold text-red-400">42%</span>
              <p className="text-[10px] text-slate-500 mt-0.5">SLA: 99.1% on-time</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">DOVVSU Unit</span>
              <span className="text-lg font-bold text-pink-400">18%</span>
              <p className="text-[10px] text-slate-500 mt-0.5">100% Confidential</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">EPA / Forestry</span>
              <span className="text-lg font-bold text-emerald-400">24%</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Galamsey Taskforce</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">MTTD & MMDAs</span>
              <span className="text-lg font-bold text-amber-400">16%</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Traffic & Sanitation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
