# CitizenAlert Ghana — Web Portals & Command Center 🇬🇭

Enterprise operations suite for National Police Command, agency triage, content moderation (Act 843), emergency Red/Amber Alert authorization, and sanitized public awareness feeds.

---

## 🌟 Modules & Portals

1. **Police & Agency Command Center (`PoliceCommandDashboard.tsx`):**
   * Live incident queue scoped by agency (Ghana Police Service / CID, DOVVSU, EPA, MTTD, MMDAs).
   * 60-second video evidence player with live GPS & GhanaPost digital address watermarking.
   * Statutory court evidence dossier exporter (Act 772).
   * CAD dispatch and unit assignment controls.
2. **National Moderator & Privacy Console (`ModeratorConsole.tsx`):**
   * Inspection of automated Gaussian blurring on bystander faces and vehicle license plates (Act 843 compliance).
   * Deepfake & synthetic manipulation score verification ($0.00-1.00$).
   * Commander approval workflow before releasing verified community bulletins.
3. **Emergency Broadcast Center (`EmergencyAlertHub.tsx`):**
   * Two-Man authorization workflow (Requesting Officer $\rightarrow$ Approving Commander with MFA).
   * Geofenced radius broadcast mapping.
   * Real-time citizen sighting tip collation.
4. **Public Community Feed (`PublicWebFeed.tsx`):**
   * Privacy-sanitized community bulletins.
   * Citizen corroboration & upvoting.
   * Formal statutory appeal and takedown submission modal under Ghana Data Protection Act 2012 (Act 843, Sections 32–43).
5. **National Analytics Dashboard (`AnalyticsDashboard.tsx`):**
   * Regional incident hotspot distribution across Ghana's 16 regions.
   * Response latency metrics & SLA compliance tracking.

---

## 🚀 Running the Web Portal

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production bundle
npm run build
```
Web portal will be served on `http://localhost:3000`.
