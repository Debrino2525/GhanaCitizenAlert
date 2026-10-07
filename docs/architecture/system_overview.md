# CitizenAlert Ghana — High-Level System Architecture

## 1. System Vision & Architecture Principles
CitizenAlert Ghana is a mission-critical, national-scale civic safety and emergency response platform built for resilience, strict data protection, evidentiary integrity, and accessibility across all 16 regions of Ghana.

### Core Architectural Principles
1. **Private-First & Safety By Design:** Raw citizen submissions, suspect footage, and private individual details are routed strictly to authenticated government agency queues. Public publication is an intentional, moderated, anonymized, and cryptographically auditable action.
2. **Offline-First & Network Resilient:** Designed to function seamlessly across 2G/3G/4G/5G and intermittent power/network environments with client-side encrypted queues and resumable chunked S3 uploads.
3. **Evidentiary Rigor (Act 772 Compliance):** In-app camera captures embed hardware attestation, UTC timestamp, GPS coordinates, and compute SHA-256 frame hashes on-device before transmission, backed by immutable audit access logs.
4. **Adapter Pattern for Extensibility:** All external national infrastructure (GhanaPost GPS, NIA Ghana Card, Telco SMS/USSD/Cell-Broadcast, Police Dispatch) operates behind strict interface adapters with deterministic, realistic mock fallbacks.
5. **Least Privilege & Role-Based Access (RBAC/ABAC):** Agency operators have scoped access limited strictly by their agency jurisdiction, geographic district, and clearance tier.

---

## 2. End-to-End Component Topology

```mermaid
flowchart TB
    subgraph EdgeLayer["Edge & Gateway Layer (High Availability)"]
        CF["Cloudflare Enterprise\n(WAF, DDoS Shield, Anycast DNS, SSL Termination)"]
        APIGW["NestJS API Gateway / Envoy\n(Rate Limiting, JWT Validation, mTLS, Routing)"]
    end

    subgraph ClientLayer["Client Ecosystem"]
        FlutterApp["Flutter Mobile Client (iOS / Android)\n(Offline SQLite Queue, In-Camera Watermark, Chunked Uploader)"]
        NextWeb["Next.js Operations Portals\n(Command Center, Agency Triage, Mod Console, Public Feed)"]
        USSDTelco["Telco USSD / SMS Bridge (*920#)\n(Hubtel / Arkesel / NCA Mock Gateway)"]
    end

    subgraph CoreBackend["Core Microservices Cluster (NestJS + TypeScript)"]
        AuthSvc["Auth & Identity Service\n(Ghana Card eKYC, OTP, RBAC, MFA)"]
        IncidentSvc["Incident Management Service\n(Triage Engine, Spatial Routing, Case Timelines)"]
        MediaIngestSvc["Media Ingestion Service\n(Pre-Signed S3 URLs, Checksum Validator, Chunker)"]
        AlertEngineSvc["Red & Amber Alert Service\n(Authorization State Machine, Geo-Query, Broadcast Engine)"]
        AuditLedgerSvc["Evidence & Audit Ledger Service\n(Immutable Access Log, Legal Dossier Exporter)"]
        PublicFeedSvc["Public Feed & Corroboration Service\n(Sanitized Views, Community Upvoting)"]
    end

    subgraph AIWorkerPipeline["AI Moderation & Processing Cluster (Python FastAPI + Celery)"]
        MediaTranscoder["FFmpeg Transcoder & HLS Worker\n(4K/1080p -> 720p/480p Adaptive Tiers)"]
        AIModerator["Visual Safety & Deepfake Detector\n(NSFW, Graphic Violence, Manipulation Score)"]
        BlurEngine["Anonymization & Blurring Engine\n(Bystander Face Blurring, License Plate Masking)"]
        NLPTranslation["Speech-to-Text & Translation\n(Whisper / NLLB: English, Twi, Ga, Ewe, Hausa, Pidgin)"]
        Deduplication["Spatial & Visual Deduplication Engine\n(pHash, Geo-clustering, Event Corroboration)"]
    end

    subgraph MessagingStorage["Data & Event Infrastructure"]
        KafkaNATS["Event Broker (Kafka / NATS JetStream)\n(Topic-based async pipeline)"]
        PostgresPostGIS[("PostgreSQL 16 + PostGIS\n(Spatial Data, Incidents, Users, Audits)")]
        RedisCache[("Redis Cluster\n(Session, Geofence Index, Rate Limits, Pub/Sub)")]
        S3Storage[("S3 / Cloudflare R2 Object Storage\n(Encrypted Raw & Redacted Media Buckets)")]
    end

    subgraph NationalAdapters["National Infrastructure Adapters (Interface Driven)"]
        GP_GPS_Adapter["GhanaPost GPS Adapter (Mock/Live)"]
        NIA_Adapter["NIA Ghana Card Adapter (Mock/Live)"]
        Telco_Broadcast_Adapter["Cell-Broadcast & Emergency SMS Adapter (Mock/Live)"]
        Agency_Dispatch_Adapter["GPS / DOVVSU / EPA CAD Adapter (Mock/Live)"]
    end

    ClientLayer --> CF --> APIGW
    APIGW --> CoreBackend
    CoreBackend <--> KafkaNATS
    KafkaNATS <--> AIWorkerPipeline
    CoreBackend <--> PostgresPostGIS
    CoreBackend <--> RedisCache
    CoreBackend <--> S3Storage
    AIWorkerPipeline <--> S3Storage
    CoreBackend <--> NationalAdapters
```

---

## 3. Incident Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT_LOCAL: Captured in Mobile App (Encrypted Local DB)
    DRAFT_LOCAL --> UPLOADING: Connectivity Available (Resumable Chunks)
    UPLOADING --> RECEIVED_PENDING_TRIAGE: SHA-256 Verified by Ingestion Svc
    
    state RECEIVED_PENDING_TRIAGE {
        [*] --> AI_ANALYZING
        AI_ANALYZING --> AUTO_ROUTED: AI Classification & Geo-spatial Match
        AUTO_ROUTED --> AGENCY_INBOX: Routed to (Police/DOVVSU/EPA/MTTD)
    }

    AGENCY_INBOX --> OFFICER_ASSIGNED: Unit Dispatched by Dispatcher
    OFFICER_ASSIGNED --> UNDER_ACTIVE_INVESTIGATION: Field Unit on Scene
    UNDER_ACTIVE_INVESTIGATION --> COURT_EVIDENCE_PACKAGED: Legal Dossier Exported
    COURT_EVIDENCE_PACKAGED --> RESOLVED: Legal or Community Resolution
    
    state PUBLIC_FEED_PIPELINE {
        AGENCY_INBOX --> MODERATOR_REVIEW: Eligible for Public Interest
        MODERATOR_REVIEW --> BLURRED_SANITIZED: AI Blurs Faces & Plates
        BLURRED_SANITIZED --> PUBLIC_PUBLISHED: Commander Approved
        PUBLIC_PUBLISHED --> CORROBORATED: Citizen Tips Received
        PUBLIC_PUBLISHED --> TAKEN_DOWN: Appeal / Investigation Concluded
    }

    RESOLVED --> [*]
    TAKEN_DOWN --> [*]
```

---

## 4. Key Performance & Resilience Targets

| Metric | Target | Architecture Provision |
|:---|:---|:---|
| **Incident Ingestion Latency** | $< 1.5\text{s}$ (metadata acknowledgment) | Async decoupled ingestion via Redis queue + S3 pre-signed upload. |
| **Amber/Red Alert Broadcast Speed** | $< 30\text{s}$ to 1,000,000 devices | Redis Geo-index + FCM parallel topic batches + Telco Cell-Broadcast adapter. |
| **Media Processing Turnaround** | $< 45\text{s}$ for 60-second video | Celery worker pool running hardware-accelerated FFmpeg & lightweight ONNX models. |
| **Offline Resilience** | 100% capture availability | SQLite local database with AES-256-GCM encryption and background auto-sync. |
| **Data Durability & Integrity** | 99.999999999% (11 9s) | Multi-region S3 storage with immutable bucket versioning and SHA-256 checksums. |
