import { IncidentsService } from './incidents.service';
import { InMemoryIncidentRepository } from './incidents.repository';
import { MockGhanaPostGPSAdapter } from '../../core/adapters/ghanapost-gps.adapter';
import { MockAgencyDispatchCADAdapter } from '../../core/adapters/agency-cad.adapter';
import { TriageRoutingService } from '../triage/triage.service';
import { EvidenceVaultService } from '../../core/crypto/evidence-vault.service';

describe('IncidentsService Integration', () => {
  let service: IncidentsService;
  let repo: InMemoryIncidentRepository;
  let ghanaPostAdapter: MockGhanaPostGPSAdapter;
  let triageService: TriageRoutingService;
  let evidenceVault: EvidenceVaultService;
  let cadAdapter: MockAgencyDispatchCADAdapter;

  beforeEach(() => {
    repo = new InMemoryIncidentRepository();
    ghanaPostAdapter = new MockGhanaPostGPSAdapter();
    triageService = new TriageRoutingService();
    evidenceVault = new EvidenceVaultService();
    cadAdapter = new MockAgencyDispatchCADAdapter();

    service = new IncidentsService(
      repo,
      ghanaPostAdapter,
      triageService,
      evidenceVault,
      cadAdapter
    );
  });

  it('should successfully ingest an incident, enforce 60s media cap, resolve GPS, encrypt reporter PII, and append audit ledger', async () => {
    const validChecksum = evidenceVault.computeHash('sample-video-bytes');

    const result = await service.createIncident({
      category: 'CRIMINAL_OFFENSE',
      title: 'Armed Break-in Attempt',
      description: 'Suspects fleeing towards Shiashie in black sedan',
      ghanaPostCode: 'GA-382-9104',
      media: [
        {
          type: 'VIDEO',
          durationSeconds: 45, // Under 60s
          rawS3Url: 'https://s3.safety.gov.gh/raw/med-001.mp4',
          sha256Checksum: validChecksum,
          hardwareAttestationToken: 'attest_android_play_integrity_token'
        }
      ],
      reporter: {
        isAnonymous: false,
        name: 'Kwame Mensah',
        phone: '+233 24 456 7890',
        ghanaCardId: 'GHA-712893812-4'
      },
      clientIp: '197.251.140.22'
    });

    expect(result.trackingCode).toMatch(/^GH-2026-\d{4}$/);
    expect(result.assignedAgency).toBe('GPS_CID');
    expect(result.region).toBe('Greater Accra');
    expect(result.media[0].durationSeconds).toBe(45);
    expect(result.media[0].isTamperProofVerified).toBe(true);
    expect(result.reporterEncryptedPii).toBeDefined();
    expect(result.reporterTrustScore).toBe(95);

    // Verify Audit Ledger Entry Chained
    const ledger = service.getAuditLedger();
    expect(ledger.length).toBe(1);
    expect(ledger[0].action).toBe('EVIDENCE_INGESTION_AND_DISPATCH');
    expect(ledger[0].resourceId).toBe(result.id);
  });

  it('should reject video uploads exceeding the 60-second limit', async () => {
    const validChecksum = evidenceVault.computeHash('sample-long-video');

    await expect(
      service.createIncident({
        category: 'TRAFFIC_RECKLESS',
        title: 'Reckless Driver',
        description: 'Speeding on N1 Highway',
        ghanaPostCode: 'GA-112-4091',
        media: [
          {
            type: 'VIDEO',
            durationSeconds: 75, // Exceeds 60s
            rawS3Url: 'https://s3.safety.gov.gh/raw/long.mp4',
            sha256Checksum: validChecksum
          }
        ]
      })
    ).rejects.toThrow('Video duration exceeds statutory 60-second limit');
  });

  it('should support anonymous mode and strip all reporter identifiers', async () => {
    const validChecksum = evidenceVault.computeHash('anon-sample');

    const result = await service.createIncident({
      category: 'GALAMSEY_ENVIRONMENTAL',
      title: 'Illegal Mining in Forest Reserve',
      description: 'Heavy excavators operating deep in Atewa forest',
      ghanaPostCode: 'ER-104-9921',
      media: [
        {
          type: 'PHOTO',
          rawS3Url: 'https://s3.safety.gov.gh/raw/photo.jpg',
          sha256Checksum: validChecksum
        }
      ],
      reporter: {
        isAnonymous: true
      }
    });

    expect(result.isAnonymous).toBe(true);
    expect(result.reporterEncryptedPii).toBeUndefined();
    expect(result.assignedAgency).toBe('EPA');
  });
});
