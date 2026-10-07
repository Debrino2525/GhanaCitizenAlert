# ADR-006: Multi-Tiered Red & Amber Alert Authorization State Machine

## Status
**Accepted**

## Context
Broadcasting an Amber Alert (missing child) or Red Alert (active armed threat, fugitive, major disaster) to millions of citizens across a geo-fenced region triggers significant public attention and resource mobilization. A rogue operator, compromised credential, or false alarm could trigger public panic, economic disruption, or severe harassment of innocent individuals.

## Decision
1. **Strict Two-Man Authorization Rule (Four-Eyes Principle):**
   - **Requesting Officer:** Field Investigator / Station Officer (minimum rank: Inspector / ASP) creates the alert dossier, defines the geofence radius, and uploads verified photographs. The alert is saved in state `DRAFT_PENDING_AUTHORIZATION`.
   - **Approving Commander:** Divisional/Regional Police Commander or designated National Emergency Director (minimum rank: Superintendent / COP) must review the evidence dossier and supply an MFA hardware token / digital signature to transition the alert to `BROADCAST_AUTHORIZED`.
2. **Alert Lifecycle & Safety Controls:**
   - **Automatic Expiry:** Every alert has a hard TTL (Time-To-Live, e.g. 24–72 hours) after which it automatically transitions to `EXPIRED` and disappears from active public banners.
   - **Resolution Flow:** When a missing child is recovered or a fugitive is captured, the alert is transitioned to `RESOLVED`, triggering an immediate "Child Safely Found" notification and retiring active broadcasts.
   - **False Alarm Retraction Protocol:** If an alert is issued erroneously, a high-priority `RETRACTED_FALSE_ALARM` cancellation broadcast is pushed immediately with clear clarification to prevent wrongful vigilante action.
3. **Multi-Channel Distribution Engine:**
   - Push Notifications (FCM / APNs) to mobile devices in the PostGIS geofence polygon.
   - Telco SMS / USSD alerts to cell towers in the affected district (via adapter).
   - Cell-Broadcast / National Disaster Warning integration (via adapter).

## Consequences
### Positive
- Prevents accidental, fraudulent, or weaponized alert broadcasts.
- Provides immediate official retractions in the event of human error or rapid case resolution.
