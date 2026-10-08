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
    isVerifiedHex: boolean;
  }[];
  statutoryNotice: string;
}

const HEX_64_REGEX = /^[a-f0-9]{64}$/i;

export function generateCourtCertificate(incident: IncidentReport): CourtCertificate {
  return {
    certificateId: `GH-CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
    trackingCode: incident.trackingCode,
    generatedAt: new Date().toISOString(),
    incidentTimestamp: incident.createdAt,
    ghanaPostCode: incident.ghanaPostCode || 'Not provided',
    coordinates: incident.coordinates,
    mediaItems: incident.media.map(m => {
      const rawHash = m.sha256Hash || (m as any).sha256Checksum || '';
      const isVerifiedHex = HEX_64_REGEX.test(rawHash);
      return {
        mediaId: m.id,
        type: m.type,
        duration: m.durationSeconds ? `${m.durationSeconds}s` : 'N/A',
        sha256Hash: isVerifiedHex ? rawHash : (rawHash ? `${rawHash} (unverified)` : 'unverified'),
        watermarkVerified: Boolean(m.isTamperProofVerified && isVerifiedHex),
        isVerifiedHex
      };
    }),
    statutoryNotice: 'CERTIFIED IN ACCORDANCE WITH THE ELECTRONIC TRANSACTIONS ACT, 2008 (ACT 772) & GHANA EVIDENCE DECREE, 1975 (NRCD 323). Media SHA-256 digests and GPS timestamps recorded upon transmission from the reporting device.'
  };
}
