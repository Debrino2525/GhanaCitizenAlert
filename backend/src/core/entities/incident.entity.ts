export type IncidentCategory = 
  | 'CRIMINAL_OFFENSE'
  | 'DOMESTIC_ABUSE'
  | 'GALAMSEY_ENVIRONMENTAL'
  | 'TRAFFIC_RECKLESS'
  | 'MISSING_PERSON'
  | 'SANITATION_ZONING'
  | 'FIRE_ACCIDENT';

export type IncidentStatus = 
  | 'RECEIVED_PENDING_TRIAGE'
  | 'DISPATCHED'
  | 'UNDER_ACTIVE_INVESTIGATION'
  | 'COURT_EVIDENCE_PACKAGED'
  | 'RESOLVED'
  | 'DISMISSED';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'AMBER' | 'RED';

export type AgencyCode = 'GPS_CID' | 'DOVVSU' | 'EPA' | 'MTTD' | 'NADMO' | 'AMA' | 'KMA' | 'FORESTRY_COMM';

export interface IncidentEvidenceMedia {
  id: string;
  mediaType: 'PHOTO' | 'VIDEO';
  durationSeconds?: number;
  rawS3Url: string;
  blurredPublicS3Url?: string;
  sha256Checksum: string;
  timestampUtc: string;
  gpsWatermark: {
    lat: number;
    lng: number;
    ghanaPostCode: string;
    accuracyMeters: number;
  };
  isTamperProofVerified: boolean;
  hardwareAttestationVerified: boolean;
}

export interface IncidentEntity {
  id: string;
  trackingCode: string;
  category: IncidentCategory;
  title: string;
  description: string;
  ghanaPostCode: string;
  region: string;
  district: string;
  locationName: string;
  latitude: number;
  longitude: number;
  media: IncidentEvidenceMedia[];
  reporterId?: string;
  isAnonymous: boolean;
  reporterEncryptedPii?: string; // AES-256-GCM
  reporterTrustScore: number;
  assignedAgency: AgencyCode;
  secondaryAgencies: AgencyCode[];
  status: IncidentStatus;
  severity: SeverityLevel;
  isPublicEligible: boolean;
  isPublicPublished: boolean;
  publicCorroborationCount: number;
  createdAt: string;
  updatedAt: string;
  investigatorNotes: string[];
}
