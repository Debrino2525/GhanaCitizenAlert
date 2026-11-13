import { IncidentReport } from '../types';

/**
 * What an officer can truthfully say about an SOS beacon.
 *
 * LIVE        - a location ping arrived in the last 2 minutes.
 * CANCELLED   - the reporter pressed stand-down (cancel_sos_beacon marks the title).
 * CLOSED      - an officer resolved or dismissed the case.
 * SIGNAL_LOST - pings stopped but nobody cancelled it. The phone may be off, out of
 *               battery or out of coverage. This must never be shown as "terminated":
 *               the person may still need help.
 */
export type SosState = 'LIVE' | 'CANCELLED' | 'CLOSED' | 'SIGNAL_LOST';

export const SOS_LIVE_WINDOW_SEC = 120;

export function isSosIncident(inc: Pick<IncidentReport, 'title'> & { reporter?: any }): boolean {
  return Boolean(inc.reporter?.isEmergencyPanic) || /SOS BEACON/i.test(inc.title || '');
}

export function getSosState(
  inc: Pick<IncidentReport, 'title' | 'status'>,
  lastPingAt?: string | null
): SosState {
  const title = inc.title || '';
  if (/STAND DOWN|CANCELLED/i.test(title)) return 'CANCELLED';
  if (inc.status === 'RESOLVED' || inc.status === 'DISMISSED') return 'CLOSED';
  if (lastPingAt) {
    const ageSec = (Date.now() - new Date(lastPingAt).getTime()) / 1000;
    if (Number.isFinite(ageSec) && ageSec <= SOS_LIVE_WINDOW_SEC) return 'LIVE';
  }
  return 'SIGNAL_LOST';
}

export const SOS_STATE_LABEL: Record<SosState, string> = {
  LIVE: 'Live SOS',
  CANCELLED: 'Cancelled by reporter',
  CLOSED: 'Closed by officer',
  SIGNAL_LOST: 'No signal, not cancelled',
};

/** Replaces the "(ACTIVE)" the phone wrote into the title when that is no longer true. */
export function sosDisplayTitle(title: string, state: SosState): string {
  if (state === 'LIVE' || !/\(ACTIVE\)/.test(title)) return title;
  return title.replace('(ACTIVE)', `(${SOS_STATE_LABEL[state].toUpperCase()})`);
}

/** "just now", "5 min ago", "3 h ago", "12 days ago". */
export function formatAgo(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';
  const ms = typeof input === 'number' ? input * 1000 : Date.now() - new Date(input).getTime();
  if (!Number.isFinite(ms)) return '';
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} days ago`;
}
