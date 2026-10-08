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

export type GpsLockStatus = 'LOCATING' | 'LOCKED' | 'ERROR';

export interface GpsWatermark {
  lat: number;
  lng: number;
  landmark: string;
  ghanaPostCode: string;
  accuracyMeters: number;
}

export type MediaUploadStatus =
  | 'QUEUED'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'UPLOAD_FAILED'
  | 'RETRYING';

export interface EvidenceMediaItem {
  type: 'VIDEO' | 'IMAGE';
  video_storage_path: string;
  durationSeconds: number;
  rawS3Url: string;
  thumbnailUrl: string;
  localUri: string;
  sha256Checksum: string;
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
  ghanaPostCode: string;
  region: string;
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
