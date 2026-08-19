"""
Audio Transcriber Service — v11.0 Manual Language Selection Engine
-----------------------------------------------------------------
Provides clinical-grade verbatim speech-to-text transcription for TAT
narrative input.  Supports patients who cannot read or write.

VERBATIM POLICY (Clinical Requirement):
  TAT analysis depends on exact wording — hesitations, grammatical errors,
  repetitions, filler words, and incomplete sentences are ALL diagnostically
  significant. This transcriber is configured to preserve them faithfully.

LANGUAGE POLICY (v11.0):
  The user explicitly selects the spoken language before recording:
    - English (en)  → Latin script
    - Hindi   (hi)  → Devanagari      (U+0900–097F)
    - Bengali (bn)  → Bengali script  (U+0980–09FF)
  This explicit selection ensures:
    - Hindi is NEVER confused with Urdu
    - Bengali is NEVER confused with Assamese or other similar scripts
    - Whisper decodes with maximum accuracy for the target language

Features:
  - Browser audio (WebM/WAV/OGG/FLAC) → text transcription
  - True verbatim mode: preserves fillers, hesitations, false starts
  - Automatic language detection per VAD segment
  - Mixed-script output for code-switched speech
  - Word-level timestamps
  - Per-segment confidence scores
  - Configurable model size via WHISPER_MODEL_SIZE env var

Backend:
  faster-whisper (CTranslate2) — offline, 4× faster than openai-whisper,
  int8 quantization on CPU, built-in Silero VAD, bundled FFmpeg via PyAV.
"""

import os
import re
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# ============================================================================
# AUDIO TEMP DIRECTORY (within the project data_store, NOT system temp)
# ============================================================================
from app.database import AUDIO_TEMP_DIR as _AUDIO_TEMP_DIR
_AUDIO_TEMP_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================

# Model size: configurable via environment variable
# Options: "tiny", "base", "small", "medium", "large-v3"
# large-v3 gives the best multilingual + code-switching accuracy (~3GB RAM int8)
DEFAULT_WHISPER_MODEL = os.environ.get("WHISPER_MODEL_SIZE", "large-v3")

# Model cache: project-local directory
_MODEL_CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "model_cache"
_MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Compute type for CPU inference (int8 = fastest + lowest memory)
DEFAULT_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

# ============================================================================
# FASTER-WHISPER AVAILABILITY
# ============================================================================

_FASTER_WHISPER_AVAILABLE = False

try:
    from faster_whisper import WhisperModel
    _FASTER_WHISPER_AVAILABLE = True
except ImportError:
    pass

if not _FASTER_WHISPER_AVAILABLE:
    print("⚠ faster-whisper not found — audio transcription will not work.")
    print("  Fix: pip install faster-whisper")

# ============================================================================
# WHISPER LANGUAGE MAPPINGS
# ============================================================================

# ISO 639-1 → Whisper language name
_WHISPER_LANG_MAP = {"en": "english", "hi": "hindi", "bn": "bengali"}
_WHISPER_LANG_REVERSE = {v: k for k, v in _WHISPER_LANG_MAP.items()}

# Unicode script ranges for per-word language tagging
_DEVANAGARI_RANGE = (0x0900, 0x097F)   # Hindi
_BENGALI_RANGE    = (0x0980, 0x09FF)   # Bengali

# ============================================================================
# MULTILINGUAL VERBATIM PROMPT
# ============================================================================
# This prompt primes Whisper to:
#   1. Expect and output text in ALL THREE scripts
#   2. Preserve filler words and hesitations instead of cleaning them
#   3. Accept code-switching as normal behaviour
#
# WHY: Whisper's decoder uses the initial_prompt to bias its output.
# If the prompt is monolingual, the model strongly prefers that language.
# A mixed-script prompt tells the model "all scripts are valid here".

MULTILINGUAL_VERBATIM_PROMPT = (
    # English fillers
    "Um, uh, hmm, ah, like, you know, so, umm, uhh, er, err... "
    # Bengali fillers (Bangla script)
    "আম... হুম... এই যে... মানে... ওই... আচ্ছা... তো... হ্যাঁ... "
    # Hindi fillers (Devanagari script)
    "अम... हम्म... मतलब... वो... अच्छा... तो... हाँ... ऐसा..."
)

# Language-specific prompts — used when the user explicitly selects a language.
# These are more targeted than the multilingual prompt, which improves accuracy
# by telling Whisper to expect ONLY that language's script.
LANGUAGE_SPECIFIC_PROMPTS = {
    "en": (
        "Um, uh, hmm, ah, like, you know, so, umm, uhh, er, err... "
        "I think, well, actually, basically, I mean..."
    ),
    "hi": (
        "अम... हम्म... मतलब... वो... अच्छा... तो... हाँ... ऐसा... "
        "मैं सोचता हूँ... देखो... बात ये है कि... फिर... उसके बाद... "
        "यह लड़का... यह लड़की... वो लोग... घर में... बाहर..."
    ),
    "bn": (
        "আম... হুম... এই যে... মানে... ওই... আচ্ছা... তো... হ্যাঁ... "
        "আমি মনে করি... দেখো... ব্যাপার হলো... তারপর... এরপর... "
        "এই ছেলেটা... এই মেয়েটা... ওরা... বাড়িতে... বাইরে..."
    ),
}

# ============================================================================
# FILLER NORMALIZATION
# ============================================================================
# Map common Whisper filler outputs to canonical clinical forms.
# These are the forms that will appear in the verbatim transcript.

_FILLER_PATTERNS: List[Tuple[re.Pattern, str]] = [
    # English fillers
    (re.compile(r'\b[Uu]h+m*\b'),         'umm...'),
    (re.compile(r'\b[Uu]m+\b'),           'umm...'),
    (re.compile(r'\b[Aa]h+\b'),           'ahh...'),
    (re.compile(r'\b[Ee]r+\b'),           'err...'),
    (re.compile(r'\b[Hh]m+\b'),           'hmmm...'),
    (re.compile(r'\b[Uu]h\b'),            'uh...'),
    # These are intentionally loose — Whisper outputs them inconsistently
    (re.compile(r'\b[Ii]ss?h+\b'),        'isshh...'),
]


def _normalize_fillers(text: str) -> str:
    """Normalize filler representations to canonical clinical forms."""
    for pattern, replacement in _FILLER_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


# ============================================================================
# SCRIPT DETECTION UTILITIES
# ============================================================================

def _detect_word_script(word: str) -> str:
    """
    Detect the script of a single word by checking its characters.
    Returns: "bn" (Bengali), "hi" (Hindi/Devanagari), or "en" (Latin/default).
    """
    bn_count = 0
    hi_count = 0
    latin_count = 0

    for char in word:
        cp = ord(char)
        if _BENGALI_RANGE[0] <= cp <= _BENGALI_RANGE[1]:
            bn_count += 1
        elif _DEVANAGARI_RANGE[0] <= cp <= _DEVANAGARI_RANGE[1]:
            hi_count += 1
        elif char.isascii() and char.isalpha():
            latin_count += 1

    # Return the dominant script
    if bn_count > hi_count and bn_count > latin_count:
        return "bn"
    elif hi_count > bn_count and hi_count > latin_count:
        return "hi"
    return "en"


def _detect_segment_script(text: str) -> str:
    """
    Detect the dominant script of a text segment.
    Uses character-level Unicode analysis.
    """
    if not text or not text.strip():
        return "en"

    bn_count = 0
    hi_count = 0
    latin_count = 0

    for char in text:
        cp = ord(char)
        if _BENGALI_RANGE[0] <= cp <= _BENGALI_RANGE[1]:
            bn_count += 1
        elif _DEVANAGARI_RANGE[0] <= cp <= _DEVANAGARI_RANGE[1]:
            hi_count += 1
        elif char.isascii() and char.isalpha():
            latin_count += 1

    total = bn_count + hi_count + latin_count
    if total == 0:
        return "en"

    if bn_count / total > 0.3:
        return "bn"
    elif hi_count / total > 0.3:
        return "hi"
    return "en"


# ============================================================================
# AUDIO TRANSCRIBER
# ============================================================================

class AudioTranscriber:
    """
    Clinical-grade multilingual verbatim audio transcriber for TAT narratives.

    Verbatim policy: No modifications are made to grammar, sentence structure,
    filler words, hesitations, repetitions, or figures of speech.
    The transcription is returned exactly as spoken by the patient.

    Multilingual policy: Language is auto-detected per VAD segment.
    Code-switching (BN↔HI↔EN) within a single recording is fully supported.
    Each segment is output in its detected script.

    Why verbatim matters for TAT:
      - Hesitations ("um", "uh") indicate anxiety or conflict
      - Repetitions suggest fixation or emotional processing
      - Grammatical errors may signal cognitive state
      - False starts reveal thought blocking or redirection

    Why multilingual matters:
      - Indian patients naturally code-switch between languages
      - Forcing a single language loses diagnostic information
      - Script-accurate output preserves the patient's actual expression
    """

    def __init__(
        self,
        preferred_backend: str = "auto",
        whisper_model_size: str = DEFAULT_WHISPER_MODEL,
        compute_type: str = DEFAULT_COMPUTE_TYPE,
    ):
        """
        Args:
            preferred_backend: Ignored in v10.0 (only faster-whisper is used).
                               Kept for backward compatibility.
            whisper_model_size: Whisper model size — "tiny", "base", "small",
                                "medium", "large-v3"
            compute_type: CTranslate2 compute type — "int8", "float16", "float32"
        """
        self._whisper_model_size = whisper_model_size
        self._compute_type = compute_type
        self._whisper_model = None
        self._model_loading = False

        if not _FASTER_WHISPER_AVAILABLE:
            print("⚠ Audio transcription unavailable: install faster-whisper")

    # ========================================================================
    # WHISPER MODEL MANAGEMENT
    # ========================================================================

    def _get_whisper_model(self) -> Optional["WhisperModel"]:
        """Lazy-load faster-whisper model on first use."""
        if self._whisper_model is None and _FASTER_WHISPER_AVAILABLE:
            try:
                self._model_loading = True
                print(f"[...] Loading faster-whisper model: {self._whisper_model_size} "
                      f"(compute_type={self._compute_type}, cache={_MODEL_CACHE_DIR})")

                self._whisper_model = WhisperModel(
                    self._whisper_model_size,
                    device="cpu",
                    compute_type=self._compute_type,
                    download_root=str(_MODEL_CACHE_DIR),
                )
                print(f"[OK] faster-whisper model loaded ({self._whisper_model_size})")
            except Exception as e:
                print(f"⚠ faster-whisper model load failed: {e}")
            finally:
                self._model_loading = False
        return self._whisper_model

    # ========================================================================
    # PUBLIC API
    # ========================================================================

    def transcribe(
        self,
        audio_data: bytes,
        filename: str = "audio.webm",
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribe audio data to verbatim text.

        Args:
            audio_data: Raw audio bytes (WebM, WAV, OGG, FLAC, etc.)
            filename: Original filename (used for format detection)
            language: Explicit language code — "en", "hi", or "bn".
                      When provided, Whisper is forced to decode in this
                      language, preventing confusion between Hindi/Urdu
                      and ensuring accurate Bengali transcription.
                      If None, falls back to auto-detection.

        Returns:
            {
                "text": "verbatim transcription with umm... ahh... pauses",
                "detected_language": "en" | "hi" | "bn",
                "languages_found": ["en", "hi", "bn"],
                "confidence": 0.0-1.0,
                "is_verbatim": True,
                "backend": "faster-whisper",
                "backend_verbatim_capable": True,
                "model_size": "large-v3",
                "duration_seconds": 12.5,
                "segments": [...],
                "word_count": 42,
                "error": None | "error message"
            }
        """
        if not _FASTER_WHISPER_AVAILABLE:
            return self._error_result(
                "Speech recognition not available. Install faster-whisper: "
                "pip install faster-whisper"
            )

        # Save audio to project-local temp directory (NOT system temp)
        suffix = Path(filename).suffix or ".webm"
        tmp_path = str(_AUDIO_TEMP_DIR / f"{uuid.uuid4().hex}{suffix}")
        with open(tmp_path, "wb") as tmp:
            tmp.write(audio_data)

        try:
            result = self._transcribe_faster_whisper(tmp_path, language=language)
            if result and not result.get("error"):
                return result
            return result or self._error_result("Transcription failed.")
        finally:
            # Cleanup temp file
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    # ========================================================================
    # FASTER-WHISPER BACKEND (Primary — True Verbatim + Multilingual)
    # ========================================================================

    def _transcribe_faster_whisper(
        self, audio_path: str, language: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Transcribe using faster-whisper with verbatim-optimized settings.

        Args:
            audio_path: Path to the audio file to transcribe.
            language: Explicit language code ("en", "hi", "bn") or None.
                      When provided, Whisper is FORCED to decode in this
                      language — it will NOT auto-detect.
                      This is critical for:
                        - Hindi: prevents Whisper from outputting Urdu script
                        - Bengali: prevents confusion with Assamese/other scripts

        Key verbatim settings:
          - condition_on_previous_text=False → prevents cross-segment smoothing
          - word_timestamps=True → captures word-level timing
          - temperature=0.0 → deterministic output (no creative filling)
          - suppress_tokens=[] → don't suppress any token (preserve fillers)
          - no_speech_threshold raised → less aggressive silence trimming
          - vad_filter=True → Silero VAD segments audio at natural pauses
        """
        model = self._get_whisper_model()
        if model is None:
            return self._error_result(
                "Whisper model not loaded. Check logs for download/load errors."
            )

        # ── Resolve language and prompt ─────────────────────────────────
        # When a language is explicitly selected, we:
        #   1. Pass the Whisper language name (e.g. "hindi") to force decoding
        #   2. Use a language-specific initial_prompt for better accuracy
        # This prevents Hindi↔Urdu confusion and ensures proper Bengali output.
        whisper_language = None
        initial_prompt = MULTILINGUAL_VERBATIM_PROMPT  # default fallback

        if language and language in _WHISPER_LANG_MAP:
            whisper_language = language  # faster-whisper expects ISO codes: "en", "hi", "bn"
            initial_prompt = LANGUAGE_SPECIFIC_PROMPTS.get(language, MULTILINGUAL_VERBATIM_PROMPT)
            print(f"[LANG] Explicit language selection: {language} → Whisper lang='{whisper_language}'")
        else:
            print(f"[LANG] No explicit language — using multilingual auto-detect")

        try:
            # ── Verbatim Whisper options ────────────────────────────────────
            segments_iter, info = model.transcribe(
                audio_path,
                beam_size=5,

                # ── VAD Segmentation ───────────────────────────────────────
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=400,
                    speech_pad_ms=200,
                ),

                # ── Verbatim preservation ──────────────────────────────────
                condition_on_previous_text=False,
                word_timestamps=True,
                temperature=0.0,
                suppress_tokens=[],

                # Use language-specific or multilingual prompt
                initial_prompt=initial_prompt,

                suppress_blank=False,
                no_speech_threshold=0.8,
                log_prob_threshold=-1.5,
                compression_ratio_threshold=3.0,

                # EXPLICIT LANGUAGE or auto-detect
                # When whisper_language is set (e.g. "hindi"), Whisper will
                # ONLY decode in that language — no auto-detection, no Urdu.
                language=whisper_language,
            )

            # ── Consume segment iterator and build results ─────────────────
            segments_list = []
            all_text_parts = []
            total_confidence = 0.0
            segment_count = 0
            languages_seen = set()
            total_duration = 0.0

            for seg in segments_iter:
                segment_text = seg.text.strip()
                if not segment_text:
                    continue

                # Normalize filler representations
                segment_text = _normalize_fillers(segment_text)

                # Detect script of this segment (secondary validation)
                seg_language = _detect_segment_script(segment_text)
                languages_seen.add(seg_language)

                # Confidence from avg_logprob: convert to 0-1 scale
                avg_logprob = seg.avg_logprob if seg.avg_logprob else -1.0
                seg_confidence = min(1.0, max(0.0, 1.0 + avg_logprob))

                total_confidence += seg_confidence
                segment_count += 1

                seg_end = seg.end or 0
                if seg_end > total_duration:
                    total_duration = seg_end

                segment_data: Dict[str, Any] = {
                    "start": round(seg.start, 2),
                    "end": round(seg_end, 2),
                    "text": segment_text,
                    "language": seg_language,
                    "confidence": round(seg_confidence, 3),
                    "no_speech_prob": round(seg.no_speech_prob, 3) if seg.no_speech_prob else 0.0,
                }

                # Include word-level timestamps if available
                if seg.words:
                    segment_data["words"] = [
                        {
                            "word": w.word.strip() if w.word else "",
                            "start": round(w.start, 2),
                            "end": round(w.end, 2),
                            "probability": round(w.probability, 3) if w.probability else 0.0,
                        }
                        for w in seg.words
                    ]

                segments_list.append(segment_data)
                all_text_parts.append(segment_text)

            # ── Stitch full text ───────────────────────────────────────────
            full_text = " ".join(all_text_parts).strip()

            # ── Determine detected_language ────────────────────────────────
            if len(languages_seen) > 1:
                detected_language = "multilingual"
            elif len(languages_seen) == 1:
                detected_language = list(languages_seen)[0]
            else:
                # Fallback to Whisper's overall detection
                detected_raw = info.language if info.language else "en"
                detected_language = _WHISPER_LANG_REVERSE.get(
                    detected_raw, detected_raw
                )
                languages_seen.add(detected_language)

            # ── Aggregate confidence ───────────────────────────────────────
            avg_confidence = (
                round(total_confidence / segment_count, 3)
                if segment_count > 0
                else 0.0
            )

            return {
                "text": full_text,
                "detected_language": detected_language,
                "languages_found": sorted(languages_seen),
                "confidence": avg_confidence,
                "is_verbatim": True,
                "backend": "faster-whisper",
                "backend_verbatim_capable": True,
                "model_size": self._whisper_model_size,
                "duration_seconds": round(
                    info.duration if info.duration else total_duration, 2
                ),
                "segments": segments_list,
                "word_count": len(full_text.split()) if full_text else 0,
                "error": None,
            }
        except Exception as e:
            print(f"⚠ faster-whisper transcription failed: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}

    # ========================================================================
    # HELPERS
    # ========================================================================

    @staticmethod
    def _error_result(message: str) -> Dict[str, Any]:
        return {
            "text": "",
            "detected_language": "en",
            "languages_found": [],
            "confidence": 0.0,
            "is_verbatim": True,
            "backend": "unavailable",
            "backend_verbatim_capable": False,
            "model_size": "",
            "duration_seconds": 0,
            "segments": [],
            "word_count": 0,
            "error": message,
        }

    @staticmethod
    def is_available() -> bool:
        """Check if the transcription backend is available."""
        return _FASTER_WHISPER_AVAILABLE

    def get_model_status(self) -> str:
        """Return model loading status: 'ready', 'loading', or 'unavailable'."""
        if not _FASTER_WHISPER_AVAILABLE:
            return "unavailable"
        if self._model_loading:
            return "loading"
        if self._whisper_model is not None:
            return "ready"
        return "not_loaded"

    def get_status(self) -> Dict[str, Any]:
        """Return detailed availability status for diagnostics."""
        return {
            "engine": "faster-whisper",
            "model": self._whisper_model_size,
            "compute_type": self._compute_type,
            "model_cache": str(_MODEL_CACHE_DIR),
            "faster_whisper_available": _FASTER_WHISPER_AVAILABLE,
            "model_loaded": self._whisper_model is not None,
            "model_status": self.get_model_status(),
            "languages": ["en", "hi", "bn"],
            "auto_detect": True,
            "vad_enabled": True,
            "can_transcribe_webm": _FASTER_WHISPER_AVAILABLE,
            "recommendation": (
                "Install faster-whisper: pip install faster-whisper"
                if not _FASTER_WHISPER_AVAILABLE else "All systems operational"
            ),
        }
