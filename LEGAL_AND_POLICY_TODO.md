# CitizenAlert Ghana — Legal, Policy & Partnership Input Register
Last Updated: 2026-10-07

This document tracks all external policy determinations, statutory reviews, memorandum of understanding (MoU) requirements, and partner integrations that require official sign-off or credential provisioning from national authorities and legal counsel.

---

## 1. Statutory & Legal Review Required

| ID | Domain | Description | Responsible Authority / Stakeholder | Status |
|:---|:---|:---|:---|:---|
| `LEG-001` | **Evidence Admissibility** | Formal review of the digital chain-of-custody packaging (SHA-256 frame hashes, hardware attestation, and immutable access logging) under the **Electronic Transactions Act, 2008 (Act 772)** and **Evidence Decree, 1975 (NRCD 323)**. Note: The platform does *not* self-certify legal admissibility without judicial or prosecutorial vetting. | Attorney-General's Dept / GPS Legal Directorate | `PENDING_REVIEW` |
| `LEG-002` | **Data Protection Impact Assessment (DPIA)** | Formal filing and audit with the **Data Protection Commission (DPC)** under the **Ghana Data Protection Act, 2012 (Act 843)** for processing high-risk sensitive media (facial images, criminal infractions, location traces). | Data Protection Commission (Ghana) | `DRAFTED_IN_REPO` |
| `LEG-003` | **Whistleblower & Anonymous Protections** | Verification of encryption key segregation and court-order subpoena thresholds for anonymous whistleblower data under the **Whistleblower Act, 2006 (Act 720)**. | Office of the Special Prosecutor / Judicial Service | `PENDING_REVIEW` |
| `LEG-004` | **Takedown & Right to be Forgotten** | Formalization of the citizen appeal and takedown SLA for individuals claiming misidentification or defamation in moderated public bulletins. | Ministry of Communications & Digitalisation | `PENDING_POLICY` |
| `LEG-005` | **National Police Cryptographic Vault Hardware Key Integration** | Integration of dedicated Hardware Security Module (HSM) / National Cryptographic Vault for true server-side signing and evidence sealing under **Act 772**. (Currently client-computed SHA-256 digests and GPS timestamps are recorded; server-side cryptographic hardware vault sealing is pending official deployment). | GPS Cybercrime Directorate / NITA | `PENDING_DEPLOYMENT` |

---

## 2. Institutional & Agency Partnership Agreements (MoUs)

| ID | Agency | Scope of Integration & SLA | Interface Adapter | Status |
|:---|:---|:---|:---|:---|
| `MOU-001` | **Ghana Police Service (GPS / CID / DOVVSU / MTTD)** | Direct dispatch routing, officer role-based access, Amber/Red Alert authorization protocols, and secure Evidence Vault access. | `GPSAdapter` (Mocked in `core/adapters`) | `MOU_PENDING` |
| `MOU-002` | **National Identification Authority (NIA)** | Ghana Card eKYC identity verification API access for Verified Reporter tier. | `NIAAdapter` (Mocked in `core/adapters`) | `API_ACCESS_PENDING` |
| `MOU-003` | **GhanaPost (GhanaPost GPS)** | Direct production access to official National Digital Addressing geocoding API. | `GhanaPostGPSAdapter` (Mocked in `core/adapters`) | `API_ACCESS_PENDING` |
| `MOU-004` | **Environmental Protection Agency (EPA) & Forestry Commission** | Dedicated agency triage queues for illegal mining (*galamsey*), river pollution, and forestry encroachment. | `EPAAgencyAdapter` (Mocked in `core/adapters`) | `MOU_PENDING` |
| `MOU-005` | **National Communications Authority (NCA) & Telcos (MTN, Telecel, AT)** | Cell-Broadcast and national Emergency SMS/USSD shortcode provisioning (`*920#` or dedicated civic safety shortcode). | `CellBroadcastAdapter` / `SMSUSSDAdapter` (Mocked) | `GATEWAY_PENDING` |
| `MOU-006` | **NADMO & Ghana National Fire Service (GNFS)** | Disaster, flooding, and major fire event routing. | `NADMOAdapter` (Mocked in `core/adapters`) | `MOU_PENDING` |

---

## 3. Operational Policy Decisions Required

1. **Amber / Red Alert Authorization Hierarchy:**
   - Confirm minimum rank required for alert submission: Chief Inspector or ASP?
   - Confirm minimum rank required for alert approval & broadcast: Regional Commander or Commissioner of Police (COP)?
2. **Public Feed Publishing Policy:**
   - Confirm list of auto-blocked categories (e.g. any incident alleging sex crimes, domestic abuse, or minors is strictly hard-coded to Agency-Only).
   - Standardize blurring threshold (all bystander faces, all civilian vehicle license plates blurred; official emergency service vehicles exempt).
3. **Citizen Trust Score Penalty Schedule:**
   - Establish penalty points for verified malicious false reports (e.g., trust score reduction, temporary cooldown, referral to police cybercrime unit for serial malicious reporting).
