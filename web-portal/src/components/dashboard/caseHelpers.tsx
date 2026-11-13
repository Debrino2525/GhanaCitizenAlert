import React from 'react';
import { IncidentReport, LocationSource } from '../../types';
import { formatAgo } from '../../utils/sosState';

// Shared by the dashboard, the case queue and the moderator console.

export const renderLocationSourceBadge = (
  locationSource?: LocationSource | null,
  fixAgeSeconds?: number | null,
  updatedAt?: string | null,
  title?: string | null,
  status?: string | null
) => {
  const cancelledByReporter = Boolean(title && (title.includes('STAND DOWN') || title.includes('CANCELLED')));
  const closedByOfficer = status === 'RESOLVED' || status === 'DISMISSED';

  if (cancelledByReporter || closedByOfficer) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold bg-slate-800 text-slate-300 border border-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1" />
        {cancelledByReporter ? 'CANCELLED BY REPORTER' : 'CLOSED'}
      </span>
    );
  }

  // Calculate actual elapsed wall-clock time since the incident was created or updated
  const elapsedSec = updatedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000))
    : (fixAgeSeconds ?? 9999);

  // If locationSource was recorded as LIVE, verify its freshness
  if (locationSource === 'LIVE') {
    // A live GPS fix is only truly live if fresh within 90 seconds (1.5 minutes)
    if (elapsedSec > 90) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold bg-amber-950/80 text-amber-400 border border-amber-700/80" title="No fresh location from the device">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" />
          LAST KNOWN ({formatAgo(elapsedSec)})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold bg-green-950/80 text-green-400 border border-green-700/80">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse" />
        LIVE
      </span>
    );
  }
  if (locationSource === 'LAST_KNOWN') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold bg-amber-950/80 text-amber-400 border border-amber-700/80">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" />
        LAST KNOWN ({formatAgo(elapsedSec)})
      </span>
    );
  }
  if (locationSource === 'MANUAL') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
        MANUAL
      </span>
    );
  }
  if (locationSource === 'UNAVAILABLE') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-950/80 text-red-400 border border-red-800">
        UNAVAILABLE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800">
      Location source not recorded
    </span>
  );
};

/** Object path inside the 'evidence' bucket from a Supabase storage URL, or null. */
export function evidencePathFromUrl(url: string): string | null {
  const m = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/evidence\/([^?#]+)/.exec(url || '');
  return m ? decodeURIComponent(m[1]) : null;
}

/** Resolved, dismissed, or cancelled by the reporter: no longer an emergency on screen. */
export function isCaseClosed(inc: Pick<IncidentReport, 'status' | 'title'>): boolean {
  return inc.status === 'RESOLVED' || inc.status === 'DISMISSED' || /STAND DOWN|CANCELLED/i.test(inc.title || '');
}

export function formatPingAge(dateStr: string): string {
  if (!dateStr) return '';
  return formatAgo(dateStr);
}
