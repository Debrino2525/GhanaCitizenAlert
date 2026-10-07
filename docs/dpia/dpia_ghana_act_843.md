# Data Protection Impact Assessment (DPIA) Template
## Republic of Ghana — Data Protection Act, 2012 (Act 843)

**Project / System Name:** CitizenAlert Ghana (National Civic Safety Platform)  
**Data Controller:** Ministry of the Interior / Ghana Police Service / Partner Agencies  
**Data Protection Officer (DPO):** Assigned National Data Protection Officer  
**Assessment Date:** 2026-10-07  
**Filing Status:** Template & Architecture Specification (Pending DPC Review)

---

## 1. Description of the Processing Operations

### 1.1 Nature and Scope of Data Processed
1. **Citizen Reporter Data:**
   - Personal Identifiers: Full Name, Telephone Number, National ID (Ghana Card Number `GHA-XXXXXXXXX-X`), Digital Address (GhanaPost GPS).
   - Anonymous Whistleblower Data: Cryptographic ephemeral device tokens; all PII and network identifiers strictly stripped.
2. **Captured Incident Media & Telemetry:**
   - Raw photographic and video captures (up to 60s), audio streams, EXIF metadata, precise GPS coordinates, device hardware attestation signatures.
3. **Third-Party Bystander & Subject Data:**
   - Facial images of bystanders, vehicular license plates, physical descriptions of suspects, and location timestamps.
4. **Law Enforcement & Agency Operator Data:**
   - Official Badge Number, Station Assignment, Rank, Command Clearance Level, MFA audit records, Case action logs.

### 1.2 Legal Basis for Processing (Act 843, Sections 18–24)
- **Public Interest & National Security (Section 18(1)(b)):** Processing is necessary for the performance of a public task and maintenance of public order and safety by state security agencies.
- **Vital Interests (Section 18(1)(c)):** Processing is necessary to protect the life and physical integrity of citizens (e.g., Amber Alerts for missing children, Red Alerts for active violent threats).
- **Explicit Consent (Section 18(1)(a)):** Verified citizen reporters provide affirmative digital consent for verification and dispatch follow-ups upon onboarding.

---

## 2. Assessment of Necessity and Proportionality

| Principle (Act 843) | Technical & Organizational Safeguard in System |
|:---|:---|
| **Accountability (Section 17)** | Complete cryptographic audit trails recording every read, write, export, and status change by agency officers. |
| **Lawfulness & Fairness (Section 18)** | Private-first default routing; no private individual is exposed to public trial or unverified accusations. |
| **Specification of Purpose (Section 19)** | Data is collected strictly for emergency dispatch, civic incident response, and lawful criminal investigation. |
| **Quality of Information (Section 21)** | High-resolution capture with verifiable GPS, GhanaPost digital addressing, and tamper-evident cryptographic hashes. |
| **Security Safeguards (Sections 27–30)** | Field-Level Encryption (AES-256-GCM), TLS 1.3 in transit, WORM S3 storage, and mandatory MFA for all staff. |
| **Data Subject Rights (Sections 32–43)** | Dedicated citizen appeal and takedown workflow; automated face/plate blurring; right of rectification and access. |

---

## 3. Risk Assessment & Mitigation Actions

| Identified Privacy Risk | Severity | Likelihood | Technical Mitigation Measures |
|:---|:---|:---|:---|
| **1. Exposure of Whistleblower Identity** | Critical | Low | • True Anonymous Mode removing all IP and device telemetry.<br>• Field-Level Encryption with HSM key segregation.<br>• Strict compliance with Whistleblower Act 2006 (Act 720). |
| **2. Public Exposure of Innocent Bystanders** | High | Medium | • Mandatory automated AI Gaussian blurring on all civilian faces and license plates prior to public feed publication.<br>• Human moderator approval required before public release. |
| **3. Accidental Publication of Minor / Domestic Abuse Records** | Critical | Low | • Database-level hard constraints (`is_public_eligible = FALSE`) on DOVVSU, domestic violence, sexual assault, and minor abuse categories. |
| **4. Unauthorized Access by Rogue Staff** | High | Low | • Role-Based and Attribute-Based Access Control (RBAC/ABAC).<br>• Need-to-know geographical and agency access limits.<br>• Real-time SIEM alerts on bulk or sensitive record lookups. |

---

## 4. Data Retention and Deletion Schedule

| Category of Data | Retention Period | Disposal / Archival Policy |
|:---|:---|:---|
| **Unverified / Dismissed Spam Reports** | 30 Days | Cryptographically shredded and purged automatically from database and object storage. |
| **General Civic Infractions (Sanitation, Road Hazards)** | 1 Year Post-Resolution | Anonymized for municipal spatial analytics; raw media moved to cold archive. |
| **Active Criminal Evidence (GPS / CID / DOVVSU)** | 7 Years / Statute of Limitations | Retained in immutable Evidence Vault until formal court disposal order. |
| **Amber / Red Alert Broadcast Dossiers** | 90 Days Post-Resolution | Public banners expired immediately; historical record archived for internal review. |

---

## 5. Formal Sign-Off & Review Requirement
*Note: This document is an engineering DPIA specification. Prior to production national rollout, a formal audit must be conducted by the Data Protection Officer and submitted to the Data Protection Commission (DPC) of Ghana.*
