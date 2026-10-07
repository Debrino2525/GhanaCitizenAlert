# ADR-005: Field-Level Encryption & Reporter Identity Vault (Act 843 & Act 720)

## Status
**Accepted**

## Context
Citizens reporting sensitive incidents (such as illegal mining/galamsey involving powerful interests, organized crime, or official misconduct) face existential threats of physical retaliation if their personal identity is compromised. The **Whistleblower Act, 2006 (Act 720)** and **Data Protection Act, 2012 (Act 843)** require strict confidentiality of reporter identities.

## Decision
1. **Two Distinct Reporter Modes:**
   - **Verified Mode:** Reporter links their Ghana Card (GHA-XXXXXXXXX-X) or phone number. Used to establish trust scores, receive SMS status updates, and qualify for formal civic rewards.
   - **Anonymous Whistleblower Mode:** All device telemetry, IP headers, IMSI/IMEI identifiers, and reporter personal data are stripped at the API gateway layer before database ingestion. The report is keyed only to an ephemeral cryptographic token held in the client's secure enclave (Keystore / Keychain).
2. **Field-Level Encryption (FLE) for Reporter Records:**
   - For Verified Reporters, sensitive PII fields (name, phone, Ghana Card, GPS home location) are encrypted using AES-256-GCM before writing to the database, with encryption keys managed in a dedicated Hardware Security Module (HSM / AWS KMS / Vault).
   - Database administrators, standard analysts, and non-investigating officers see only masked records (`GHA-****-****-4`).
   - Decryption is locked behind an explicit, audited, high-privilege permission (`REPORTER_PII_READ`) that triggers an immediate immutable alert in the security operations center (SOC).

## Consequences
### Positive
- Whistleblower identity cannot be leaked even in the event of an SQL database dump or unauthorized low-level database inspection.
- Full compliance with Ghana Whistleblower Act 720.
