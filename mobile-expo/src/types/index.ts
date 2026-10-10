export type LanguageCode = 'en' | 'tw' | 'ga' | 'ee' | 'ha';

export type TabType = 'CAPTURE' | 'ALERTS' | 'SOS' | 'QUEUE';

export type IncidentCategory =
  | 'CRIMINAL_OFFENSE'
  | 'DOMESTIC_ABUSE'
  | 'GALAMSEY_ENVIRONMENTAL'
  | 'TRAFFIC_RECKLESS'
  | 'SANITATION_ZONING';

export type IncidentSeverity = 'NORMAL' | 'HIGH' | 'RED';

export type IncidentStatus =
  | 'RECEIVED_PENDING_TRIAGE'
  | 'DISPATCHED'
  | 'INVESTIGATING'
  | 'RESOLVED';

export type AssignedAgency = 'GPS_CID' | 'DOVVSU' | 'EPA' | 'MTTD';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export type LocationSource = 'LIVE' | 'LAST_KNOWN' | 'MANUAL' | 'UNAVAILABLE';

export type GpsLockStatus =
  | 'LOCATING'
  | 'LIVE'
  | 'STALE'
  | 'MANUAL'
  | 'UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'ERROR'
  | 'LOCKED'; // Kept for backward compatibility

export interface GpsWatermark {
  lat: number | null;
  lng: number | null;
  landmark: string;
  accuracyMeters: number | null;
  locationSource: LocationSource;
  fixAgeSeconds: number | null;
}

export type MediaUploadStatus =
  | 'QUEUED'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'UPLOAD_FAILED'
  | 'RETRYING';

export type MediaType = 'VIDEO' | 'IMAGE';

export interface EvidenceMediaItem {
  type: MediaType;
  video_storage_path: string;
  durationSeconds: number;
  rawS3Url: string;
  thumbnailUrl: string;
  localUri: string;
  sha256Checksum: string | null;
  timestampUtc: string;
  fileSizeBytes: number;
  gpsWatermark: GpsWatermark;
  isTamperProofVerified: boolean;
  uploadStatus: MediaUploadStatus;
}

export interface IncidentDraft {
  category: IncidentCategory;
  title: string;
  description: string;
  landmark: string;
  locationName: string;
  region: string;
  locationSource: LocationSource;
  gpsFixAgeSeconds: number | null;
  isAnonymous: boolean;
  reporterPhone: string;
  hasRecordedMedia: boolean;
  recordedUri: string | null;
  mediaType: 'VIDEO' | 'IMAGE';
  recordedDuration: number;
  uploadProgress: number;
  uploadStatusText: string;
  isUploadingMedia: boolean;
  isSubmitting: boolean;
}
