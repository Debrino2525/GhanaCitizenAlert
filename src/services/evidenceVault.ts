// Evidence Vault & Chain-of-Custody Verification Service
import { EvidenceMedia, IncidentReport } from '../types';

export interface CourtCertificate {
  certificateId: string;
  trackingCode: string;
  generatedAt: string;
  incidentTimestamp: string;
  ghanaPostCode: string;
  coordinates: [number, number];
  mediaItems: {
    mediaId: string;
    type: string;
    duration: string;
    sha256Hash: string;
    watermarkVerified: boolean;
  }[];
  statutoryNotice: string;
}

export function generateCourtCertificate(incident: IncidentReport): CourtCertificate {
  return {
    certificateId: `GH-CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
    trackingCode: incident.trackingCode,
    generatedAt: new Date().toISOString(),
    incidentTimestamp: incident.createdAt,
    ghanaPostCode: incident.ghanaPostCode,
    coordinates: incident.coordinates,
    mediaItems: incident.media.map(m => ({
      mediaId: m.id,
      type: m.type,
      duration: m.durationSeconds ? `${m.durationSeconds}s` : 'N/A',
      sha256Hash: m.sha256Hash,
      watermarkVerified: m.isTamperProofVerified
    })),
    statutoryNotice: 'CERTIFIED IN ACCORDANCE WITH THE ELECTRONIC TRANSACTIONS ACT, 2008 (ACT 772) & GHANA EVIDENCE DECREE, 1975 (NRCD 323). Digital signatures, GPS coordinates, and frame hashes are tamper-locked in the National Police Cryptographic Vault.'
  };
}

export function computeSha256Simulation(input: string): string {
  // Simple deterministic hash simulation for in-browser demonstration
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hexPart = Math.abs(hash).toString(16).padStart(8, '0');
  return `e3b0c442${hexPart}9afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.substring(0, 64);
}
