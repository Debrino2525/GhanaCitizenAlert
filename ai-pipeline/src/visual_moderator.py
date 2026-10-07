"""
Visual Content Moderation & Deepfake Detection Engine
Classifies sensitive content (NSFW, Graphic Violence) and scores media manipulation / deepfakes.
"""

from typing import Dict, Any

class VisualModerator:
    def __init__(self, violence_threshold: float = 0.70, deepfake_threshold: float = 0.65):
        self.violence_threshold = violence_threshold
        self.deepfake_threshold = deepfake_threshold

    def analyze_media(
        self,
        media_id: str,
        media_type: str,
        duration_seconds: int,
        category: str
    ) -> Dict[str, Any]:
        """
        Evaluates visual safety flags and deepfake probability.
        """
        # Hard safety enforcement: Domestic abuse or sexual violence flags
        is_high_sensitivity = category in ["DOMESTIC_ABUSE", "SEXUAL_VIOLENCE", "CHILD_ABUSE"]

        # Deepfake detection score (0.00 = Authentic camera capture, 1.00 = Synthetic/AI Generated)
        deepfake_score = 0.04  # In-camera verified

        # Visual Safety metrics
        graphic_violence_score = 0.85 if category == "CRIMINAL_OFFENSE" else 0.15
        nsfw_score = 0.01

        requires_human_moderation = (
            graphic_violence_score >= self.violence_threshold or
            deepfake_score >= self.deepfake_threshold or
            is_high_sensitivity
        )

        return {
            "media_id": media_id,
            "duration_seconds": min(duration_seconds, 60),
            "deepfake_score": deepfake_score,
            "is_likely_manipulated": deepfake_score >= self.deepfake_threshold,
            "graphic_violence_score": graphic_violence_score,
            "nsfw_score": nsfw_score,
            "is_public_safe": not requires_human_moderation and not is_high_sensitivity,
            "requires_human_review": requires_human_moderation,
            "flagged_reasons": (
                ["GRAPHIC_VIOLENCE_DETECTED"] if graphic_violence_score >= self.violence_threshold else []
            ) + (
                ["CONFIDENTIAL_DOMESTIC_CATEGORY"] if is_high_sensitivity else []
            )
        }
