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
  | 'FIRE_ACCIDENT';

export type IncidentStatus = 
  | 'RECEIVED_PENDING_TRIAGE'
  | 'DISPATCHED'
  | 'UNDER_ACTIVE_INVESTIGATION'
  | 'COURT_EVIDENCE_PACKAGED'
  | 'RESOLVED'
  | 'DISMISSED';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'AMBER' | 'RED';

export interface EvidenceMedia {
  id: string;
  type: 'VIDEO' | 'PHOTO';
  durationSeconds?: number;
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
  deepfakeScore?: number;
}

export interface IncidentReport {
  id: string;
  trackingCode: string;
  title: string;
  category: IncidentCategory;
  description: string;
  locationName: string;
  ghanaPostCode: string;
  region: string;
  coordinates: [number, number];
  media: EvidenceMedia[];
  reporter: {
    isAnonymous: boolean;
    name?: string;
    phone?: string;
    ghanaCardId?: string;
    trustScore: number;
  };
  assignedAgency: AgencyType;
  secondaryAgencies?: AgencyType[];
  status: IncidentStatus;
  severity: SeverityLevel;
  isPublicEligible: boolean;
  isPublicPublished: boolean;
  publicCorroborations: number;
  createdAt: string;
  updatedAt: string;
  investigatorNotes: string[];
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
  approvingCommanderName?: string;
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

export type OfficerRole = 
  | 'ADMIN'
  | 'NATIONAL_COMMAND_SUPERVISOR'
  | 'POLICE_CID_OFFICER'
  | 'DOVVSU_INVESTIGATOR'
  | 'EPA_INSPECTOR'
  | 'MTTD_OFFICER'
  | 'PUBLIC_MODERATOR'
  | 'CAD_DISPATCHER'
  | string;

export interface OfficerUser {
  id: string;
  name: string;
  badgeNumber: string;
  service_id?: string;
  agency: AgencyType;
  role: OfficerRole;
  rank: string;
  email: string;
  avatarUrl?: string;
  clearanceLevel: 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET' | string;
  station_id?: string;
  is_active?: boolean;
  must_change_password?: boolean;
  created_at?: string;
}

export interface SosPing {
  id: string;
  incident_id: string;
  reporter_id?: string | null;
  lat: number;
  lng: number;
  accuracy: number;
  created_at: string;
}

