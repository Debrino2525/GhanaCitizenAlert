# ADR-003: Adapter Pattern for External Telephony, Geocoding & National Agency Integrations

## Status
**Accepted**

## Context
A production-grade national system must integrate with numerous external third parties:
- **GhanaPost GPS** for official digital address resolution.
- **National Identification Authority (NIA)** for Ghana Card eKYC.
- **SMS & USSD Aggregators** (Hubtel, Arkesel, mNotify, AT/Telecel/MTN direct).
- **National Emergency Broadcast (Cell Broadcast / NCA)**.
- **Law Enforcement CAD Systems** (Ghana Police Service, DOVVSU, EPA dispatch).

Because official agency APIs, credentials, and MOUs are subject to administrative procurement and rollout schedules, the codebase must never break or couple tightly to unready third parties, nor can it use fragile hardcoded fake data.

## Decision
1. **Strict Interface Definitions:** Define clean, domain-specific TypeScript interfaces in `core/adapters/`:
   - `IGhanaPostGPSAdapter`
   - `INIAVerificationAdapter`
   - `ISMSUSSDGatewayAdapter`
   - `ICellBroadcastAdapter`
   - `IAgencyDispatchAdapter`
2. **Deterministic Mock Implementations with Production Flags:**
   - Every adapter must provide a high-fidelity, deterministic `Mock*Adapter` (with simulated network latency, realistic error states, and mathematical Ghanaian spatial coordinate mapping) alongside the `Live*Adapter`.
   - Adapters are injected dynamically via NestJS configuration and environment variables (e.g., `GHANAPOST_ADAPTER_DRIVER=mock|live_http`).
   - Every mock is explicitly flagged in logging and telemetry headers (`x-mock-adapter: true`) to prevent mistaking test telemetry for real statutory agency events.

## Consequences
### Positive
- Full local and CI testability without relying on external network dependencies.
- Rapid onboarding of new telco or governmental APIs by simply implementing a new adapter class.
- Zero breaking changes to core business logic when upgrading from mock to live integrations.
