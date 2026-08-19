"""
Language Detector Service
--------------------------
Detects the language of narrative text for TAT analysis.
Supports: English (en), Hindi (hi), Bengali (bn).

Uses langdetect for script/language identification with confidence scoring.
Gracefully degrades if langdetect is not installed.
"""

from typing import Dict, Any, Optional

# ============================================================================
# LANGUAGE DETECTION (graceful degradation)
# ============================================================================

try:
    from langdetect import detect, detect_langs
    from langdetect.lang_detect_exception import LangDetectException
    _LANGDETECT_AVAILABLE = True
except ImportError:
    _LANGDETECT_AVAILABLE = False

# Supported languages for TAT analysis
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "bn": "Bengali",
}

# Unicode script ranges for fallback detection
_DEVANAGARI_RANGE = range(0x0900, 0x097F + 1)  # Hindi
_BENGALI_RANGE = range(0x0980, 0x09FF + 1)      # Bengali


def _script_fallback(text: str) -> Dict[str, Any]:
    """Fallback script detection using Unicode ranges.
    Used when langdetect is unavailable or fails."""
    devanagari_count = sum(1 for c in text if ord(c) in _DEVANAGARI_RANGE)
    bengali_count = sum(1 for c in text if ord(c) in _BENGALI_RANGE)
    ascii_count = sum(1 for c in text if c.isascii() and c.isalpha())
    total = devanagari_count + bengali_count + ascii_count

    if total == 0:
        return {"language": "en", "language_name": "English", "confidence": 0.0, "method": "fallback_empty"}

    if devanagari_count / max(total, 1) > 0.3:
        conf = devanagari_count / total
        return {"language": "hi", "language_name": "Hindi", "confidence": round(conf, 3), "method": "unicode_script"}
    elif bengali_count / max(total, 1) > 0.3:
        conf = bengali_count / total
        return {"language": "bn", "language_name": "Bengali", "confidence": round(conf, 3), "method": "unicode_script"}
    else:
        conf = ascii_count / max(total, 1)
        return {"language": "en", "language_name": "English", "confidence": round(conf, 3), "method": "unicode_script"}


def detect_language(text: str) -> Dict[str, Any]:
    """
    Detect the language of the given text.
    
    Returns:
        {
            "language": "en" | "hi" | "bn",
            "language_name": "English" | "Hindi" | "Bengali",
            "confidence": 0.0-1.0,
            "all_detected": [{"lang": "en", "prob": 0.95}, ...],
            "method": "langdetect" | "unicode_script" | "fallback_empty",
            "is_supported": True/False
        }
    """
    if not text or not text.strip():
        return {
            "language": "en",
            "language_name": "English",
            "confidence": 0.0,
            "all_detected": [],
            "method": "empty_input",
            "is_supported": True,
        }

    # Try langdetect first
    if _LANGDETECT_AVAILABLE:
        try:
            detected_langs = detect_langs(text)
            all_detected = [
                {"lang": str(dl.lang), "prob": round(float(dl.prob), 4)}
                for dl in detected_langs
            ]

            # Find the best supported language
            best_lang = None
            best_prob = 0.0
            for dl in detected_langs:
                lang_code = str(dl.lang)
                if lang_code in SUPPORTED_LANGUAGES and float(dl.prob) > best_prob:
                    best_lang = lang_code
                    best_prob = float(dl.prob)

            # If no supported language found, default to top detection
            if best_lang is None:
                top = detected_langs[0]
                best_lang = str(top.lang)
                best_prob = float(top.prob)

            is_supported = best_lang in SUPPORTED_LANGUAGES
            lang_name = SUPPORTED_LANGUAGES.get(best_lang, best_lang.title())

            return {
                "language": best_lang,
                "language_name": lang_name,
                "confidence": round(best_prob, 3),
                "all_detected": all_detected,
                "method": "langdetect",
                "is_supported": is_supported,
            }
        except (LangDetectException, Exception) as e:
            print(f"⚠ langdetect failed: {e}, using Unicode script fallback")

    # Fallback to Unicode script detection
    result = _script_fallback(text)
    result["all_detected"] = [{"lang": result["language"], "prob": result["confidence"]}]
    result["is_supported"] = result["language"] in SUPPORTED_LANGUAGES
    return result


def get_language_label(lang_code: str) -> str:
    """Get human-readable language name from code."""
    return SUPPORTED_LANGUAGES.get(lang_code, lang_code.title())


# ============================================================================
# SCRIPT-LEVEL DETECTION UTILITIES (v10.0 — used by multilingual transcriber)
# ============================================================================

def detect_script(char: str) -> str:
    """
    Detect the script of a single character.
    Returns: "bn" (Bengali), "hi" (Devanagari), "en" (Latin), or "other".
    """
    cp = ord(char)
    if _BENGALI_RANGE.start <= cp <= _BENGALI_RANGE.stop:
        return "bn"
    elif _DEVANAGARI_RANGE.start <= cp <= _DEVANAGARI_RANGE.stop:
        return "hi"
    elif char.isascii() and char.isalpha():
        return "en"
    return "other"


def detect_segment_languages(text: str) -> list:
    """
    Split text into word-level segments with per-word language tags.

    Used as secondary validation after Whisper's per-segment detection.
    Useful for verifying that code-switched segments are tagged correctly.

    Args:
        text: The transcribed text (potentially mixed-script).

    Returns:
        List of (word, language_code) tuples.
        Example: [("আমি", "bn"), ("tired", "en"), ("बोलो", "hi")]
    """
    if not text or not text.strip():
        return []

    results = []
    for word in text.split():
        # Count characters per script
        bn_count = sum(1 for c in word if ord(c) in _BENGALI_RANGE)
        hi_count = sum(1 for c in word if ord(c) in _DEVANAGARI_RANGE)
        latin_count = sum(1 for c in word if c.isascii() and c.isalpha())

        # Classify by dominant script
        if bn_count > hi_count and bn_count > latin_count:
            lang = "bn"
        elif hi_count > bn_count and hi_count > latin_count:
            lang = "hi"
        elif latin_count > 0:
            lang = "en"
        else:
            # Punctuation-only or numbers — inherit from context
            lang = "en"

        results.append((word, lang))

    return results
