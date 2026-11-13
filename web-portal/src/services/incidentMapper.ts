import { IncidentReport } from '../types';

/** How many reports the command view loads at a time (newest first). */
export const INCIDENT_PAGE_SIZE = 200;

/**
 * Converts a row from public.incidents into the IncidentReport shape the
 * portal uses. Shared by the initial load, "load older" and realtime updates.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapIncidentRow(r: any): IncidentReport {
  let parsedMedia = Array.isArray(r.media) ? r.media : [];
  if (typeof r.media === 'string') {
    try {
      parsedMedia = JSON.parse(r.media);
    } catch {
      parsedMedia = [];
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedMedia = parsedMedia.map((m: any) => ({
    ...m,
    url: m.url || m.rawS3Url || '',
    rawS3Url: m.rawS3Url || m.url || '',
    video_storage_path: m.video_storage_path || m.storage_path || '',
    uploadStatus: m.uploadStatus || (m.rawS3Url || m.url ? 'UPLOADED' : 'QUEUED'),
    thumbnailUrl: m.thumbnailUrl || m.rawS3Url || m.url || ''
  }));

  const hasValidCoords = typeof r.latitude === 'number' && !isNaN(r.latitude)
    && typeof r.longitude === 'number' && !isNaN(r.longitude);
  const lat = hasValidCoords ? r.latitude : null;
  const lng = hasValidCoords ? r.longitude : null;

  return {
    id: r.id,
    trackingCode: r.tracking_code || `GH-2026-${String(r.id).substring(0, 4)}`,
    title: r.title || 'Civic Incident Report',
    category: r.category || 'CRIMINAL_OFFENSE',
    description: r.description || 'No description provided.',
    locationName: r.location_name || 'Location Not Specified',
    ghanaPostCode: r.ghanapost_code || '',
    region: r.region || 'National',
    coordinates: hasValidCoords ? [lat, lng] : null,
    latitude: lat,
    longitude: lng,
    locationSource: r.location_source || null,
    gpsFixAgeSeconds: typeof r.gps_fix_age_s === 'number' ? r.gps_fix_age_s : null,
    gpsAccuracyM: typeof r.gps_accuracy_m === 'number' ? r.gps_accuracy_m : null,
    media: parsedMedia,
    reporter: r.reporter_data || {
      isAnonymous: Boolean(r.is_anonymous),
      trustScore: typeof r.reporter_trust_score === 'number' ? r.reporter_trust_score : 0
    },
    assignedAgency: r.assigned_agency || 'GPS_CID',
    secondaryAgencies: r.secondary_agencies || [],
    status: r.status || 'RECEIVED_PENDING_TRIAGE',
    severity: r.severity || 'NORMAL',
    isPublicEligible: Boolean(r.is_public_eligible),
    isPublicPublished: Boolean(r.is_public_published),
    publicCorroborations: r.public_corroborations || 0,
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
    investigatorNotes: r.investigator_notes || []
  };
}

/** Appends older reports, skipping any already loaded (e.g. arrived via realtime). */
export function mergeOlder(current: IncidentReport[], older: IncidentReport[]): IncidentReport[] {
  const seen = new Set(current.map(i => i.id));
  return [...current, ...older.filter(i => !seen.has(i.id))];
}
