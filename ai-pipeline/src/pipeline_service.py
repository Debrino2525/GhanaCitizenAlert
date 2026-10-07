"""
FastAPI Microservice for AI Moderation, Face Blurring, Speech Translation & Incident Clustering
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from .privacy_sanitizer import PrivacySanitizer
from .visual_moderator import VisualModerator
from .speech_translator import SpeechTranslator
from .deduplicator import IncidentDeduplicator

app = FastAPI(
    title="CitizenAlert Ghana — AI & Moderation Engine",
    version="1.0.0",
    description="Automated Privacy Blurring (Act 843), Visual Moderation, Speech Translation, and Deduplication Pipeline."
)

sanitizer = PrivacySanitizer()
moderator = VisualModerator()
translator = SpeechTranslator()
deduplicator = IncidentDeduplicator()

class MediaAnalysisRequest(BaseModel):
    media_id: str
    media_type: str = "VIDEO"
    duration_seconds: int = Field(default=30, le=60)
    category: str
    detected_language: str = "tw"
    latitude: float
    longitude: float
    active_incidents: List[Dict[str, Any]] = []

@app.post("/v1/pipeline/analyze")
async def run_ai_pipeline(request: MediaAnalysisRequest):
    # 1. Visual Moderation & Deepfake Scoring
    mod_result = moderator.analyze_media(
        request.media_id,
        request.media_type,
        request.duration_seconds,
        request.category
    )

    # 2. Privacy Blurring & Sanitization (Faces & Plates)
    blur_boxes = sanitizer.detect_regions_to_blur(1280, 720)
    sanitization_result = sanitizer.apply_gaussian_blur_to_boxes((720, 1280, 3), blur_boxes)

    # 3. Multilingual Speech-to-Text & Translation
    stt_result = translator.transcribe_and_translate(
        request.duration_seconds,
        request.detected_language
    )

    # 4. Spatio-Temporal Deduplication & Cluster Matching
    cluster_result = deduplicator.evaluate_duplicate_cluster(
        {
            "category": request.category,
            "latitude": request.latitude,
            "longitude": request.longitude
        },
        request.active_incidents
    )

    return {
        "status": "PROCESSED",
        "moderation": mod_result,
        "privacy_sanitization": sanitization_result,
        "transcription_and_translation": stt_result,
        "cluster_analysis": cluster_result
    }
