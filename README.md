# CitizenAlert Ghana (AsomdwoeWatch) 🇬🇭
### National-Scale Civic Safety, Incident Reporting & Emergency Response Platform

An enterprise, production-grade civic safety platform built for the Republic of Ghana. Designed for high resilience, privacy compliance by design (**Act 843**), cryptographic evidence integrity (**Act 772**), multi-agency dispatch (**Ghana Police Service, DOVVSU, EPA, MTTD, MMDAs**), and national **Amber & Red Emergency Alert** broadcasting.

---

## 🏛️ System Architecture & Subsystems

```
 ┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
 │   Flutter Mobile App    │   │  Web Portals & Command  │   │  Telco SMS/USSD Gateway │
 │ (60s Camera, GPS Stamp) │   │ (Police, Mod, Pub Feed) │   │ (*920# Emergency Tip)   │
 └────────────┬────────────┘   └────────────┬────────────┘   └────────────┬────────────┘
              │                             │                             │
              ▼                             ▼                             ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────┐
 │                  Cloudflare WAF / Anycast DDoS Shield & API Gateway                 │
 └──────────────────────────────────────────┬──────────────────────────────────────────┘
                                            ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────┐
 │                       Core Backend (NestJS / TypeScript)                            │
 │  ├── GhanaPost GPS & NIA eKYC Adapters       ├── Incident Ingestion & 60s Limiter   │
 │  ├── Evidence Vault & Hash Chaining (Act 772)├── Multi-Agency Triage Routing        │
 │  └── Two-Man Red/Amber Alert Engine          └── AES-256-GCM Field Level Encryption │
 └───────────────────────┬──────────────────────────────────┬──────────────────────────┘
                         ▼                                  ▼
 ┌──────────────────────────────────────┐   ┌──────────────────────────────────────────┐
 │  AI Moderation Pipeline (Python)     │   │ Data & Event Infrastructure              │
 │  ├── Face & License Plate Blurring   │   │  ├── PostgreSQL 16 + PostGIS 3.4 Spatial │
 │  ├── Graphic Violence & Deepfake Mod │   │  ├── Redis Cluster 7.2 Geofencing        │
 │  ├── Ghanaian Speech Translation     │   │  ├── NATS JetStream Event Broker         │
 │  └── Spatio-Temporal Deduplication   │   │  └── MinIO / S3 WORM Object Storage      │
 └──────────────────────────────────────┘   └──────────────────────────────────────────┘
```

---

## 🌟 Key Functional Pillars

1. **In-App Camera Capture (Max 60 Seconds):**
   * Hardware-enforced 60-second video duration cap with rolling SHA-256 frame digests.
   * In-camera viewfinder watermarking: UTC timestamp, GPS coordinates, GhanaPost Digital Address.
2. **Cryptographic Evidence Vault (Act 772 Compliance):**
   * Authenticated Certificate of Authenticity generation for court proceedings.
   * Append-only immutable `audit_evidence_ledger` with cryptographic hash chaining.
3. **Multi-Agency Automated Triage:**
   * **Ghana Police Service / CID:** Armed robbery, assault, violent crimes.
   * **DOVVSU:** Domestic abuse and child endangerment (**hardcoded 100% confidential privacy gate**).
   * **EPA / Forestry Commission:** Galamsey, illegal mining, and water pollution.
   * **MTTD / DVLA:** Dangerous driving, traffic violations.
   * **MMDAs (AMA, KMA, etc.):** Sanitation, unpermitted structures, waste dumping.
4. **Emergency Red & Amber Alert Broadcasts:**
   * Two-Man Commander Rule (Four-Eyes Principle) with mandatory Commander MFA.
   * Geofenced radius push notifications, cell-broadcast, and emergency SMS dispatch.
   * Real-time citizen sighting tip collation.
5. **Ghana Data Protection Act (Act 843) Safeguards:**
   * Automated Gaussian face and vehicle license plate blurring before public release.
   * Formal Citizen Appeal & Takedown portal (Sections 32–43).
   * Anonymous Whistleblower mode under the **Whistleblower Act, 2006 (Act 720)**.

---

## 🧪 Running Automated Test Suites

### 1. Backend Core Test Suite (NestJS / Jest)
```bash
cd backend
npm test
```
*Result: 5 test suites passed, 18 unit/integration tests passed.*

### 2. Mobile App Test Suite (Flutter)
```bash
cd mobile
flutter test test/mobile_services_test.dart
```

### 3. AI Pipeline Test Suite (Python / Pytest)
```bash
cd ai-pipeline
pytest tests/test_ai_pipeline.py
```

---

## 🚀 Running the Full Stack Locally via Docker Compose

```bash
cd infra
docker-compose up -d
```

Services will be accessible at:
* **Web Portals & Command Center:** `http://localhost:3000`
* **Core Backend REST API:** `http://localhost:4000/v1`
* **AI Moderation Microservice:** `http://localhost:8000`
* **MinIO Object Storage Console:** `http://localhost:9001`
* **PostgreSQL + PostGIS:** `localhost:5432`

---

## 📚 Documentation & Specifications

* **System Architecture Overview:** [docs/architecture/system_overview.md](docs/architecture/system_overview.md)
* **Architectural Decision Records (ADRs 001–006):** [docs/adr/](docs/adr/)
* **STRIDE Threat Model & Security Posture:** [docs/security/threat_model.md](docs/security/threat_model.md)
* **Data Protection Impact Assessment (Act 843):** [docs/dpia/dpia_ghana_act_843.md](docs/dpia/dpia_ghana_act_843.md)
* **OpenAPI 3.1 REST Specification:** [docs/api/openapi.yaml](docs/api/openapi.yaml)
* **Operational Runbooks:** [docs/runbooks/](docs/runbooks/)
* **Legal, Policy & Partnership Action Items:** [LEGAL_AND_POLICY_TODO.md](LEGAL_AND_POLICY_TODO.md)
