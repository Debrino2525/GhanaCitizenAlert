import { EvidenceVaultService } from './evidence-vault.service';

describe('EvidenceVaultService', () => {
  let vault: EvidenceVaultService;

  beforeEach(() => {
    vault = new EvidenceVaultService();
  });

  it('should verify matching SHA-256 evidence buffer checksum', () => {
    const rawBuffer = Buffer.from('CITIZEN_ALERT_GHANA_EVIDENCE_STREAM_RAW_BYTES');
    const validChecksum = vault.computeHash(rawBuffer);

    expect(vault.verifySha256Checksum(rawBuffer, validChecksum)).toBe(true);
    expect(vault.verifySha256Checksum(rawBuffer, '0000000000000000000000000000000000000000000000000000000000000000')).toBe(false);
  });

  it('should generate cryptographically chained audit log entries (Act 772)', () => {
    const rootHash = '0000000000000000000000000000000000000000000000000000000000000000';
    
    // Entry 1: Evidence Ingestion
    const entry1 = vault.createChainedAuditEntry(
      rootHash,
      'OFFICER-001',
      'DISPATCHER',
      '192.168.1.1',
      'EVIDENCE_INGESTION',
      'INCIDENT',
      'INC-1234',
      { status: 'RECEIVED' }
    );
    expect(entry1.previousHash).toBe(rootHash);
    expect(entry1.currentHash.length).toBe(64);

    // Entry 2: Status Transition
    const entry2 = vault.createChainedAuditEntry(
      entry1.currentHash,
      'OFFICER-002',
      'COMMANDER',
      '192.168.1.2',
      'STATUS_DISPATCH',
      'INCIDENT',
      'INC-1234',
      { status: 'DISPATCHED' }
    );
    expect(entry2.previousHash).toBe(entry1.currentHash);
    expect(entry2.currentHash).not.toBe(entry1.currentHash);
  });

  it('should perform AES-256-GCM field-level encryption and decryption for sensitive PII', () => {
    const originalPii = JSON.stringify({
      ghanaCardId: 'GHA-712893812-4',
      phone: '+233 24 456 7890',
      name: 'Kwame Mensah'
    });

    const ciphertext = vault.encryptField(originalPii);
    expect(ciphertext).not.toContain('Kwame Mensah');
    expect(ciphertext).not.toContain('GHA-712893812-4');
    expect(ciphertext.split(':').length).toBe(3); // iv:authTag:encrypted

    const decrypted = vault.decryptField(ciphertext);
    expect(decrypted).toBe(originalPii);
  });
});
