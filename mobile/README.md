# CitizenAlert Ghana — Flutter Mobile Application 🇬🇭

Production-grade mobile application for citizen incident capture, offline-first encrypted queues, 60-second video limiters, in-camera cryptographic watermarking, and emergency SOS panic triggers.

---

## 🌟 Architecture & Features

* **Clean Architecture & Riverpod:**
  * `core/`: Cryptographic utilities, multi-language localization (English, Twi, Ga, Ewe, Hausa), theme and security constants.
  * `features/capture/`: Camera controller enforcing statutory **max 60-second video duration** with rolling SHA-256 frame digests and live viewfinder watermarking (UTC, GPS, GhanaPost digital address).
  * `features/offline_queue/`: Offline-first encrypted SQLite database (AES-256-GCM) with network state listeners and resumable chunked S3 upload manager.
  * `features/sos_panic/`: One-touch emergency SOS beacon with live coordinate updates dispatched directly to Police Command.
  * `features/incidents/`: Category picker with low-literacy icon workflows and **Anonymous Whistleblower mode** (Whistleblower Act, 2006 / Act 720).
  * `features/alerts/`: Geo-fenced Amber & Red alert notifications with instant citizen sighting tip submission.

---

## 🧪 Testing Mobile Services

```bash
# Run unit tests
flutter test test/mobile_services_test.dart
```
