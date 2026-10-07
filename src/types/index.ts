export type AgencyType = 
  | 'GPS_CID'        // Ghana Police Service - Criminal Investigation Dept
  | 'DOVVSU'         // Domestic Violence & Victim Support Unit
  | 'EPA'            // Environmental Protection Agency (Galamsey/Pollution)
  | 'MTTD'           // Motor Traffic & Transport Directorate
  | 'NADMO'          // National Disaster Management Organisation
  | 'AMA'            // Accra Metropolitan Assembly (Sanitation/Building)
  | 'KMA'            // Kumasi Metropolitan Assembly
  | 'FORESTRY_COMM'; // Forestry Commission

export type IncidentCategory = 
  | 'CRIMINAL_OFFENSE'
  | 'DOMESTIC_ABUSE'
  | 'GALAMSEY_ENVIRONMENTAL'
  | 'TRAFFIC_RECKLESS'
  | 'MISSING_PERSON'
  | 'SANITATION_ZONING'
  | 'FIRE_ACCIDENT'
  | 'COMMUNITY_DISPUTE';

export type IncidentStatus = 
  | 'PENDING_TRIAGE'
  | 'DISPATCHED'
  | 'UNDER_INVESTIGATION'
  | 'COURT_EVIDENCE_FILED'
  | 'RESOLVED'
  | 'DISMISSED';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'AMBER' | 'RED';

export interface EvidenceMedia {
  id: string;
  type: 'VIDEO' | 'PHOTO';
  durationSeconds?: number; // Capped at 60s
  url: string;
  thumbnailUrl: string;
  sha256Hash: string;
  timestampUtc: string;
  gpsWatermark: {
    lat: number;
    lng: number;
    ghanaPostCode: string;
    accuracyMeters: number;
  };
  blurredPublicUrl?: string;
  isTamperProofVerified: boolean;
}

export interface IncidentReport {
  id: string;
  trackingCode: string; // e.g. GH-2026-X892
  title: string;
  category: IncidentCategory;
  description: string;
  locationName: string;
  ghanaPostCode: string; // e.g. GA-183-9022, AK-039-4421
  region: 'Greater Accra' | 'Ashanti' | 'Western' | 'Eastern' | 'Central' | 'Northern' | 'Volta';
  coordinates: [number, number]; // [lat, lng]
  media: EvidenceMedia[];
  reporter: {
    isAnonymous: boolean;
    name?: string;
    phone?: string;
    ghanaCardId?: string; // GHA-XXXXXXXXX-X
    trustScore: number; // 0-100
  };
  assignedAgency: AgencyType;
  secondaryAgencies?: AgencyType[];
  status: IncidentStatus;
  severity: SeverityLevel;
  isPublicSafe: boolean; // Cleared by AI / Police for public feed
  publicCorroborations: number;
  createdAt: string;
  updatedAt: string;
  investigatorNotes?: string[];
}

export interface EmergencyAlert {
  id: string;
  alertType: 'AMBER' | 'RED' | 'CIVIL_DISASTER';
  title: string;
  subjectName?: string;
  subjectAge?: number;
  subjectPhotoUrl: string;
  lastSeenLocation: string;
  ghanaPostCode: string;
  centerCoordinates: [number, number];
  radiusKm: number;
  details: string;
  suspectDetails?: string;
  vehicleDetails?: string;
  isActive: boolean;
  issuedByAgency: AgencyType;
  issuingOfficerName: string;
  badgeNumber: string;
  activeUntil: string;
  createdAt: string;
  sightingsCount: number;
}

export interface SightingTip {
  id: string;
  alertId: string;
  timestamp: string;
  locationName: string;
  ghanaPostCode: string;
  coordinates: [number, number];
  comment: string;
  photoUrl?: string;
  reporterPhone?: string;
  isVerified: boolean;
}
