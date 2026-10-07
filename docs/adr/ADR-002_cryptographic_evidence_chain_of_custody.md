# ADR-002: Cryptographic Evidence Integrity & Tamper-Evident Chain of Custody

## Status
**Accepted**

## Context
Evidence submitted by citizens (photos and max 60-second video footage) may be used by the Ghana Police Service, State Prosecutors, and courts in criminal proceedings. Under the **Electronic Transactions Act, 2008 (Act 772)** and the **Evidence Decree, 1975 (NRCD 323)**, the court demands proof of integrity, chain-of-custody tracking, and verification that media was not tampered with, spliced, or AI-generated post-capture.

## Decision
1. **In-Camera Capture Verification:**
   - The Flutter mobile app enforces direct in-app camera capture (disallowing arbitrary gallery uploads for criminal incident categories where hardware attestation is mandatory).
   - In-app frame-by-frame SHA-256 rolling digest computed during recording.
   - Hardware attestation (Android Play Integrity API / Apple App Attest) bundle attached to the upload manifest.
   - Embedded cryptographic metadata: UTC GPS timestamp, GhanaPost Digital Address, camera exposure metadata, and device identifier hash.
2. **Server-Side Verification & Storage:**
   - Backend calculates the SHA-256 hash of the uploaded stream immediately on byte arrival and matches it with the client manifest signature.
   - The verified checksum is written to an append-only, immutable `audit_evidence_ledger` table with cryptographic hashing of the preceding log row.
3. **Court Dossier Export:**
   - The system generates an authenticated **Evidence Package (PDF + Cryptographic Manifest JSON)** detailing the complete timeline: capture timestamp, upload timestamp, verification checksum, every officer who accessed the file, and transcode lineage.
4. **Legal Admissibility Disclaimers:**
   - The platform explicitly marks exported dossiers as *"Cryptographically Certified Evidence Package for Legal & Prosecutorial Review under Act 772"* and avoids claiming automatic admissibility prior to judicial ruling.

## Consequences
### Positive
- Robust defense against defense claims of evidence tampering, deepfake injection, or post-hoc editing.
- Uncompromising audit log of every human or system access to evidence files.
### Negative / Trade-offs
- Slight computational overhead on low-end mobile devices during 60s video rolling hash generation (optimized using native C++/Rust Flutter plugins).
