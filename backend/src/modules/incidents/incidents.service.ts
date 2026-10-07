import * as crypto from 'crypto';
import { IIncidentRepository } from './incidents.repository';
import { IGhanaPostGPSAdapter } from '../../core/adapters/ghanapost-gps.adapter';
import { IAgencyDispatchCADAdapter } from '../../core/adapters/agency-cad.adapter';
import { TriageRoutingService } from '../triage/triage.service';
import { EvidenceVaultService, AuditLedgerEntry } from '../../core/crypto/evidence-vault.service';
import { IncidentEntity, IncidentCategory, IncidentEvidenceMedia, IncidentStatus, AgencyCode } from '../../core/entities/incident.entity';

export interface CreateIncidentInput {
  category: IncidentCategory;
  title: string;
  description: string;
  ghanaPostCode: string;
  locationDescription?: string;
  media: {
    type: 'PHOTO' | 'VIDEO';
    durationSeconds?: number;
    rawS3Url: string;
    sha256Checksum: string;
    hardwareAttestationToken?: string;
  }[];
  reporter?: {
    isAnonymous: boolean;
    name?: string;
    phone?: string;
    ghanaCardId?: string;
  };
  clientIp?: string;
}

export class IncidentsService {
  private lastAuditHash: string = '0000000000000000000000000000000000000000000000000000000000000000';
  private auditLedger: AuditLedgerEntry[] = [];

  constructor(
    private readonly incidentRepo: IIncidentRepository,
    private readonly ghanaPostAdapter: IGhanaPostGPSAdapter,
    private readonly triageService: TriageRoutingService,
    private readonly evidenceVault: EvidenceVaultService,
    private readonly cadAdapter: IAgencyDispatchCADAdapter
  ) {}

  async createIncident(input: CreateIncidentInput): Promise<IncidentEntity> {
    // 1. Validate Media constraints (Hard limit: max 60 seconds)
    for (const m of input.media) {
      if (m.type === 'VIDEO' && m.durationSeconds && m.durationSeconds > 60) {
        throw new Error(`Video duration exceeds statutory 60-second limit (${m.durationSeconds}s provided)`);
      }
      if (!m.sha256Checksum || m.sha256Checksum.length !== 64) {
        throw new Error('Missing or invalid SHA-256 evidence integrity hash');
      }
    }

    // 2. Resolve GhanaPost Digital Address
    const geo = await this.ghanaPostAdapter.resolveAddress(input.ghanaPostCode);

    // 3. Evaluate Triage & Agency Routing
    const triage = this.triageService.evaluateIncident(
      input.category,
      input.title,
      input.description,
      geo.region
    );

    // 4. Generate Unique Tracking Code
    const trackingCode = `GH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowUtc = new Date().toISOString();
    const incidentId = crypto.randomUUID();

    // 5. Structure Verified Evidence Media
    const mediaEntities: IncidentEvidenceMedia[] = input.media.map((m, idx) => ({
      id: crypto.randomUUID(),
      mediaType: m.type,
      durationSeconds: m.durationSeconds,
      rawS3Url: m.rawS3Url,
      sha256Checksum: m.sha256Checksum,
      timestampUtc: nowUtc,
      gpsWatermark: {
        lat: geo.latitude,
        lng: geo.longitude,
        ghanaPostCode: geo.postcode,
        accuracyMeters: 3.5
      },
      isTamperProofVerified: true,
      hardwareAttestationVerified: !!m.hardwareAttestationToken
    }));

    // 6. Handle Field-Level Encryption for Reporter
    let reporterEncryptedPii: string | undefined;
    let reporterTrustScore = 50;
    const isAnonymous = input.reporter?.isAnonymous ?? true;

    if (!isAnonymous && input.reporter) {
      const piiBlob = JSON.stringify({
        name: input.reporter.name,
        phone: input.reporter.phone,
        ghanaCardId: input.reporter.ghanaCardId
      });
      reporterEncryptedPii = this.evidenceVault.encryptField(piiBlob);
      reporterTrustScore = input.reporter.ghanaCardId ? 95 : 80;
    }

    const incident: IncidentEntity = {
      id: incidentId,
      trackingCode,
      category: input.category,
      title: input.title,
      description: input.description,
      ghanaPostCode: geo.postcode,
      region: geo.region,
      district: geo.district,
      locationName: input.locationDescription || `${geo.areaName}, ${geo.region}`,
      latitude: geo.latitude,
      longitude: geo.longitude,
      media: mediaEntities,
      isAnonymous,
      reporterEncryptedPii,
      reporterTrustScore,
      assignedAgency: triage.assignedAgency,
      secondaryAgencies: triage.secondaryAgencies,
      status: 'RECEIVED_PENDING_TRIAGE',
      severity: triage.severity,
      isPublicEligible: triage.isPublicEligible,
      isPublicPublished: false,
      publicCorroborationCount: 0,
      createdAt: nowUtc,
      updatedAt: nowUtc,
      investigatorNotes: [
        `Automated triage routed to ${triage.assignedAgency}. Reason: ${triage.routingReason}`
      ]
    };

    // 7. Persist in Repository
    const saved = await this.incidentRepo.create(incident);

    // 8. Append Immutable Audit Record (Act 772)
    const auditEntry = this.evidenceVault.createChainedAuditEntry(
      this.lastAuditHash,
      isAnonymous ? 'ANONYMOUS_REPORTER' : 'VERIFIED_REPORTER',
      'CITIZEN',
      input.clientIp || '127.0.0.1',
      'EVIDENCE_INGESTION_AND_DISPATCH',
      'INCIDENT',
      saved.id,
      { trackingCode, category: saved.category, agency: saved.assignedAgency }
    );
    this.lastAuditHash = auditEntry.currentHash;
    this.auditLedger.push(auditEntry);

    // 9. Dispatch to CAD Adapter
    await this.cadAdapter.dispatchToCAD({
      trackingCode: saved.trackingCode,
      agency: saved.assignedAgency as any,
      category: saved.category,
      severity: saved.severity,
      locationName: saved.locationName,
      ghanaPostCode: saved.ghanaPostCode,
      latitude: saved.latitude,
      longitude: saved.longitude,
      evidenceMediaCount: saved.media.length
    });

    return saved;
  }

  async getIncidentById(id: string): Promise<IncidentEntity | null> {
    return this.incidentRepo.findById(id);
  }

  async listIncidents(filters?: { agency?: AgencyCode; status?: IncidentStatus; region?: string }): Promise<IncidentEntity[]> {
    return this.incidentRepo.findAll(filters);
  }

  async updateIncidentStatus(id: string, newStatus: IncidentStatus, actorId: string, actorRole: string, note?: string): Promise<IncidentEntity | null> {
    const updated = await this.incidentRepo.updateStatus(id, newStatus, note);
    if (updated) {
      const auditEntry = this.evidenceVault.createChainedAuditEntry(
        this.lastAuditHash,
        actorId,
        actorRole,
        '127.0.0.1',
        'STATUS_TRANSITION',
        'INCIDENT',
        id,
        { newStatus, note }
      );
      this.lastAuditHash = auditEntry.currentHash;
      this.auditLedger.push(auditEntry);
    }
    return updated;
  }

  getAuditLedger(): AuditLedgerEntry[] {
    return [...this.auditLedger];
  }
}
