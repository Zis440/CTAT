"""
TAT card listing and image serving API routes.
"""
from pathlib import PurePosixPath
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.api.dependencies import PROJECT_ROOT

router = APIRouter(prefix="/api/cards", tags=["cards"])

_ALLOWED_IMG_EXT = {".jpg", ".jpeg", ".webp"}


def _safe_image_name(filename: str) -> str:
    """Strip directory components and validate image extension."""
    safe = PurePosixPath(filename).name
    if not safe or PurePosixPath(safe).suffix.lower() not in _ALLOWED_IMG_EXT:
        raise HTTPException(status_code=400, detail="Invalid image filename")
    return safe


@router.get("")
async def get_cards(version: str = "indianized"):
    base_cards_dir = PROJECT_ROOT / "data" / "tat_cards"
    cards_dir = base_cards_dir / version
    if not cards_dir.exists():
        cards_dir = base_cards_dir
        if not cards_dir.exists():
            return []
    cards = []
    for f in cards_dir.glob("*"):
        if f.suffix.lower() in _ALLOWED_IMG_EXT:
            cards.append({"id": f.stem, "filename": f.name})
    return cards


@router.get("/image/{filename}")
async def get_card_image(filename: str):
    safe = _safe_image_name(filename)
    image_path = PROJECT_ROOT / "data" / "tat_cards" / safe
    if not image_path.exists() or not image_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path)


@router.get("/image/{version}/{filename}")
async def get_card_image_versioned(version: str, filename: str):
    """Serve TAT card images by version: 'indianized', 'globalized', or 'original'."""
    if version not in ("indianized", "globalized", "original"):
        raise HTTPException(status_code=400, detail="Version must be 'indianized', 'globalized', or 'original'")
    safe = _safe_image_name(filename)
    if version == "original":
        image_path = PROJECT_ROOT / "data" / "tat_cards" / safe
    else:
        image_path = PROJECT_ROOT / "data" / "tat_cards" / version / safe
    if not image_path.exists() or not image_path.is_file():
        # Fallback to original if versioned image not found
        fallback = PROJECT_ROOT / "data" / "tat_cards" / safe
        if fallback.exists():
            return FileResponse(fallback)
        raise HTTPException(status_code=404, detail=f"Image not found for version '{version}'")
    return FileResponse(image_path)


@router.get("/versions")
async def get_card_versions():
    """Return available TAT card versions (indianized, globalized, original)."""
    cards_dir = PROJECT_ROOT / "data" / "tat_cards"
    versions = {"original": [], "indianized": [], "globalized": []}
    # Original cards
    if cards_dir.exists():
        for f in cards_dir.glob("*"):
            if f.is_file() and f.suffix.lower() in [".jpg", ".webp", ".jpeg"]:
                versions["original"].append(f.name)
    # Versioned cards
    for ver in ("indianized", "globalized"):
        ver_dir = cards_dir / ver
        if ver_dir.exists():
            for f in ver_dir.glob("*"):
                if f.is_file() and f.suffix.lower() in [".jpg", ".webp", ".jpeg"]:
                    versions[ver].append(f.name)
    return versions
