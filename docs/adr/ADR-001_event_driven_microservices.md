# ADR-001: Event-Driven Microservices Architecture with NestJS & NATS/Kafka

## Status
**Accepted**

## Context
CitizenAlert Ghana must ingest real-time reports, high-volume video uploads, geolocation updates, and broadcast emergency alerts to millions of mobile devices. A synchronous monolith architecture would suffer from severe cascading failures during national emergencies (e.g. major disasters or Amber Alerts) and bottleneck the media transcoding and AI moderation pipeline.

## Decision
1. **Core Backend Framework:** **NestJS (TypeScript)** utilizing clean modular architecture, Dependency Injection, and strict domain boundaries.
2. **Event Broker:** **NATS JetStream / Apache Kafka** for asynchronous decoupling between:
   - Incident ingestion and heavy media transcoding
   - AI moderation (visual moderation, face blurring, STT)
   - Real-time notification dispatch (FCM, SMS, Cell Broadcast)
   - Audit logging and telemetry
3. **Communication Protocols:**
   - Client-to-Backend: RESTful HTTP/3 & HTTPS with OpenAPI contracts; WebSockets (Socket.io) for real-time dispatch dashboard updates.
   - Inter-Service: Asynchronous pub/sub over NATS JetStream with protobuf/JSON schemas.

## Consequences
### Positive
- Heavy AI and transcoding tasks cannot block incident ingestion or police dispatch.
- Resilient message retry mechanisms and dead-letter queues (DLQ) guarantee zero data loss for citizen evidence.
- Scalable worker pools for AI and video processing can autoscale independently on GPU/CPU nodes.

### Negative / Trade-offs
- Eventual consistency across search indices and public feeds (mitigated with optimistic UI updates and Redis cache).
- Increased operational complexity in local developer environments (mitigated with unified Docker Compose setups).
