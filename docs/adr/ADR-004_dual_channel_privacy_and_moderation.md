# ADR-004: Dual-Channel Privacy Pipeline & Anti-Vigilantism Guardrails

## Status
**Accepted**

## Context
Deploying a civic reporting app in a national context carries significant ethical and physical safety risks:
1. **Mob Justice / Vigilante Violence:** Naming alleged suspects or publishing unverified accusations can trigger immediate retaliatory attacks or unlawful lynchings.
2. **Defamation & Blackmail:** Malicious actors could weaponize public feeds to smear rivals or community members.
3. **Data Protection & Minor Protection:** Under the **Ghana Data Protection Act, 2012 (Act 843)**, innocent bystanders, minors, and victims of gender-based violence must never have their identities exposed.

## Decision
1. **Private-First Default Policy:**
   - 100% of citizen reports are routed exclusively to **secure, authenticated Law Enforcement & Agency Queues** (Police, DOVVSU, EPA, MTTD).
   - **Zero user-generated submissions appear directly on the public feed upon upload.**
2. **Hard-Coded Blacklist Categories for Public Publication:**
   - The following incident categories are hard-coded in the database schema and moderation state machine as `IS_PUBLIC_ELIGIBLE = FALSE`:
     - `DOMESTIC_ABUSE` / `GENDER_BASED_VIOLENCE`
     - `CHILD_ABUSE_OR_EXPLOITATION`
     - `UNVERIFIED_ACCUSATION_OF_CRIME`
     - `VULNERABLE_VICTIM_INCIDENTS`
3. **Automated Anonymization & Blurring:**
   - For permitted public categories (e.g., road hazards, reckless commercial driving, environmental spills, sanitation violations, or authorized missing person bulletins):
     - The AI pipeline automatically runs facial detection and license plate detection to apply irreversible Gaussian blur to all bystanders and private vehicle registrations.
     - Suspect names and accusatory personal text are stripped from public representations.
4. **Commander Approval Workflow:**
   - An item can only move from `MODERATED` to `PUBLIC_PUBLISHED` with cryptographic digital sign-off from an authorized agency moderator or supervisor.

## Consequences
### Positive
- Strict prevention of vigilantism, defamation, and breach of privacy.
- Total alignment with Act 843 and the 1992 Constitution of Ghana regarding fundamental human rights.
### Negative / Trade-offs
- Public feed operates with a slight moderation latency (typically minutes to an hour for verified community bulletins).
