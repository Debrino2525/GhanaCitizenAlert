import pytest
from src.privacy_sanitizer import PrivacySanitizer
from src.visual_moderator import VisualModerator
from src.speech_translator import SpeechTranslator
from src.deduplicator import IncidentDeduplicator

def test_privacy_sanitizer_detects_and_blurs_faces_and_license_plates():
    sanitizer = PrivacySanitizer(blur_kernel_size=51)
    boxes = sanitizer.detect_regions_to_blur(1920, 1080)
    
    assert len(boxes) == 2
    assert any(b["type"] == "FACE" for b in boxes)
    assert any(b["type"] == "LICENSE_PLATE" for b in boxes)

    result = sanitizer.apply_gaussian_blur_to_boxes((1080, 1920, 3), boxes)
    assert result["is_sanitized"] is True
    assert result["faces_blurred"] == 1
    assert result["plates_blurred"] == 1
    assert "Act 843" in result["compliance_standard"]

def test_visual_moderator_flags_violent_crimes_and_protects_domestic_abuse():
    moderator = VisualModerator()
    
    # Criminal armed incident
    crime_analysis = moderator.analyze_media("med-001", "VIDEO", 45, "CRIMINAL_OFFENSE")
    assert crime_analysis["graphic_violence_score"] > 0.70
    assert crime_analysis["requires_human_review"] is True
    assert crime_analysis["is_likely_manipulated"] is False

    # Domestic abuse incident (Strict privacy block)
    domestic_analysis = moderator.analyze_media("med-002", "PHOTO", 10, "DOMESTIC_ABUSE")
    assert domestic_analysis["is_public_safe"] is False
    assert "CONFIDENTIAL_DOMESTIC_CATEGORY" in domestic_analysis["flagged_reasons"]

def test_speech_translator_handles_ghanaian_languages():
    translator = SpeechTranslator()

    # Asante Twi
    twi_res = translator.transcribe_and_translate(30, "tw")
    assert twi_res["detected_language"] == "tw"
    assert "machetes" in twi_res["english_translation"]
    assert len(twi_res["extracted_actionable_entities"]) > 0

    # Ga
    ga_res = translator.transcribe_and_translate(25, "ga")
    assert ga_res["detected_language"] == "ga"
    assert "cutlasses" in ga_res["english_translation"]

    # Hausa
    ha_res = translator.transcribe_and_translate(40, "ha")
    assert ha_res["detected_language"] == "ha"
    assert "machetes" in ha_res["english_translation"]

def test_incident_deduplicator_clusters_nearby_simultaneous_reports():
    dedup = IncidentDeduplicator(geo_proximity_km_threshold=0.5)

    # Incident 1: East Legon (5.6354, -0.1582)
    # Incident 2: 150 meters away (5.6360, -0.1575)
    active_incidents = [
        {
            "id": "inc-001",
            "tracking_code": "GH-2026-9812",
            "category": "CRIMINAL_OFFENSE",
            "latitude": 5.6354,
            "longitude": -0.1582
        }
    ]

    current_report = {
        "category": "CRIMINAL_OFFENSE",
        "latitude": 5.6360,
        "longitude": -0.1575
    }

    res = dedup.evaluate_duplicate_cluster(current_report, active_incidents)
    assert res["is_duplicate_or_cluster"] is True
    assert res["recommended_action"] == "LINK_TO_EXISTING_CLUSTER"
    assert len(res["matched_incidents"]) == 1
    assert res["matched_incidents"][0]["distance_meters"] < 200
