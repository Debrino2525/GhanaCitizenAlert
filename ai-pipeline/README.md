# CitizenAlert Ghana — AI & Moderation Pipeline 🇬🇭

Production-grade Python / FastAPI microservice responsible for media moderation, automated privacy blurring (Ghana Data Protection Act 843), Ghanaian speech translation, and spatio-temporal incident clustering.

---

## 🌟 Core Modules

* **`privacy_sanitizer.py`**: Automatic facial detection and license plate bounding box localization with irreversible Gaussian blurring for public release.
* **`visual_moderator.py`**: Content classification (NSFW, extreme graphic violence) and manipulated media / deepfake scoring ($0.00-1.00$).
* **`speech_translator.py`**: Speech-to-Text audio transcription and English translation engine supporting **Asante Twi, Ga, Ewe, Hausa, and Ghanaian Pidgin**.
* **`deduplicator.py`**: Haversine great-circle spatial proximity and temporal window clustering to prevent duplicate dispatches and detect viral reposts.
* **`pipeline_service.py`**: Unified FastAPI REST endpoint (`POST /v1/pipeline/analyze`).

---

## 🧪 Testing

```bash
pytest tests/test_ai_pipeline.py
```
