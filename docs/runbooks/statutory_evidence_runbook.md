# Operational Runbook: Court Evidence Export & Chain of Custody
## Ghana Electronic Transactions Act, 2008 (Act 772) & Evidence Decree, 1975 (NRCD 323)

---

## 1. Statutory Background
Under Section 7 of the *Electronic Transactions Act, 2008 (Act 772)*, electronic evidence is admissible in court provided the integrity of the data from the time when it was first generated in its final form is demonstrated.

---

## 2. Generating a Court Evidence Package

1. **Access Authorization:** Only investigating officers assigned to the case or State Prosecutors with `EVIDENCE_EXPORT` permissions can generate a dossier.
2. **Procedure in Police Command Center:**
   - Navigate to the targeted case dossier.
   - Click **"Legal Evidence Vault (Act 772)"**.
   - System verifies the immutable rolling SHA-256 hash match against raw S3 object storage.
   - System compiles the **Authenticated Certificate of Authenticity (PDF & Cryptographic JSON)**.
3. **Contents of Official Package:**
   - Certificate Identifier (`GH-CERT-XXXX-XXXX`).
   - Case Tracking Code and GPS coordinates (WGS84 and GhanaPost Digital Address).
   - In-camera hardware attestation verification flag.
   - SHA-256 digital fingerprint for every video frame stream and photo.
   - Complete access audit log detailing every individual who viewed or exported the media.

---

## 3. Submitting to Court / DPP
1. Attach the signed digital certificate alongside the uncompressed, watermarked video stream on an encrypted, write-locked drive.
2. Reference Section 7 and Section 8 of Act 772 in the filing affidavit.
