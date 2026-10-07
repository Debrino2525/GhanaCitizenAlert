# Operational Runbook: National Emergency Alert & Disaster Response
## CitizenAlert Ghana — Emergency Dispatch Protocol

---

## 1. Triggering Amber Alerts (Missing Child Emergency)

### Step 1: Verification & Initial Dossier Assembly
1. **Officer Rank:** Minimum rank of **Inspector / ASP** required.
2. Ensure verified child photograph, last seen location, GhanaPost Digital Address, and vehicle/suspect details are entered into the Alert Hub.
3. System saves alert in state `DRAFT_PENDING_AUTHORIZATION`.

### Step 2: Approving Commander Sign-Off (Four-Eyes Principle)
1. Regional Commander or COP receives immediate push notification on the Command Portal.
2. Commander reviews evidence dossier and enters Hardware MFA Token (FIDO2 / TOTP).
3. **Automated Broadcast Execution:**
   - Push notifications to all mobile devices within the geofenced radius ($20-50\text{km}$).
   - High-priority SMS fallback broadcast to cell towers in the affected district.
   - Emergency banner displayed on the national public feed.

### Step 3: Handling Citizen Sightings
1. Sighting tips appear in real-time in the Dispatch Console with GhanaPost GPS coordinates and callback numbers.
2. Field patrol unit dispatched to the sighting coordinates.

---

## 2. False Alarm Retraction Protocol

If an Amber or Red alert is issued erroneously or based on mistaken identity:
1. Only the Approving Commander or National Security Director can trigger a retraction.
2. In the Alerts Hub, select the active alert and click **"Issue Emergency Retraction"**.
3. State the precise statutory retraction reason.
4. The system immediately transmits a high-priority cancellation push and cell broadcast:  
   `"OFFICIAL RETRACTION: The previously broadcast emergency alert has been cancelled. No further action required."`

---

## 3. Mass Disaster / NADMO Triage Protocol

During major flooding, severe fire, or civil emergencies:
1. NADMO and Ghana National Fire Service dispatchers switch the Command Center to **Disaster Priority Mode**.
2. Automated clustering engine aggregates nearby reports within $500\text{m}$ into a single unified incident dossier to avoid duplicate dispatches.
