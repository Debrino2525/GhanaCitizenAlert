# CitizenAlert Ghana — Core Backend Service 🇬🇭

Production-grade NestJS backend service powering incident capture, 60-second evidence verification, GhanaPost GPS geocoding, multi-agency triage dispatch, cryptographic evidence vault (Act 772), and Red/Amber Alert authorization.

---

## 🏛️ Architecture & Modules

* **`core/adapters`**: Strict interface adapters with deterministic, high-fidelity mocks:
  * `IGhanaPostGPSAdapter` (`MockGhanaPostGPSAdapter`)
  * `INIAVerificationAdapter` (`MockNIAVerificationAdapter` for Ghana Card eKYC)
  * `ISMSUSSDGatewayAdapter` (`MockSMSUSSDGatewayAdapter` for Hubtel/Arkesel/NCA)
  * `ICellBroadcastAdapter` (`MockCellBroadcastAdapter` for national emergency alerts)
  * `IAgencyDispatchCADAdapter` (`MockAgencyDispatchCADAdapter` for Police/DOVVSU/EPA dispatch)
* **`core/crypto`**: Cryptographic evidence vault:
  * SHA-256 rolling digest verification.
  * Append-only hash chaining for the immutable `audit_evidence_ledger` (Act 772 compliance).
  * AES-256-GCM field-level encryption for verified reporter PII.
* **`modules/triage`**: Automated multi-agency classifier and routing rules.
* **`modules/incidents`**: Incident ingestion, 60s hard limit enforcement, spatial coordinates, case status tracking.
* **`modules/alerts`**: Red & Amber Emergency Broadcast Engine enforcing the **Two-Man Commander Rule** (Four-Eyes Principle) and citizen sighting tip collation.
* **`modules/auth`**: Citizen OTP authentication and Ghana Card verification.

---

## 🧪 Running Test Suites

```bash
# Run all unit and integration test suites
npm test

# Run tests with code coverage report
npm run test:cov
```

---

## 🚀 Running the Server Locally

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev
```
API endpoints will be served at `http://localhost:4000/v1`.
