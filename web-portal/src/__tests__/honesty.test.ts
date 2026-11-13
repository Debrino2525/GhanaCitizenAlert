import { describe, it, expect } from 'vitest';
import { evidencePathFromUrl, isCaseClosed } from '../components/dashboard/caseHelpers';
import { normaliseRegion } from '../components/AnalyticsDashboard';
import { generatePoliceCaseBrief } from '../services/geminiAiService';
import { generateCourtCertificate } from '../services/evidenceVault';
import { incident, media, EMPTY_INPUT_SHA256, REAL_SHA256 } from './fixtures';

const BASE = 'https://fqgujgwdgqlxnpmpmiui.supabase.co/storage/v1/object';

describe('evidencePathFromUrl (private evidence must go through signed URLs)', () => {
  it('recognises public, signed and authenticated evidence links', () => {
    expect(evidencePathFromUrl(`${BASE}/public/evidence/GH-1.mp4`)).toBe('GH-1.mp4');
    expect(evidencePathFromUrl(`${BASE}/sign/evidence/a%20b.mp4?token=x`)).toBe('a b.mp4');
    expect(evidencePathFromUrl(`${BASE}/authenticated/evidence/x/y.jpg#t`)).toBe('x/y.jpg');
  });
  it('ignores other buckets and non-storage links', () => {
    expect(evidencePathFromUrl(`${BASE}/public/alert-photos/p.jpg`)).toBeNull();
    expect(evidencePathFromUrl('https://example.com/evidence/x.mp4')).toBeNull();
    expect(evidencePathFromUrl('')).toBeNull();
  });
});

describe('isCaseClosed', () => {
  it('treats resolved, dismissed and reporter-cancelled as closed', () => {
    expect(isCaseClosed({ status: 'RESOLVED', title: 'x' })).toBe(true);
    expect(isCaseClosed({ status: 'DISMISSED', title: 'x' })).toBe(true);
    expect(isCaseClosed({ status: 'RECEIVED_PENDING_TRIAGE', title: 'SOS (STAND DOWN / CANCELLED)' })).toBe(true);
  });
  it('keeps open cases open', () => {
    expect(isCaseClosed({ status: 'RECEIVED_PENDING_TRIAGE', title: 'SOS BEACON (ACTIVE)' })).toBe(false);
    expect(isCaseClosed({ status: 'DISPATCHED', title: 'x' })).toBe(false);
  });
});

describe('normaliseRegion', () => {
  it('merges spellings of the same region and labels missing ones honestly', () => {
    expect(normaliseRegion('Western Region')).toBe('Western');
    expect(normaliseRegion('western')).toBe('Western');
    expect(normaliseRegion('UNKNOWN')).toBe('Not recorded');
    expect(normaliseRegion('')).toBe('Not recorded');
  });
});

describe('case summary (rule-based, not AI) never invents evidence integrity', () => {
  it('never shows the empty-input hash as a seal', async () => {
    const noMedia = await generatePoliceCaseBrief(incident());
    const noHash = await generatePoliceCaseBrief(incident({ media: [media()] }));
    for (const brief of [noMedia, noHash]) {
      expect(brief.forensicEvidenceAudit.sha256Seal).not.toBe(EMPTY_INPUT_SHA256);
      expect(brief.forensicEvidenceAudit.tamperProofStatus).not.toMatch(/VERIFIED/);
    }
    expect(noMedia.forensicEvidenceAudit.evidenceCount).toBe(0);
    expect(noMedia.forensicEvidenceAudit.tamperProofStatus).toBe('NO_EVIDENCE');
    expect(noHash.forensicEvidenceAudit.tamperProofStatus).toBe('NO_HASH_RECORDED');
  });

  it('reports the real device hash from sha256Checksum (the field the app stores)', async () => {
    const brief = await generatePoliceCaseBrief(incident({ media: [media({ sha256Checksum: REAL_SHA256 })] }));
    expect(brief.forensicEvidenceAudit.sha256Seal).toBe(REAL_SHA256);
    expect(brief.forensicEvidenceAudit.tamperProofStatus).toBe('DEVICE_HASH_RECORDED_NOT_INDEPENDENTLY_VERIFIED');
  });

  it('does not claim a deepfake check or a database cross-reference', async () => {
    const brief = await generatePoliceCaseBrief(incident({ media: [media()] }));
    expect(brief.forensicEvidenceAudit.deepfakeAuditScore).toBeNull();
    expect(brief.suspectAndVehicleIntelligence).not.toMatch(/Cross-referenced|Central Database/i);
    expect(brief.forensicEvidenceAudit.chainOfCustodySummary).not.toMatch(/NTP|atomic|hardware watermark/i);
    expect(brief.dossierNumber).not.toMatch(/AI/);
  });
});

describe('evidence summary is not presented as a certificate', () => {
  it('says it is not a certificate under Act 772', () => {
    const cert = generateCourtCertificate(incident());
    expect(cert.statutoryNotice).toMatch(/not a certificate/i);
    expect(cert.statutoryNotice).not.toMatch(/^CERTIFIED/);
  });
  it('reads the hash the app stores and marks missing ones unverified', () => {
    const withHash = generateCourtCertificate(incident({ media: [media({ sha256Checksum: REAL_SHA256 })] }));
    expect(withHash.mediaItems[0].sha256Hash).toBe(REAL_SHA256);
    expect(withHash.mediaItems[0].isVerifiedHex).toBe(true);
    const without = generateCourtCertificate(incident({ media: [media()] }));
    expect(without.mediaItems[0].sha256Hash).toBe('unverified');
  });
});
