"""
Verification API router — /api/verification/*

Dynamic document verification system endpoints:
  GET  /api/verification/requirements — Fetch required/optional docs for the authenticated user
  POST /api/verification/upload       — Upload a single verification document
  GET  /api/verification/status       — Get all uploaded documents + can_submit_review flag
  POST /api/verification/submit       — Submit for verification review
"""
import shutil
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from app.database import get_db, DOCUMENTS_DIR
from app.models.user import User, VerificationStatus
from app.models.verification import (
    UserVerificationDocument,
    VerificationDocumentRequirement,
    DocumentCategory,
)
from app.auth.dependencies import get_current_user
from app.services.neurofy_service import neurofy_service
from app.services.audit_service import audit_service
from app.services.ocr.coordinator import coordinator

router = APIRouter(prefix="/api/verification", tags=["verification"])

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}

class DocumentRequirementOut(BaseModel):
    document_type: str
    category: str
    label: str
    description: Optional[str] = None
    is_required: bool

class RequirementsResponse(BaseModel):
    account_type: str
    clinic_subtype: Optional[str] = None
    required: List[DocumentRequirementOut]
    optional: List[DocumentRequirementOut]

class UploadedDocumentOut(BaseModel):
    id: str
    document_type: str
    document_category: str
    original_filename: Optional[str] = None
    status: str
    is_required: bool
    uploaded_at: Optional[str] = None
    verification_notes: Optional[str] = None

class VerificationStatusResponse(BaseModel):
    documents: List[UploadedDocumentOut]
    can_submit_review: bool
    verification_status: str
    required_count: int
    uploaded_required_count: int

class DigiLockerCallback(BaseModel):
    ref_id: str
    txn_id: str
    target_document_type: str = "government_id"

@router.get("/digilocker/init")
def digilocker_init(
    current_user: User = Depends(get_current_user),
):
    """Initiate DigiLocker verification and return the auth URL."""
    result = neurofy_service.verify_digilocker(documents=["AADHAAR"], user_flow="signup")
    if result.get("success"):
        return result
    raise HTTPException(status_code=400, detail=result.get("reason", "Failed to initiate DigiLocker"))

@router.post("/digilocker/callback")
def digilocker_callback(
    payload: DigiLockerCallback,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Callback for DigiLocker to fetch verified data."""

    result = neurofy_service.get_digilocker_data(
        ref_id=payload.ref_id,
        txn_id=payload.txn_id,
        document_type="AADHAAR"
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("reason", "Failed to fetch DigiLocker data")
        )

    digi_data = result.get("data", {})

    account_type = current_user.account_type.value
    clinic_subtype = current_user.clinic_subtype

    req_query = db.query(VerificationDocumentRequirement).filter(
        VerificationDocumentRequirement.account_type == account_type,
        VerificationDocumentRequirement.document_type == payload.target_document_type,
    )
    if clinic_subtype:
        req_query = req_query.filter(
            or_(
                VerificationDocumentRequirement.clinic_subtype == clinic_subtype,
                VerificationDocumentRequirement.clinic_subtype.is_(None)
            )
        )
    else:
        req_query = req_query.filter(VerificationDocumentRequirement.clinic_subtype.is_(None))

    requirement = req_query.first()
    if not requirement:
        raise HTTPException(
            status_code=400,
            detail=f"Document type '{payload.target_document_type}' is not a valid requirement for your account.",
        )

    ocr_fields = {
        "name": digi_data.get("name"),
        "dob": digi_data.get("dob"),
        "gender": digi_data.get("gender"),
        "address": digi_data.get("address")
    }

    existing = db.query(UserVerificationDocument).filter(
        UserVerificationDocument.user_id == current_user.id,
        UserVerificationDocument.document_type == payload.target_document_type,
    ).first()

    if existing:
        existing.status = "approved"
        existing.verification_status = "verified"
        existing.ocr_fields = ocr_fields
        existing.detected_document_type = "Aadhaar Card (DigiLocker)"
        existing.verification_response = digi_data
        existing.file_path = "digilocker_verified"
        existing.is_required = requirement.is_required
        doc = existing
    else:
        doc = UserVerificationDocument(
            user_id=current_user.id,
            document_category=requirement.document_category,
            document_type=payload.target_document_type,
            file_path="digilocker_verified",
            original_filename="digilocker_verified",
            status="approved",
            verification_status="verified",
            detected_document_type="Aadhaar Card (DigiLocker)",
            ocr_fields=ocr_fields,
            verification_response=digi_data,
            is_required=requirement.is_required,
        )
        db.add(doc)

    db.commit()

    if current_user.verification_status.value not in ("pending", "approved"):
        required_types = _get_effective_required_types(current_user, db)
        docs = db.query(UserVerificationDocument).filter(
            UserVerificationDocument.user_id == current_user.id,
        ).all()
        uploaded_map = {d.document_type: d for d in docs}

        all_met = True
        for rt in required_types:
            if rt not in uploaded_map or uploaded_map[rt].status == "rejected":
                all_met = False
                break

        if all_met:
            db_user = db.query(User).filter(User.id == current_user.id).first()
            if db_user:
                db_user.verification_status = VerificationStatus.pending
                db.commit()

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        org_id=current_user.clinic_id,
        action="DIGILOCKER_VERIFICATION",
        details={
            "document_type": payload.target_document_type,
            "ref_id": payload.ref_id,
            "status": doc.status
        }
    )

    return {
        "status": "verified",
        "document": {
            "document_type": payload.target_document_type,
            "category": requirement.document_category.value,
            "status": doc.status,
            "filename": "digilocker_verified",
        }
    }

@router.get("/neurofy-health")
async def neurofy_health_check(
    current_user: User = Depends(get_current_user),
):
    """
    Diagnostic endpoint: test if the Nerotix (eKYC) API key is valid and working.
    Returns detailed status about API connectivity, authentication, and balance.
    """
    import asyncio
    result = await asyncio.to_thread(neurofy_service.check_health_detailed)
    return result

@router.get("/requirements", response_model=RequirementsResponse)
def get_requirements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch the list of required and optional documents for the authenticated user."""
    account_type = current_user.account_type.value
    clinic_subtype = current_user.clinic_subtype

    query = db.query(VerificationDocumentRequirement).filter(
        VerificationDocumentRequirement.account_type == account_type,
    )

    if clinic_subtype:
        query = query.filter(
            or_(
                VerificationDocumentRequirement.clinic_subtype == clinic_subtype,
                VerificationDocumentRequirement.clinic_subtype.is_(None)
            )
        )
    else:
        query = query.filter(VerificationDocumentRequirement.clinic_subtype.is_(None))

    requirements = query.all()

    is_individual_no_rci = (
        account_type == "individual"
        and not (current_user.rci_number and current_user.rci_number.strip())
    )

    required = []
    optional = []

    for req in requirements:
        is_required = req.is_required
        label = req.label
        description = req.description

        if is_individual_no_rci and req.document_type == "professional_license":
            is_required = False
            label = "Professional License / Credential (Optional)"
            description = (
                "Upload any professional credential you have (state license, "
                "institution ID, etc.). Not required if you don't have an RCI certificate."
            )

        item = DocumentRequirementOut(
            document_type=req.document_type,
            category=req.document_category.value,
            label=label,
            description=description,
            is_required=is_required,
        )
        if is_required:
            required.append(item)
        else:
            optional.append(item)
    if account_type == "individual":
        is_rci_verified = not is_individual_no_rci
        sig_item = DocumentRequirementOut(
            document_type="e_signature",
            category="professional",
            label="Digital E-Signature",
            description="Upload a clear image of your signature on a white background." if not is_rci_verified else "Required for RCI verified psychologists to sign clinical reports.",
            is_required=is_rci_verified,
        )
        if is_rci_verified:
            required.append(sig_item)
        else:
            optional.append(sig_item)

    return RequirementsResponse(
        account_type=account_type,
        clinic_subtype=clinic_subtype,
        required=required,
        optional=optional,
    )

@router.post("/upload")
async def upload_document(
    document_type: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a single verification document. Upserts if document_type already exists."""

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{file.content_type}' not allowed. Use PDF, JPG, or PNG.",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {MAX_FILE_SIZE_BYTES // (1024*1024)}MB size limit.",
        )

    try:
        doc_category = DocumentCategory(category)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document category: '{category}'. Must be one of: professional, business, identity, compliance.",
        )

    account_type = current_user.account_type.value
    clinic_subtype = current_user.clinic_subtype

    if document_type == "e_signature" and account_type == "individual":
        is_required = not (
            account_type == "individual"
            and not (current_user.rci_number and current_user.rci_number.strip())
        )
    else:
        req_query = db.query(VerificationDocumentRequirement).filter(
            VerificationDocumentRequirement.account_type == account_type,
            VerificationDocumentRequirement.document_type == document_type,
        )
        if clinic_subtype:
            req_query = req_query.filter(
                or_(
                    VerificationDocumentRequirement.clinic_subtype == clinic_subtype,
                    VerificationDocumentRequirement.clinic_subtype.is_(None)
                )
            )
        else:
            req_query = req_query.filter(VerificationDocumentRequirement.clinic_subtype.is_(None))

        requirement = req_query.first()
        if not requirement:
            raise HTTPException(
                status_code=400,
                detail=f"Document type '{document_type}' is not a valid requirement for your account.",
            )
        is_required = requirement.is_required

    user_dir = DOCUMENTS_DIR / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix if file.filename else ".pdf"
    safe_filename = f"{document_type}{ext}"
    dest = user_dir / safe_filename

    with dest.open("wb") as f:
        f.write(contents)

    file_path = f"uploads/documents/{current_user.id}/{safe_filename}"

    existing = db.query(UserVerificationDocument).filter(
        UserVerificationDocument.user_id == current_user.id,
        UserVerificationDocument.document_type == document_type,
    ).first()

    if existing:
        existing.file_path = file_path
        existing.original_filename = file.filename
        existing.document_category = doc_category
        existing.status = "pending"
        existing.is_required = is_required
        doc = existing
    else:
        doc = UserVerificationDocument(
            user_id=current_user.id,
            document_category=doc_category,
            document_type=document_type,
            file_path=file_path,
            original_filename=file.filename,
            status="pending",
            is_required=is_required,
        )
        db.add(doc)

    db.flush()

    if document_type == "e_signature":
        current_user.e_signature_path = file_path
        doc.status = "approved" if current_user.verification_status and current_user.verification_status.value == "approved" else "pending"
        db.commit()
        return {
            "status": "success",
            "document_type": document_type,
            "original_filename": file.filename,
            "file_path": file_path,
            "document_status": doc.status,
        }

    import asyncio
    import logging
    logger = logging.getLogger(__name__)
    neurofy_status = None
    try:

        ocr_result = await asyncio.to_thread(
            coordinator.process_upload,
            expected_slot=document_type,
            file_path=str(dest),
            user_id=current_user.id
        )

        doc.detected_document_type = ocr_result.get("detected_document_type")
        doc.ocr_fields = ocr_result.get("ocr_fields")
        doc.ocr_confidence = ocr_result.get("ocr_confidence")
        doc.verification_response = ocr_result.get("verification_response")
        doc.verification_status = ocr_result.get("verification_status")

        if doc.verification_status == "verified":
            doc.status = "approved"
            neurofy_status = "verified"
        elif doc.verification_status == "failed":
            doc.status = "pending"
            neurofy_status = "rejected"
        else:
            doc.status = "pending"
            neurofy_status = "manual_review"

        logger.info(
            f"Verification pipeline for {document_type} (user {current_user.id}): "
            f"status={doc.verification_status}"
        )
    except Exception as e:
        logger.warning(f"Verification pipeline failed: {e}")
        doc.status = "pending"
        doc.verification_status = "error"

        import re
        error_msg = getattr(e, "detail", str(e))
        clean_msg = re.sub(r'^\d{3}:\s*', '', str(error_msg))

        doc.verification_response = {"error": clean_msg}

    db.commit()

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        org_id=current_user.clinic_id,
        action="DOCUMENT_UPLOADED",
        details={"document_type": document_type, "status": doc.status, "neurofy_status": neurofy_status}
    )

    return {
        "status": "uploaded",
        "document": {
            "document_type": document_type,
            "category": doc_category.value,
            "status": doc.status,
            "filename": safe_filename,
        }
    }

def _get_effective_required_types(current_user: User, db: Session) -> set:
    """
    Return the set of required document_type strings for this user.
    For individual psychologists without an RCI number, 'professional_license'
    is excluded from the required set (it becomes optional).
    """
    account_type = current_user.account_type.value
    clinic_subtype = current_user.clinic_subtype

    req_query = db.query(VerificationDocumentRequirement).filter(
        VerificationDocumentRequirement.account_type == account_type,
        VerificationDocumentRequirement.is_required == True,
    )
    if clinic_subtype:
        req_query = req_query.filter(
            or_(
                VerificationDocumentRequirement.clinic_subtype == clinic_subtype,
                VerificationDocumentRequirement.clinic_subtype.is_(None)
            )
        )
    else:
        req_query = req_query.filter(VerificationDocumentRequirement.clinic_subtype.is_(None))

    required_types = {r.document_type for r in req_query.all()}

    is_individual_no_rci = (
        account_type == "individual"
        and not (current_user.rci_number and current_user.rci_number.strip())
    )
    if is_individual_no_rci:
        required_types.discard("professional_license")

    return required_types

@router.get("/status", response_model=VerificationStatusResponse)
def get_verification_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all uploaded documents for the user + whether they can submit for review."""

    docs = db.query(UserVerificationDocument).filter(
        UserVerificationDocument.user_id == current_user.id,
    ).all()

    required_types = _get_effective_required_types(current_user, db)
    required_count = len(required_types)

    uploaded_map = {d.document_type: d for d in docs}

    uploaded_required = 0
    has_rejected = False
    for rt in required_types:
        if rt in uploaded_map:
            if uploaded_map[rt].status == "rejected":
                has_rejected = True
            else:
                uploaded_required += 1

    can_submit = (
        uploaded_required >= required_count
        and not has_rejected
        and current_user.verification_status.value not in ("pending", "approved")
    )

    doc_list = []
    for d in docs:
        notes = None
        if d.verification_status in ("error", "failed") and d.verification_response and isinstance(d.verification_response, dict):
            notes = d.verification_response.get("error") or d.verification_response.get("notes") or d.verification_response.get("reason")
        elif d.status == "rejected" and d.verification_response and isinstance(d.verification_response, dict):
            notes = d.verification_response.get("notes") or d.verification_response.get("error")

        doc_list.append(UploadedDocumentOut(
            id=str(d.id),
            document_type=d.document_type,
            document_category=d.document_category.value,
            original_filename=d.original_filename,
            status=d.status,
            is_required=d.is_required,
            uploaded_at=d.uploaded_at.isoformat() if d.uploaded_at else None,
            verification_notes=notes,
        ))

    return VerificationStatusResponse(
        documents=doc_list,
        can_submit_review=can_submit,
        verification_status=current_user.verification_status.value,
        required_count=required_count,
        uploaded_required_count=uploaded_required,
    )

@router.post("/submit")
def submit_for_verification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit all documents for admin review. Only allowed if can_submit_review is true."""

    required_types = _get_effective_required_types(current_user, db)

    docs = db.query(UserVerificationDocument).filter(
        UserVerificationDocument.user_id == current_user.id,
    ).all()

    uploaded_map = {d.document_type: d for d in docs}

    for rt in required_types:
        if rt not in uploaded_map:
            raise HTTPException(
                status_code=400,
                detail=f"Required document '{rt}' has not been uploaded.",
            )
        if uploaded_map[rt].status == "rejected":
            raise HTTPException(
                status_code=400,
                detail=f"Document '{rt}' was rejected. Please re-upload before submitting.",
            )

    if current_user.verification_status.value in ("pending", "approved"):
        raise HTTPException(
            status_code=400,
            detail=f"Verification is already '{current_user.verification_status.value}'. Cannot re-submit.",
        )

    db_user = db.query(User).filter(User.id == current_user.id).first()
    db_user.verification_status = VerificationStatus.pending
    db.flush()

    return {
        "status": "submitted",
        "verification_status": "pending",
        "message": "Your documents have been submitted for review. Our team will review them within 1–2 business days.",
    }

@router.delete("/document/{document_type}")
def delete_document(
    document_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an uploaded document."""
    if current_user.verification_status.value in ("pending", "approved"):
        raise HTTPException(
            status_code=400,
            detail=f"Verification is currently '{current_user.verification_status.value}'. Cannot delete documents now.",
        )

    doc = db.query(UserVerificationDocument).filter(
        UserVerificationDocument.user_id == current_user.id,
        UserVerificationDocument.document_type == document_type,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    db.delete(doc)

    if document_type == "e_signature":
        current_user.e_signature_path = None

    db.commit()

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        org_id=current_user.clinic_id,
        action="DOCUMENT_DELETED",
        details={"document_type": document_type}
    )

    return {"status": "deleted"}

@router.delete("/profile/cv")
def remove_rci_cv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove the CV/resume from the user's RCI Reviewer profile."""
    if current_user.role.value != "individual_psychologist":
        raise HTTPException(status_code=403, detail="Only individual psychologists have an RCI profile.")

    if current_user.cv_path:
        try:
            from app.database import DOCUMENTS_DIR

            parts = current_user.cv_path.split("/")
            filename = parts[-1] if parts else None
            user_id_str = parts[-2] if len(parts) >= 2 else str(current_user.id)
            if filename:
                file_path = DOCUMENTS_DIR / user_id_str / filename
                if file_path.exists():
                    file_path.unlink()
        except Exception:
            pass

    current_user.cv_path = None
    current_user.cv_original_filename = None
    db.commit()

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        org_id=current_user.clinic_id,
        action="CV_REMOVED",
        details={}
    )

    return {"status": "removed"}

@router.get("/profile")
def get_rci_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role.value != "individual_psychologist":
        raise HTTPException(status_code=403, detail="Only individual psychologists have an RCI profile.")

    cv_filename = None
    if current_user.cv_path:
        cv_filename = Path(current_user.cv_path).name

    return {
        "cv_uploaded": bool(current_user.cv_path),
        "cv_filename": current_user.cv_original_filename or (Path(current_user.cv_path).name if current_user.cv_path else None),
        "bio": current_user.bio,
        "is_rci_verified": bool(current_user.rci_number)
    }

@router.post("/profile")
async def update_rci_profile(
    bio: str = Form(""),
    cv: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role.value != "individual_psychologist":
        raise HTTPException(status_code=403, detail="Only individual psychologists can update this profile.")
    if not current_user.rci_number:
        raise HTTPException(status_code=403, detail="RCI number is required to update this profile.")

    clean_bio = bio.strip() if bio else None
    if clean_bio and len(clean_bio) > 1000:
        raise HTTPException(status_code=400, detail="Bio must be under 1000 characters.")

    from sqlalchemy import text as _text
    db.execute(
        _text("UPDATE users SET bio = :bio WHERE id = :uid"),
        {"bio": clean_bio, "uid": str(current_user.id)}
    )

    if cv is not None:
        if cv.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]:
            raise HTTPException(status_code=400, detail="CV must be a PDF or Word Document.")

        file_bytes = await cv.read()
        if len(file_bytes) > MAX_FILE_SIZE_BYTES * 2:
            raise HTTPException(status_code=400, detail="CV file size exceeds 10 MB limit.")

        ext = Path(cv.filename).suffix.lower()
        user_doc_dir = DOCUMENTS_DIR / str(current_user.id)
        user_doc_dir.mkdir(parents=True, exist_ok=True)

        cv_path = user_doc_dir / f"cv{ext}"
        with open(cv_path, "wb") as f:
            f.write(file_bytes)

        current_user.cv_path = f"uploads/documents/{current_user.id}/cv{ext}"
        current_user.cv_original_filename = cv.filename

    current_user.verification_status = VerificationStatus.pending
    db.commit()
    db.refresh(current_user)

    return {
        "status": "success",
        "cv_uploaded": bool(current_user.cv_path),
        "cv_filename": current_user.cv_original_filename or (Path(current_user.cv_path).name if current_user.cv_path else None),
        "bio": current_user.bio,
        "is_rci_verified": bool(current_user.rci_number),
        "verification_status": current_user.verification_status.value
    }
