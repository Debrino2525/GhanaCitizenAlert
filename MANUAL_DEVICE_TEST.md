# CitizenAlert Ghana Mobile — Comprehensive Manual Device Test Matrix
**Document Version:** 1.0.0  
**Design Direction:** National Civic Aegis  
**Target Runtimes:** iOS 15.0+ | Android 11.0+ (API 30+)  
**App Framework:** React Native 0.86 / Expo SDK 57 / React 19 / TypeScript 6.0

---

## 1. Executive Summary & Statutory Integrity Checklist
This test matrix provides a step-by-step verification plan for field deployment and QA testing on physical iOS and Android hardware. All tests verify statutory compliance under **Act 772** (Electronic Transactions Act: evidentiary integrity and watermarking) and **Act 720** (Whistleblower Protection Act: anonymity guarantees).

---

## 2. Hardware Test Environment Matrix

| Device Class | Target Hardware | OS Version | Display Density / Form Factor | Primary Focus Areas |
|---|---|---|---|---|
| **iOS Primary** | iPhone 13 / 14 / 15 / 16 Pro | iOS 16.0 – 18.x | 3x Super Retina OLED, Notch/Dynamic Island | Camera2 API, Haptic Engine, VoiceOver |
| **iOS Secondary** | iPhone SE (2nd/3rd Gen) | iOS 15.0 – 17.x | 2x Retina LCD, 4.7" Home Button | Small screen clipping, Dynamic Type |
| **Android Flagship** | Samsung Galaxy S22 / S23 / S24 | Android 13 – 15 (One UI) | 120Hz AMOLED, Punch Hole | CameraX, High refresh rate animations |
| **Android Mid-Range** | Tecno Camon / Infinix Note / Redmi Note | Android 11 – 14 | 90Hz LCD/AMOLED, MediaTek/Snapdragon | Memory pressure during 60s video record |
| **Low-Spec / Entry** | Samsung Galaxy A04s / Nokia G21 | Android 11 – 12 (Go Edition) | 60Hz 720p LCD, 2GB/3GB RAM | FileSystem streaming, low CPU crypto hash |

---

## 3. Test Suites & Execution Protocols

### TEST SUITE 1: System Permissions & Hardware Sensors
- [ ] **TC-PERM-01: First-Launch Permission Prompting**
  - **Steps:** Fresh install the app. Launch for the first time.
  - **Expected Result:** Camera, Microphone, and Foreground Location permissions are requested with clear rationale dialogs explaining civic evidence requirements.
- [ ] **TC-PERM-02: Graceful Permission Denial Handling**
  - **Steps:** Deny camera or location permissions.
  - **Expected Result:** App presents the *Citizen Access Wall* with clear instructions and direct button linking to System Settings (`Linking.openSettings()`). No crashing.
- [ ] **TC-PERM-03: GPS Telemetry Acquisition & Reverse Geocoding**
  - **Steps:** Launch with Location enabled outdoors vs. indoors.
  - **Expected Result:** 
    - GPS Lat/Lng updates with accuracy metric `±X.X m`.
    - Live GhanaPost Digital Address (e.g., `GA-183-9024`) or localized neighborhood descriptor resolves automatically.
    - If GPS is weak (>25m), amber telemetry warning badge appears with fallback Landmark selection.

---

### TEST SUITE 2: Digital Evidence Capture & Cryptographic Watermarking
- [ ] **TC-EVD-01: Photo Evidence Capture & HUD Watermark**
  - **Steps:** Navigate to Capture tab. Frame a scene and tap Photo Shutter.
  - **Expected Result:** 
    - Instant shutter sound and tactile haptic impact (`safeHaptics.light`).
    - Capture snapshot displays burned-in legal watermark containing: Live Lat/Lng, GhanaPost Code, Timestamp (UTC & GMT), and Accuracy radius.
    - SHA-256 cryptographic hash is generated asynchronously via `Crypto.digestStringAsync`.
- [ ] **TC-EVD-02: Hard 60-Second Video Limit & Automatic Shutter Termination**
  - **Steps:** Switch to Video mode. Press Record. Let recording run continuously.
  - **Expected Result:**
    - Live recording timer displays `00:01` through `01:00` with pulsing red indicator.
    - Root component does NOT re-render (isolated state in `useCameraRecorder`).
    - At exactly `01:00` (60 seconds), recording stops automatically without user intervention.
    - Video preview displays duration and file size; SHA-256 digest is generated.
- [ ] **TC-EVD-03: Video Premature Stop & Retake**
  - **Steps:** Start video recording. Stop at `00:15`. Press 'Retake'.
  - **Expected Result:** Temporary video cache file is discarded; viewfinder immediately re-activates with 0 memory leak.

---

### TEST SUITE 3: Statutory Anonymity & Whistleblower Protection (Act 720)
- [ ] **TC-ANON-01: Anonymous Whistleblower Toggle**
  - **Steps:** In Step 2 of Incident Submission, toggle "Whistleblower Protection (Act 720)".
  - **Expected Result:**
    - Phone number and citizen email fields are immediately cleared and disabled.
    - Payload inspected in network/logs contains `is_anonymous: true` and `reporter_data.isAnonymous: true`.
    - Transmitted dossier metadata contains NO personal identifiers, IMEI, device model, or SIM IMSI.
- [ ] **TC-ANON-02: Verified Citizen Reporting**
  - **Steps:** Leave Whistleblower toggle OFF with user logged in.
  - **Expected Result:**
    - Citizen Trust Score and contact details are linked into secure encrypted `reporter_data` table accessible only to authenticated Police CID dispatchers.

---

### TEST SUITE 4: SOS Emergency Panic Safeguard & Agency Dialers
- [ ] **TC-SOS-01: Hold-to-Confirm 1.5-Second Threshold**
  - **Steps:** Navigate to SOS tab. Tap the SOS button quickly (< 1.5s).
  - **Expected Result:** 
    - SVG radial progress ring starts filling but resets immediately upon touch release.
    - No emergency dispatch is triggered. No false alarm is sent.
- [ ] **TC-SOS-02: Full 1.5-Second Hold & Ramp Haptics**
  - **Steps:** Press and hold SOS button continuously for 1.5 seconds.
  - **Expected Result:**
    - SVG radial ring fills smoothly from 0% to 100%.
    - Haptic feedback pulses from `medium` to `light` to final `heavy` buzz.
    - Emergency distress beacon is dispatched to Supabase `incidents` with severity `RED` and category `CRIMINAL_OFFENSE`.
    - Live tracking card appears displaying active ping counter and CAD coordinates.
- [ ] **TC-SOS-03: SOS Cancellation / Stand Down**
  - **Steps:** While SOS Beacon is active, tap "Stand Down / Cancel Beacon".
  - **Expected Result:** Beacon deactivates, ping timer clears, and warning haptic sounds.
- [ ] **TC-SOS-04: Direct Emergency Dialers (191, 112, 192, 193)**
  - **Steps:** Tap each of the 4 hotline buttons (Police 191, National 112, Fire 192, Ambulance 193).
  - **Expected Result:** OS native phone dialer opens pre-populated with the corresponding emergency hotline number.

---

### TEST SUITE 5: Offline Queue, Network Drop & Resumption
- [ ] **TC-NET-01: Evidence Capture in Airplane Mode**
  - **Steps:** Enable Airplane mode. Record evidence and submit incident.
  - **Expected Result:**
    - Submission detects network unavailability.
    - Incident payload and media file paths are stored safely in local offline queue.
    - User is alerted that evidence is cryptographically sealed and queued locally.
- [ ] **TC-NET-02: Auto-Flush on Reconnection**
  - **Steps:** Disable Airplane mode and restore Wi-Fi/Cellular connectivity.
  - **Expected Result:**
    - Background sync task detects active connection and flushes queued reports to Supabase storage and database.
    - Tracking code is confirmed.

---

### TEST SUITE 6: Accessibility, Font Scaling & Reduced Motion
- [ ] **TC-A11Y-01: Dynamic Font Scaling (Up to 130% / 150%)**
  - **Steps:** On iOS (Settings > Accessibility > Display & Text Size > Larger Text) or Android (Font Size: Largest).
  - **Expected Result:**
    - All text wraps cleanly without truncation or overlapping cards.
    - Minimum touch targets maintain at least 44x44 pt / 48x48 dp.
- [ ] **TC-A11Y-02: Screen Reader Navigation (TalkBack & VoiceOver)**
  - **Steps:** Enable TalkBack (Android) or VoiceOver (iOS). Navigate through all tabs.
  - **Expected Result:**
    - All interactive elements announce their `accessibilityRole`, `accessibilityLabel`, and `accessibilityHint`.
    - Live announcements trigger on: "Recording started", "Recording stopped at 60s", "Distress beacon activated".
- [ ] **TC-A11Y-03: Reduced Motion Compliance**
  - **Steps:** Enable "Reduce Motion" in OS settings.
  - **Expected Result:**
    - SOS pulse animations and transitions fallback to static or subtle cross-fades.

---

### TEST SUITE 7: Authentication & Multilingual i18n
- [ ] **TC-AUTH-01: Dual Google Sign-In & Email Password Flow**
  - **Steps:** Test Google One-Tap / Browser Fallback login; test Email/Password signup and session recovery.
  - **Expected Result:** Session tokens persist across app reboots via `AsyncStorage` / SecureStore.
- [ ] **TC-I18N-01: 5-Language Switching (English, Twi, Ga, Ewe, Hausa)**
  - **Steps:** Open Citizen Profile Sheet and switch through all 5 languages.
  - **Expected Result:** UI chrome, category badges, legal disclaimers, and telemetry labels update instantly in selected language.

---

## 4. Sign-Off & Verification Gate

| Test Suite | Total TCs | Passed | Failed | Blocked | Tester Name / Device |
|---|---|---|---|---|---|
| Suite 1: Hardware & Permissions | 3 | [ ] | [ ] | [ ] | |
| Suite 2: Digital Evidence & Video | 3 | [ ] | [ ] | [ ] | |
| Suite 3: Whistleblower Protection | 2 | [ ] | [ ] | [ ] | |
| Suite 4: SOS Safeguard & Dialers | 4 | [ ] | [ ] | [ ] | |
| Suite 5: Offline Queue | 2 | [ ] | [ ] | [ ] | |
| Suite 6: Accessibility & Scale | 3 | [ ] | [ ] | [ ] | |
| Suite 7: Auth & Multilingual | 2 | [ ] | [ ] | [ ] | |
