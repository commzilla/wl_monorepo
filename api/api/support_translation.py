"""
Translation Service for Support Chat.
Uses Gemini to detect language and translate messages bidirectionally.
"""
import json
import logging

from api.support_ai import get_gemini_client

logger = logging.getLogger(__name__)

# Messages shorter than this are skipped (emojis, "ok", "hi", etc.)
MIN_TRANSLATION_LENGTH = 3

DETECT_AND_TRANSLATE_PROMPT = """Detect the language of the following text. If it is NOT {target_lang}, translate it to {target_lang}.

Return ONLY valid JSON (no markdown, no code fences):
{{"detected_language": "<language name in English>", "translated_text": "<translation or null if already in {target_lang}>"}}

Text to analyze:
{text}"""

TRANSLATE_TO_LANG_PROMPT = """Translate the following text from English to {target_lang}. Keep the same tone and meaning.

Return ONLY valid JSON (no markdown, no code fences):
{{"translated_text": "<translation>"}}

Text to translate:
{text}"""


class TranslationService:
    """Bidirectional translation using existing Gemini client."""

    @staticmethod
    def detect_and_translate(text: str, target_lang: str = "English") -> dict:
        """
        Detect language and translate if not already in target_lang.

        Returns:
            {
                "original_content": str,
                "translated_content": str | None,
                "detected_language": str,
                "needs_translation": bool,
            }
        """
        if not text or len(text.strip()) < MIN_TRANSLATION_LENGTH:
            return {
                "original_content": text,
                "translated_content": None,
                "detected_language": target_lang,
                "needs_translation": False,
            }

        gemini = get_gemini_client()
        if not gemini.is_available:
            logger.warning("Gemini client not available for translation")
            return {
                "original_content": text,
                "translated_content": None,
                "detected_language": "unknown",
                "needs_translation": False,
            }

        try:
            prompt = DETECT_AND_TRANSLATE_PROMPT.format(
                target_lang=target_lang, text=text
            )

            model = gemini._client.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": 2048,
                },
            )
            response = model.generate_content(prompt)
            raw = (response.text or "").strip()

            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1]
                if raw.endswith("```"):
                    raw = raw[:-3].strip()

            data = json.loads(raw)
            detected = data.get("detected_language", "unknown")
            translated = data.get("translated_text")

            # Gemini may return "null", empty string, or the same text
            if not translated or translated.strip() == text.strip():
                return {
                    "original_content": text,
                    "translated_content": None,
                    "detected_language": detected,
                    "needs_translation": False,
                }

            # Check if detected language matches target (case-insensitive)
            if detected.lower() == target_lang.lower():
                return {
                    "original_content": text,
                    "translated_content": None,
                    "detected_language": detected,
                    "needs_translation": False,
                }

            return {
                "original_content": text,
                "translated_content": translated,
                "detected_language": detected,
                "needs_translation": True,
            }

        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("Translation JSON parse error: %s", e)
            return {
                "original_content": text,
                "translated_content": None,
                "detected_language": "unknown",
                "needs_translation": False,
            }
        except Exception as e:
            logger.warning("Translation failed: %s", e)
            return {
                "original_content": text,
                "translated_content": None,
                "detected_language": "unknown",
                "needs_translation": False,
            }

    @staticmethod
    def translate_to_language(text: str, target_lang: str) -> dict:
        """
        Translate text to a specific language (for agent replies).

        Returns:
            {
                "original_content": str,
                "translated_content": str | None,
                "target_language": str,
            }
        """
        if not text or len(text.strip()) < MIN_TRANSLATION_LENGTH:
            return {
                "original_content": text,
                "translated_content": None,
                "target_language": target_lang,
            }

        gemini = get_gemini_client()
        if not gemini.is_available:
            logger.warning("Gemini client not available for translation")
            return {
                "original_content": text,
                "translated_content": None,
                "target_language": target_lang,
            }

        try:
            prompt = TRANSLATE_TO_LANG_PROMPT.format(
                target_lang=target_lang, text=text
            )

            model = gemini._client.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": 2048,
                },
            )
            response = model.generate_content(prompt)
            raw = (response.text or "").strip()

            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1]
                if raw.endswith("```"):
                    raw = raw[:-3].strip()

            data = json.loads(raw)
            translated = data.get("translated_text")

            if not translated or translated.strip() == text.strip():
                return {
                    "original_content": text,
                    "translated_content": None,
                    "target_language": target_lang,
                }

            return {
                "original_content": text,
                "translated_content": translated,
                "target_language": target_lang,
            }

        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("Translation JSON parse error: %s", e)
            return {
                "original_content": text,
                "translated_content": None,
                "target_language": target_lang,
            }
        except Exception as e:
            logger.warning("Translation to %s failed: %s", target_lang, e)
            return {
                "original_content": text,
                "translated_content": None,
                "target_language": target_lang,
            }
