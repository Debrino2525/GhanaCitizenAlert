# CitizenAlert Ghana — STRIDE Threat Model & Security Posture

## 1. Security Architecture & Threat Landscape
CitizenAlert Ghana operates in a high-adversity environment handling sensitive criminal evidence, whistleblower identities, government agency dispatch, and national emergency broadcast infrastructure.

```
       [ External Adversary / False Reporter ]
                          │ (DDoS, Spoofed GPS, Injected Media, Deepfakes)
                          ▼
       [ Cloudflare WAF + DDoS Shield + Rate Limiting ]
                          │
                          ▼
       [ NestJS API Gateway (mTLS, JWT, Replay Prevention, Schema Validation) ]
                          │
       ┌──────────────────┴──────────────────┐
       ▼                                     ▼
[ Public / Anonymous API ]           [ Authenticated Agency API (MFA, RBAC, ABAC) ]
       │                                     │
       ▼                                     ▼
[ S3 / KMS (Field-Level Encryption) ] [ Immutable PostGIS & Evidence Vault ]
```

---

## 2. STRIDE Threat Analysis Matrix

| Threat Category | Threat Scenario | Impact | Mitigation Strategy in CitizenAlert Ghana |
|:---|:---|:---|:---|
| **Spoofing (Identity & Location)** | • Attacker submits forged GPS coordinates or fake GhanaPost codes.<br>• Attacker spoofs Ghana Card credentials or device identity. | High: False dispatch of emergency units to decoy locations. | • Android Play Integrity API & Apple App Attest.<br>• In-camera direct capture only (prohibits arbitrary gallery uploads for criminal reports).<br>• Hardware GPS triangulation compared with IP ISP location and cell tower latency.<br>• National Identification Authority (NIA) eKYC cryptographic signature verification. |
| **Tampering (Evidence Integrity)** | • Attacker alters video evidence or injects deepfakes after capture.<br>• Corrupt operator modifies evidence hash or alters case details. | Critical: Tainted legal chain-of-custody; miscarriage of justice. | • On-device rolling SHA-256 computation over raw camera frames.<br>• Server-side checksum re-verification upon byte ingestion.<br>• Write-once, read-many (WORM) storage policy on raw S3 evidence bucket.<br>• Append-only cryptographic hash-chained audit ledger (`audit_evidence_ledger`). |
| **Repudiation (Denial of Actions)** | • Officer deletes or alters a sensitive investigation report without record.<br>• Dispatcher denies receiving emergency P0 notification. | High: Loss of administrative accountability; evidence destruction. | • Immutable audit log capturing Actor ID, Role, Client IP, GPS, Timestamp, Action, and Row Delta for every single read/write operation.<br>• Centralized log streaming to SIEM with write-locked retention policies. |
| **Information Disclosure (Data Leakage)** | • Whistleblower reporting high-level corruption or illegal mining (galamsey) is deanonymized.<br>• Bystander faces or domestic abuse victim identities exposed publicly. | Critical: Physical retaliation/assassination of whistleblowers; violation of Act 843. | • Field-Level Encryption (AES-256-GCM) with KMS for all reporter PII.<br>• Strict Anonymous Mode stripping all IP headers, device IDs, and tokens.<br>• Automated face & license plate blurring before public feed release.<br>• Need-to-know RBAC / ABAC scoping access by agency and district. |
| **Denial of Service (DoS / DDoS)** | • Flooding the API gateway with high-bandwidth 60s video uploads or spam reports during an active crisis.<br>• Botnet weaponizing the emergency alert broadcast API. | Critical: System outage preventing genuine emergency response during crisis. | • Cloudflare Anycast DDoS mitigation & web application firewall.<br>• Adaptive token-bucket rate limiting per IP, device token, and subnet.<br>• Pre-signed S3 upload URLs with finite expiration (15 mins) and strict content-length caps ($< 50\text{MB}$).<br>• Asynchronous decoupled ingestion queue (Redis/Kafka) shielding backend database. |
| **Elevation of Privilege** | • Field officer escalates privileges to issue a national Red/Amber Alert without commander approval.<br>• Compromised account accesses confidential DOVVSU domestic violence files. | Critical: Unauthorized broadcast causing national panic; breach of sensitive victim files. | • Mandatory Multi-Factor Authentication (MFA / FIDO2 WebAuthn) for all agency staff.<br>• Strict Four-Eyes Principle (Two-Man Rule) enforced in state machine for alert issuance.<br>• Role-Based and Attribute-Based Access Control (RBAC/ABAC) verified per endpoint. |

---

## 3. Anti-Vigilantism & False-Report Defense Systems

1. **Reporter Trust Scoring Algorithm ($0 - 100$):**
   - New unverified reporters start at Trust Score $50$.
   - Verified Ghana Card eKYC immediately establishes Trust Score $80$.
   - Subsequent corroborated, verified reports increase trust by $+2$ (up to $99$).
   - Confirmed malicious/hoax reports decrease trust by $-35$ and trigger automatic rate-limit cooldowns.
   - Reports from trust scores $< 25$ are routed to a low-priority Spam Review Queue.
2. **Perceptual Image Hashing (pHash) & Semantic Deduplication:**
   - Detects recycled viral internet videos or images from past international incidents being repurposed to cause local panic.
3. **In-App Safety & Anti-Confrontation Disclaimers:**
   - Prominently displays safety warnings prior to video recording: *"Do not endanger yourself. Do not confront suspects. Observe from a safe distance."*
