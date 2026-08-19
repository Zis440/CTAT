"""
Audio transcription API routes.

v11.0: Manual language selection — language is explicitly passed from the frontend.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.services.audio_transcriber import AudioTranscriber

router = APIRouter(prefix="/api/audio", tags=["audio"])

_transcriber = AudioTranscriber(preferred_backend="auto")

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """
    Transcribe audio file to verbatim text.

    Supports Bengali (bn), Hindi (hi), and English (en).
    The `language` parameter specifies the spoken language explicitly
    to ensure accurate detection — especially for Hindi vs Urdu
    and Bengali vs other Indic languages.
    """

    allowed_languages = {"en", "hi", "bn"}
    resolved_language = language.strip().lower() if language else None
    if resolved_language and resolved_language not in allowed_languages:
        resolved_language = None

    try:
        if not _transcriber.is_available():
            status = _transcriber.get_status()
            raise HTTPException(
                status_code=503,
                detail={
                    "message": "Audio transcription unavailable. faster-whisper not installed.",
                    "status": status,
                    "fix": status.get("recommendation", "Install faster-whisper"),
                }
            )
        audio_data = await audio.read()
        if len(audio_data) > 25 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio file exceeds the 25MB size limit.")
        result = _transcriber.transcribe(
            audio_data=audio_data,
            filename=audio.filename or "audio.webm",
            language=resolved_language,
        )
        if result.get("error") and not result.get("text"):
            raise HTTPException(status_code=422, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.get("/transcriber-status")
async def transcriber_status():
    """
    Return the current transcriber engine status, model info, and capabilities.

    Useful for frontend health checks and first-run model download indicators.
    """
    status = _transcriber.get_status()
    return status
