import React from 'react';
import { Shield, Search } from 'lucide-react';
import { IncidentReport, SosPing } from '../../types';
import { getSosState, sosDisplayTitle, SOS_STATE_LABEL } from '../../utils/sosState';
import { isCaseClosed, formatPingAge, renderLocationSourceBadge } from './caseHelpers';

export interface StatusFilterItem {
  id: string;
  label: string;
}

interface CaseQueueProps {
  incidents: IncidentReport[];
  filteredIncidents: IncidentReport[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (inc: IncidentReport) => void;
  latestPings: Record<string, SosPing>;
  filterAgency: string;
  setFilterAgency: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  statusFilterList: StatusFilterItem[];
  statusCounts: Record<string, number>;
}

/** Left column of the command view: search, filters and the list of cases. */
export const CaseQueue: React.FC<CaseQueueProps> = ({
  incidents,
  filteredIncidents,
  selectedIncident,
  onSelectIncident,
  latestPings,
  filterAgency,
  setFilterAgency,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  statusFilterList,
  statusCounts
}) => {
  return (
    <div className="lg:col-span-5 space-y-4">
      {/* Unified Sticky Search, Filter, and Status Block */}
      <div className="sticky top-[calc(var(--header-h)+0.5rem)] z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3 transition-all">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
            <span className="text-sm font-bold text-white truncate">Case queue</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 font-mono font-bold shrink-0">
              {filteredIncidents.length}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="hidden xl:inline text-xs font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              [J / K]
            </span>
            <select
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-semibold focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
              aria-label="Filter by Agency"
            >
              <option value="ALL">All Agencies</option>
              <option value="GPS_CID">GPS / CID (Crime)</option>
              <option value="DOVVSU">DOVVSU (Abuse)</option>
              <option value="EPA">EPA (Galamsey)</option>
              <option value="MTTD">MTTD (Traffic)</option>
              <option value="MMDA_SANITATION">MMDA (Sanitation)</option>
            </select>
          </div>
        </div>

        {/* Quick Search Bar with Shortcut Badge */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tracking code, GPS, landmark... (Press '/' to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-10 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          <span className="absolute right-2.5 top-2 text-xs font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 pointer-events-none hidden sm:inline">
            /
          </span>
        </div>

        {/* Status chips wrap instead of scrolling off the edge */}
        <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1">
          {statusFilterList.map((item) => {
            const count = item.id === 'ALL' ? incidents.length : (statusCounts[item.id] || 0);
            const isSelected = filterStatus === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setFilterStatus(item.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{item.label}</span>
                <span className={`px-1.5 py-0.2 rounded font-mono text-xs ${
                  isSelected ? 'bg-blue-900 text-blue-100' : 'bg-slate-800 text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Incidents List Container (Single Scroll Container) */}
      <div className="space-y-3 lg:max-h-[calc(100vh-var(--header-h)-3.5rem)] lg:overflow-y-auto scrollbar-thin pr-1">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/80 border border-slate-800 rounded-2xl text-slate-500 text-xs">
            No matching incidents found in CAD queue.
          </div>
        ) : (
          [...filteredIncidents]
            .sort((a, b) => Number(isCaseClosed(a)) - Number(isCaseClosed(b)))
            .map(inc => {
            const isSelected = selectedIncident?.id === inc.id;
            const closed = isCaseClosed(inc);
            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/15 ring-1 ring-blue-500'
                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                } ${closed && !isSelected ? 'opacity-60 hover:opacity-100' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2 min-w-0">
                    {inc.reporter?.avatarUrl && !inc.reporter?.isAnonymous ? (
                      <img
                        src={inc.reporter.avatarUrl}
                        alt="Citizen"
                        className="w-5 h-5 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                    ) : null}
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-ghana-gold border border-slate-800">
                      {inc.trackingCode}
                    </span>
                  </div>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                    closed
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : inc.severity === 'RED'
                      ? 'bg-red-900/60 text-red-300 border border-red-800'
                      : inc.severity === 'HIGH'
                      ? 'bg-amber-900/60 text-amber-300 border border-amber-800'
                      : 'bg-blue-900/60 text-blue-300 border border-blue-800'
                  }`}>
                    {closed ? 'Closed' : inc.severity}
                  </span>
                </div>

                <h3 className={`text-sm font-bold line-clamp-1 mb-1 ${closed ? 'text-slate-300' : 'text-white'}`}>{sosDisplayTitle(inc.title, getSosState(inc, latestPings[inc.id]?.created_at))}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{inc.description}</p>
                
                {latestPings[inc.id] && (() => {
                  const sosState = getSosState(inc, latestPings[inc.id].created_at);
                  const isPingActive = sosState === 'LIVE';
                  const isSignalLost = sosState === 'SIGNAL_LOST';

                  return (
                    <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono my-2 shadow-inner ${
                      isPingActive
                        ? 'bg-red-950/80 border-red-800 text-red-300'
                        : isSignalLost
                        ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isPingActive ? 'bg-red-500 animate-ping' : isSignalLost ? 'bg-amber-400' : 'bg-slate-500'}`} />
                      <span className="font-bold truncate">
                        {SOS_STATE_LABEL[sosState]} · last position {latestPings[inc.id].lat.toFixed(4)}, {latestPings[inc.id].lng.toFixed(4)} (±{latestPings[inc.id].accuracy}m) • {formatPingAge(latestPings[inc.id].created_at)}
                      </span>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80 gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-blue-400 font-bold text-xs truncate block">
                      📍 {inc.coordinates ? `${inc.coordinates[0].toFixed(4)}° N, ${inc.coordinates[1].toFixed(4)}° W` : 'Location unavailable'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono block mt-0.5">
                      🕒 {new Date(inc.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {renderLocationSourceBadge(inc.locationSource, inc.gpsFixAgeSeconds, inc.updatedAt, inc.title, inc.status)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
