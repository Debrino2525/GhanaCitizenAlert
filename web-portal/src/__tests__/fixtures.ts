import { IncidentReport, EvidenceMedia } from '../types';

export const EMPTY_INPUT_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
export const REAL_SHA256 = 'a'.repeat(64);

export function media(overrides: Partial<EvidenceMedia> = {}): EvidenceMedia {
  return {
    id: 'm1',
    type: 'VIDEO',
    url: '',
    thumbnailUrl: '',
    timestampUtc: '2026-11-13T00:00:00Z',
    isTamperProofVerified: false,
    ...overrides,
  };
}

export function incident(overrides: Partial<IncidentReport> = {}): IncidentReport {
  return {
    id: 'i1',
    trackingCode: 'GH-2026-TEST0001',
    title: 'Test report',
    category: 'CRIMINAL_OFFENSE',
    description: 'A short description of what happened',
    locationName: 'Takoradi',
    region: 'Western',
    coordinates: [4.93, -1.76],
    media: [],
    reporter: { isAnonymous: true, trustScore: 0 },
    assignedAgency: 'GPS_CID',
    status: 'RECEIVED_PENDING_TRIAGE',
    severity: 'HIGH',
    isPublicEligible: false,
    isPublicPublished: false,
    publicCorroborations: 0,
    createdAt: '2026-11-13T00:00:00Z',
    updatedAt: '2026-11-13T00:00:00Z',
    investigatorNotes: [],
    ...overrides,
  } as IncidentReport;
}
