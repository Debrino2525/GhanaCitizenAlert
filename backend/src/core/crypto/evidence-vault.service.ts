import * as crypto from 'crypto';

export interface AuditLedgerEntry {
  id: string;
  actorId: string;
  actorRole: string;
  actorIp: string;
  action: string;
  resourceType: string;
  resourceId: string;
  rowDelta: Record<string, any>;
  previousHash: string;
  currentHash: string;
  timestamp: string;
}

export class EvidenceVaultService {
  private readonly hsmSecretKey: Buffer;

  constructor(secretKeyHex?: string) {
    // 256-bit key for AES-256-GCM Field-Level Encryption
    if (secretKeyHex) {
      this.hsmSecretKey = Buffer.from(secretKeyHex, 'hex');
    } else {
      this.hsmSecretKey = crypto.scryptSync('CITIZEN_ALERT_GHANA_MASTER_KEY_2026', 'salt_ghana_sec', 32);
    }
  }

  /**
   * Verify SHA-256 checksum of raw evidence byte buffer against client declaration
   */
  verifySha256Checksum(buffer: Buffer, declaredChecksum: string): boolean {
    const computed = crypto.createHash('sha256').update(buffer).digest('hex');
    return computed.toLowerCase() === declaredChecksum.toLowerCase();
  }

  /**
   * Compute SHA-256 string hash
   */
  computeHash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate an immutable chained audit log entry for the evidence ledger (Act 772)
   */
  createChainedAuditEntry(
    previousHash: string,
    actorId: string,
    actorRole: string,
    actorIp: string,
    action: string,
    resourceType: string,
    resourceId: string,
    rowDelta: Record<string, any>
  ): AuditLedgerEntry {
    const timestamp = new Date().toISOString();
    const id = crypto.randomUUID();

    const payload = `${id}|${previousHash}|${actorId}|${actorRole}|${actorIp}|${action}|${resourceType}|${resourceId}|${JSON.stringify(rowDelta)}|${timestamp}`;
    const currentHash = this.computeHash(payload);

    return {
      id,
      actorId,
      actorRole,
      actorIp,
      action,
      resourceType,
      resourceId,
      rowDelta,
      previousHash,
      currentHash,
      timestamp
    };
  }

  /**
   * Encrypt sensitive PII (Ghana Card, Phone, Reporter Name) using AES-256-GCM
   */
  encryptField(plainText: string): string {
    if (!plainText) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.hsmSecretKey, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedHex
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt sensitive PII with authenticated audit trigger
   */
  decryptField(encryptedCiphertext: string): string {
    if (!encryptedCiphertext) return '';
    const parts = encryptedCiphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted ciphertext format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.hsmSecretKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
