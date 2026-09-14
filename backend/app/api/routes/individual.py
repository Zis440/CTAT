from typing import Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db, DOCUMENTS_DIR
from app.models.user import User, VerificationStatus
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/individual", tags=["individual"])

ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

@router.post("/apply")
async def apply_for_network(
    rci_license: UploadFile = File(...),
    e_signature: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Apply for CoreTAT Network by uploading RCI License and E-Signature.
    Sets verification status to pending.
    """
    if current_user.account_type.value != "individual":
        raise HTTPException(status_code=403, detail="Only individual psychologists can apply via this route.")

    is_clinical = (current_user.professional_domain or "").lower().strip() == "clinical psychologist"
    has_rci = bool(current_user.rci_number and current_user.rci_number.strip())
    if not is_clinical or not has_rci:
        raise HTTPException(
            status_code=403,
            detail="Only RCI-certificated Clinical Psychologists are eligible for the Verified Psychologist program."
        )

    if current_user.verification_status.value in ("pending", "approved"):
        raise HTTPException(status_code=400, detail=f"Your application is already {current_user.verification_status.value}.")

    for file in [rci_license, e_signature]:
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"File {file.filename} type not allowed. Use PDF, JPG, or PNG.")

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail=f"File {file.filename} exceeds the 5MB size limit.")
        await file.seek(0)

    user_dir = DOCUMENTS_DIR / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    rci_ext = Path(rci_license.filename).suffix if rci_license.filename else ".pdf"
    rci_filename = f"rci_license{rci_ext}"
    rci_dest = user_dir / rci_filename

    sig_ext = Path(e_signature.filename).suffix if e_signature.filename else ".png"
    sig_filename = f"e_signature{sig_ext}"
    sig_dest = user_dir / sig_filename

    rci_contents = await rci_license.read()
    with rci_dest.open("wb") as f:
        f.write(rci_contents)

    sig_contents = await e_signature.read()
    with sig_dest.open("wb") as f:
        f.write(sig_contents)

    current_user.e_signature_path = f"uploads/documents/{current_user.id}/{sig_filename}"

    current_user.verification_status = VerificationStatus.pending

    from app.models.verification import UserVerificationDocument, DocumentCategory

    existing_rci = db.query(UserVerificationDocument).filter_by(user_id=current_user.id, document_type="rci_license").first()
    if existing_rci:
        existing_rci.file_path = f"uploads/documents/{current_user.id}/{rci_filename}"
        existing_rci.original_filename = rci_license.filename
        existing_rci.status = "pending"
    else:
        doc_rci = UserVerificationDocument(
            user_id=current_user.id,
            document_category=DocumentCategory.professional,
            document_type="rci_license",
            file_path=f"uploads/documents/{current_user.id}/{rci_filename}",
            original_filename=rci_license.filename,
            status="pending",
            is_required=True
        )
        db.add(doc_rci)

    existing_sig = db.query(UserVerificationDocument).filter_by(user_id=current_user.id, document_type="e_signature").first()
    if existing_sig:
        existing_sig.file_path = f"uploads/documents/{current_user.id}/{sig_filename}"
        existing_sig.original_filename = e_signature.filename
        existing_sig.status = "pending"
    else:
        doc_sig = UserVerificationDocument(
            user_id=current_user.id,
            document_category=DocumentCategory.identity,
            document_type="e_signature",
            file_path=f"uploads/documents/{current_user.id}/{sig_filename}",
            original_filename=e_signature.filename,
            status="pending",
            is_required=True
        )
        db.add(doc_sig)

    db.commit()

    return {
        "status": "success",
        "message": "Application submitted successfully. Our team will review it shortly.",
        "verification_status": "pending"
    }

@router.post("/e-signature")
async def update_e_signature(
    e_signature: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update E-Signature from the Settings page.
    """
    if current_user.account_type.value != "individual":
        raise HTTPException(status_code=403, detail="Only individual psychologists can update their e-signature.")

    if e_signature.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"File {e_signature.filename} type not allowed. Use PDF, JPG, or PNG.")

    contents = await e_signature.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File {e_signature.filename} exceeds the 5MB size limit.")
    await e_signature.seek(0)

    user_dir = DOCUMENTS_DIR / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    sig_ext = Path(e_signature.filename).suffix if e_signature.filename else ".png"
    sig_filename = f"e_signature{sig_ext}"
    sig_dest = user_dir / sig_filename

    with sig_dest.open("wb") as f:
        f.write(contents)

    current_user.e_signature_path = f"uploads/documents/{current_user.id}/{sig_filename}"

    from app.models.verification import UserVerificationDocument, DocumentCategory
    existing_sig = db.query(UserVerificationDocument).filter_by(user_id=current_user.id, document_type="e_signature").first()
    if existing_sig:
        existing_sig.file_path = f"uploads/documents/{current_user.id}/{sig_filename}"
        existing_sig.original_filename = e_signature.filename
    else:
        doc_sig = UserVerificationDocument(
            user_id=current_user.id,
            document_category=DocumentCategory.identity,
            document_type="e_signature",
            file_path=f"uploads/documents/{current_user.id}/{sig_filename}",
            original_filename=e_signature.filename,
            status=current_user.verification_status.value if current_user.verification_status else "pending",
            is_required=True
        )
        db.add(doc_sig)

    db.commit()

    return {
        "status": "success",
        "message": "E-Signature updated successfully.",
        "e_signature_path": current_user.e_signature_path
    }

@router.get("/e-signature/{user_id}")
async def serve_e_signature(user_id: str):
    """Serve a user's e-signature image."""
    from pathlib import PurePosixPath
    from fastapi.responses import FileResponse
    safe_id = PurePosixPath(user_id).name
    if not safe_id or safe_id != user_id:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user_dir = DOCUMENTS_DIR / safe_id
    for ext in (".jpg", ".jpeg", ".png", ".pdf", ".webp"):
        path = user_dir / f"e_signature{ext}"
        if path.exists():
            media_types = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".pdf": "application/pdf",
                ".webp": "image/webp"
            }
            return FileResponse(path, media_type=media_types[ext])

    raise HTTPException(status_code=404, detail="E-Signature not found")

@router.delete("/e-signature")
async def remove_e_signature(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove E-Signature from the Settings page.
    """
    if current_user.account_type.value != "individual":
        raise HTTPException(status_code=403, detail="Only individual psychologists can remove their e-signature.")

    user_dir = DOCUMENTS_DIR / str(current_user.id)
    if user_dir.exists():
        for ext in (".jpg", ".jpeg", ".png", ".pdf", ".webp"):
            path = user_dir / f"e_signature{ext}"
            if path.exists():
                try:
                    path.unlink()
                except Exception:
                    pass

    current_user.e_signature_path = None

    from app.models.verification import UserVerificationDocument
    existing_sig = db.query(UserVerificationDocument).filter_by(user_id=current_user.id, document_type="e_signature").first()
    if existing_sig:
        db.delete(existing_sig)

    db.commit()

    return {
        "status": "success",
        "message": "E-Signature removed successfully."
    }
