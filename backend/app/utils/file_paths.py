"""
Centralized file path builder for data_store/.

All file I/O should go through these helpers to enforce
the assessment-namespaced directory structure:

  data_store/
  ├── sessions/<user_id>/<assessment_slug>/<session_id>.json
  ├── reports/<user_id>/<assessment_slug>/<filename>.pdf
  └── audio/temp/<session_id>/<chunk_uuid>.webm
"""
from pathlib import Path
from typing import Tuple

from app.database import DATA_STORE_DIR

def build_session_path(
    user_id: str,
    assessment_slug: str,
    session_id: str,
) -> Tuple[Path, str]:
    """
    Returns (absolute_path, relative_path) for a session JSON file.

    Creates the directory tree if it doesn't exist.
    """
    rel = f"sessions/{user_id}/{assessment_slug}/{session_id}.json"
    abs_path = DATA_STORE_DIR / rel
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    return abs_path, rel

def build_report_path(
    user_id: str,
    assessment_slug: str,
    filename: str,
) -> Tuple[Path, str]:
    """
    Returns (absolute_path, relative_path) for a report PDF.

    Creates the directory tree if it doesn't exist.
    """
    rel = f"reports/{user_id}/{assessment_slug}/{filename}"
    abs_path = DATA_STORE_DIR / rel
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    return abs_path, rel

def build_audio_temp_path(
    session_id: str,
    chunk_id: str,
    ext: str = ".webm",
) -> Path:
    """
    Returns absolute path for a temp audio chunk, scoped to session.

    Creates the directory tree if it doesn't exist.
    """
    dir_path = DATA_STORE_DIR / "audio" / "temp" / session_id
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path / f"{chunk_id}{ext}"

def get_audio_temp_dir(session_id: str) -> Path:
    """Return the audio temp directory for a session, creating it if needed."""
    dir_path = DATA_STORE_DIR / "audio" / "temp" / session_id
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path

def cleanup_audio_temp(session_id: str) -> None:
    """Delete the session's audio temp directory after processing."""
    import shutil
    dir_path = DATA_STORE_DIR / "audio" / "temp" / session_id
    if dir_path.exists():
        shutil.rmtree(dir_path, ignore_errors=True)
