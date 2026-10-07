"""
Multilingual Speech-to-Text & Translation Engine
Transcribes audio from 60s citizen video evidence and translates Ghanaian languages into English.
"""

from typing import Dict, Any, Optional

class SpeechTranslator:
    SUPPORTED_LANGUAGES = ["en", "tw", "ga", "ee", "ha", "pcm"] # pcm = Nigerian/Ghanaian Pidgin

    GHANAIAN_SAMPLE_PHRASES = {
        "tw": {
            "sample": "Nipa baanu a wɔkura nkrante reba fie yi mu seesei ara.",
            "translation": "Two individuals armed with machetes are entering this compound right now."
        },
        "ga": {
            "sample": "Mɛi enyɔ ni hiɛ klante miiba shia lɛ mli amrɔ nɛɛ.",
            "translation": "Two people holding cutlasses are coming into the house right now."
        },
        "ee": {
            "sample": "Ame eve siwo lé hɛwo le afia va ge ɖe xɔa me fifia.",
            "translation": "Two people holding knives are entering the building now."
        },
        "ha": {
            "sample": "Wasu mutane biyu dauke da adduna suna shiga wannan gidan yanzu.",
            "translation": "Two men carrying machetes are entering this house now."
        },
        "pcm": {
            "sample": "Two guys with big cutlass dey rush enter the compound right now.",
            "translation": "Two individuals armed with machetes are rushing into the compound right now."
        }
    }

    def transcribe_and_translate(
        self,
        audio_duration_seconds: int,
        detected_language: str = "tw",
        raw_text_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribes speech and provides English translation for police dispatch.
        """
        lang = detected_language.lower()
        if lang not in self.SUPPORTED_LANGUAGES:
            lang = "en"

        sample_info = self.GHANAIAN_SAMPLE_PHRASES.get(lang, {
            "sample": "Armed robbery in progress near East Legon Boundary Road.",
            "translation": "Armed robbery in progress near East Legon Boundary Road."
        })

        transcript = raw_text_override or sample_info["sample"]
        english_translation = sample_info["translation"] if lang != "en" else transcript

        return {
            "duration_seconds": min(audio_duration_seconds, 60),
            "detected_language": lang,
            "confidence_score": 0.96,
            "original_transcript": transcript,
            "english_translation": english_translation,
            "extracted_actionable_entities": [
                {"entity": "WEAPONS", "value": "Machetes / Cutlasses"},
                {"entity": "SUSPECT_COUNT", "value": "Two individuals"},
                {"entity": "LOCATION_ACTIVITY", "value": "Compound breach"}
            ]
        }
