"""
Auth API router — /api/auth/*

Endpoints:
  POST /api/auth/register/individual  — Register as Individual Psychologist
  POST /api/auth/register/clinic      — Register as Clinic (creates clinic_admin)
  POST /api/auth/login                — Login, receive JWT
  GET  /api/auth/me                   — Get current user profile
  POST /api/auth/forgot-password      — Send password reset (stub)
  POST /api/auth/documents            — Upload verification documents
  GET  /api/auth/verification-queue   — Super Admin: list pending verifications
  PATCH /api/auth/verify/{user_id}    — Super Admin: approve/reject verification
  POST /api/auth/staff                — Clinic Admin: add a staff member
  GET  /api/auth/staff                — Clinic Admin: list their staff
  POST /api/auth/avatar               — Upload profile avatar
  GET  /api/auth/avatar/{user_id}     — Serve avatar image
"""
import uuid
import json
import shutil
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.database import get_db, DOCUMENTS_DIR, AVATARS_DIR
from app.models.user import User, UserRole, AccountType, VerificationStatus
from app.models.password_reset import PasswordResetRequest as DBPasswordResetRequest, ResetRequestStatus
from app.schemas.auth import (
    RegisterIndividualRequest,
    RegisterClinicRequest,
    RegisterOrgRequest,
    AddStaffRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserOut,
    TokenResponse,
    VerificationActionRequest,
    UpdateProfileRequest,
    StaffPermissionsUpdate,
    UpdateStaffRequest,
)
from app.auth.jwt_utils import hash_password, verify_password, create_access_token
from app.auth.dependencies import get_current_user, require_super_admin, require_admin_or_above
from app.models.wallet import Wallet
from app.services.phone_otp_service import phone_otp_service
from app.middleware.rate_limiter import limiter
from app.services.email_service import email_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/force-hash")
def force_hash():
    from app.auth.jwt_utils import hash_password
    return {"hash": hash_password("password123")}


def _create_wallet(user_id: str, db: Session) -> None:
    """Create an empty wallet for a newly registered user."""
    wallet = Wallet(user_id=user_id)
    db.add(wallet)


def _resolve_avatar_url(user: User) -> str | None:
    """Return the best available avatar URL for a user."""
    if user.avatar_path:
        return f"/api/auth/avatar/{user.id}"
    if user.oauth_avatar_url:
        return user.oauth_avatar_url
    return None


def _user_to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        title=user.title,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        date_of_birth=user.date_of_birth,
        gender=user.gender,
        role=user.role.value if isinstance(user.role, UserRole) else user.role,
        account_type=user.account_type.value if isinstance(user.account_type, AccountType) else user.account_type,
        verification_status=user.verification_status.value if isinstance(user.verification_status, VerificationStatus) else user.verification_status,
        professional_domain=user.professional_domain,
        clinic_id=user.clinic_id,
        clinic_name=user.clinic_name,
        clinic_type=user.clinic_type,
        roc_number=user.roc_number,
        rci_number=user.rci_number,
        specialization=user.specialization,
        designation=user.designation,
        is_active=user.is_active,
        can_assess=user.can_assess,
        module_permissions=json.loads(user.module_permissions) if isinstance(user.module_permissions, str) else (user.module_permissions or {}),
        avatar_url=_resolve_avatar_url(user),
        e_signature_path=user.e_signature_path,
        oauth_provider=user.oauth_provider,
        cv_path=user.cv_path,
        cv_original_filename=user.cv_original_filename,
        bio=user.bio,
    )


# ── Register: Individual Psychologist ─────────────────────────────────────────

@router.post("/register/individual", response_model=TokenResponse, status_code=201)
@limiter.limit("3/minute")
def register_individual(req: RegisterIndividualRequest, request: Request, db: Session = Depends(get_db)):
    if not req.terms_accepted:
        raise HTTPException(status_code=400, detail="Terms of Service and Privacy Policy must be accepted.")
    # ── Phone OTP verification ────────────────────────────────────────────────
    if not req.phone_otp_token:
        raise HTTPException(status_code=400, detail="Phone verification is required. Please verify your phone number via OTP.")

    otp_result = phone_otp_service.verify_firebase_token(req.phone_otp_token)
    if not otp_result.verified:
        raise HTTPException(status_code=400, detail=otp_result.error or "Phone verification failed.")

    verified_phone = otp_result.phone_number or req.phone
    # ──────────────────────────────────────────────────────────────────────────

    # ── Advanced identity verification ────────────────────────────────────────
    # If RCI number is provided, we record whether the crosscheck passed.
    # Documents will be uploaded on the verification page.
    # ──────────────────────────────────────────────────────────────────────────

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    initial_status = VerificationStatus.not_submitted

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        title=req.title,
        first_name=req.first_name,
        last_name=req.last_name,
        phone=verified_phone,
        role=UserRole.individual_psychologist,
        account_type=AccountType.individual,
        professional_domain=req.professional_domain,
        rci_number=req.rci_number,
        specialization=req.specialization,
        verification_status=initial_status,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        address=req.address,
        can_assess=True,  # All individual psychologists can run assessments
        terms_accepted_at=func.now(),
        terms_accepted_ip=request.client.host if request.client else None,
        ai_disclaimer_accepted=req.ai_disclaimer_accepted,
        refund_policy_accepted=req.refund_policy_accepted,
        professional_responsibility_accepted=req.professional_responsibility_accepted,
    )
    db.add(user)
    db.flush()  # get user.id before commit
    _create_wallet(user.id, db)
    db.commit()
    db.refresh(user)

    # Cleanup temporary Firebase user (non-blocking)
    if otp_result.firebase_uid:
        phone_otp_service.cleanup_firebase_user(otp_result.firebase_uid)

    audit_service.log_activity(
        db=db,
        user_id=user.id,
        action="REGISTER_INDIVIDUAL",
        details={
            "rci_number": req.rci_number, 
            "email": req.email,
            "terms_accepted": True,
            "ai_disclaimer_accepted": req.ai_disclaimer_accepted,
            "refund_policy_accepted": req.refund_policy_accepted,
            "professional_responsibility_accepted": req.professional_responsibility_accepted,
            "ip_address": request.client.host if request.client else None
        }
    )

    token = create_access_token({"sub": user.id, "role": user.role.value if isinstance(user.role, UserRole) else user.role})
    return TokenResponse(access_token=token, user=_user_to_out(user))


# ── Register: Clinic ──────────────────────────────────────────────────────────

@router.post("/register/clinic", response_model=TokenResponse, status_code=201)
@limiter.limit("3/minute")
def register_clinic(req: RegisterClinicRequest, request: Request, db: Session = Depends(get_db)):
    if not req.terms_accepted:
        raise HTTPException(status_code=400, detail="Terms of Service and Privacy Policy must be accepted.")
    # ── Phone OTP verification ────────────────────────────────────────────────
    if not req.phone_otp_token:
        raise HTTPException(status_code=400, detail="Phone verification is required. Please verify your phone number via OTP.")

    otp_result = phone_otp_service.verify_firebase_token(req.phone_otp_token)
    if not otp_result.verified:
        raise HTTPException(status_code=400, detail=otp_result.error or "Phone verification failed.")

    verified_phone = otp_result.phone_number or req.phone
    # ──────────────────────────────────────────────────────────────────────────

    # ── Bank account verification (Razorpay) ──────────────────────────────────
    # Bank verification is optional. If provided, we store it.
    # ──────────────────────────────────────────────────────────────────────────

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    clinic_id = str(uuid.uuid4())  # Shared ID for all staff of this clinic

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        title=req.title,
        first_name=req.first_name,
        last_name=req.last_name,
        phone=verified_phone,
        role=UserRole.clinic_admin,
        account_type=AccountType.clinic,
        clinic_id=clinic_id,
        clinic_name=req.clinic_name,
        clinic_type=req.clinic_type,
        address=req.address,
        verification_status=VerificationStatus.not_submitted,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        roc_number=req.roc_number,
        terms_accepted_at=func.now(),
        terms_accepted_ip=request.client.host if request.client else None,
        ai_disclaimer_accepted=req.ai_disclaimer_accepted,
        refund_policy_accepted=req.refund_policy_accepted,
        professional_responsibility_accepted=req.professional_responsibility_accepted,
    )
    db.add(user)
    db.flush()
    _create_wallet(user.id, db)
    db.commit()
    db.refresh(user)

    # Cleanup temporary Firebase user (non-blocking)
    if otp_result.firebase_uid:
        phone_otp_service.cleanup_firebase_user(otp_result.firebase_uid)

    audit_service.log_activity(
        db=db,
        user_id=user.id,
        org_id=clinic_id,
        action="REGISTER_CLINIC",
        details={
            "clinic_name": req.clinic_name, 
            "clinic_type": req.clinic_type,
            "terms_accepted": True,
            "ai_disclaimer_accepted": req.ai_disclaimer_accepted,
            "refund_policy_accepted": req.refund_policy_accepted,
            "professional_responsibility_accepted": req.professional_responsibility_accepted,
            "ip_address": request.client.host if request.client else None
        }
    )

    token = create_access_token({"sub": user.id, "role": user.role.value if isinstance(user.role, UserRole) else user.role})
    return TokenResponse(access_token=token, user=_user_to_out(user))


# ── Register: Organization ──────────────────────────────────────────────────────

@router.post("/register/organization", response_model=TokenResponse, status_code=201)
@limiter.limit("3/minute")
def register_organization(req: RegisterOrgRequest, request: Request, db: Session = Depends(get_db)):
    if not req.terms_accepted:
        raise HTTPException(status_code=400, detail="Terms of Service and Privacy Policy must be accepted.")
    # ── Phone OTP verification ────────────────────────────────────────────────
    if not req.phone_otp_token:
        raise HTTPException(status_code=400, detail="Phone verification is required. Please verify your phone number via OTP.")

    otp_result = phone_otp_service.verify_firebase_token(req.phone_otp_token)
    if not otp_result.verified:
        raise HTTPException(status_code=400, detail=otp_result.error or "Phone verification failed.")

    verified_phone = otp_result.phone_number or req.phone
    # ──────────────────────────────────────────────────────────────────────────

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    org_id = str(uuid.uuid4())  # Shared ID for all staff of this organization

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        title=req.title,
        first_name=req.first_name,
        last_name=req.last_name,
        phone=verified_phone,
        role=UserRole.org_admin,
        account_type=AccountType.organization,
        clinic_id=org_id,  # Reusing clinic_id for org grouping
        clinic_name=req.org_name,  # Reusing clinic_name for org name
        clinic_type=req.org_type,
        address=req.address,
        verification_status=VerificationStatus.not_submitted,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        roc_number=req.cin_number,  # Reusing roc_number for cin_number
        terms_accepted_at=func.now(),
        terms_accepted_ip=request.client.host if request.client else None,
        ai_disclaimer_accepted=req.ai_disclaimer_accepted,
        refund_policy_accepted=req.refund_policy_accepted,
        professional_responsibility_accepted=req.professional_responsibility_accepted,
    )
    db.add(user)
    db.flush()
    
    # Create OrgProfile
    from app.models.org import OrgProfile
    org_profile = OrgProfile(
        org_id=org_id,
        org_name=req.org_name,
        contact_email=req.email,
    )
    db.add(org_profile)
    
    _create_wallet(user.id, db)
    db.commit()
    db.refresh(user)

    # Cleanup temporary Firebase user (non-blocking)
    if otp_result.firebase_uid:
        phone_otp_service.cleanup_firebase_user(otp_result.firebase_uid)

    audit_service.log_activity(
        db=db,
        user_id=user.id,
        org_id=org_id,
        action="REGISTER_ORGANIZATION",
        details={
            "org_name": req.org_name, 
            "org_type": req.org_type,
            "terms_accepted": True,
            "ai_disclaimer_accepted": req.ai_disclaimer_accepted,
            "refund_policy_accepted": req.refund_policy_accepted,
            "professional_responsibility_accepted": req.professional_responsibility_accepted,
            "ip_address": request.client.host if request.client else None
        }
    )

    token = create_access_token({"sub": user.id, "role": user.role.value if isinstance(user.role, UserRole) else user.role})
    return TokenResponse(access_token=token, user=_user_to_out(user))


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact support.")

    # Option B: validate selected account type matches the user's stored role
    user_role_val = user.role.value if isinstance(user.role, UserRole) else user.role
    if req.account_type and req.account_type != user_role_val:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is not registered as '{req.account_type}'. "
                   f"Please select the correct account type and try again.",
        )

    audit_service.log_activity(
        db=db,
        user_id=user.id,
        org_id=user.clinic_id,
        action="LOGIN_SUCCESS",
        details={"ip_address": "unknown"} # Could extract from Request if needed
    )

    token = create_access_token({"sub": user.id, "role": user.role.value if isinstance(user.role, UserRole) else user.role})
    return TokenResponse(access_token=token, user=_user_to_out(user))


# ── Get current user ──────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return _user_to_out(current_user)

@router.delete("/me", status_code=200)
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete the current user's account permanently."""
    user_id = current_user.id
    
    # Audit log the deletion right before it happens
    audit_service.log_activity(
        db=db,
        user_id=user_id,
        action="ACCOUNT_DELETED",
        details={"reason": "User requested account deletion"}
    )
    
    try:
        from sqlalchemy import text
        uid = user_id
        db.execute(text("DELETE FROM password_resets WHERE user_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM anonymous_links WHERE org_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM org_assessment_requests WHERE org_id = :uid OR assigned_psychologist_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM verification_requests WHERE assigned_psychologist_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM audit_logs WHERE user_id = :uid OR target_user_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM appointments WHERE psychologist_id = :uid OR patient_id IN (SELECT id FROM patients WHERE user_id = :uid)"), {"uid": uid})
        db.execute(text("DELETE FROM support_messages WHERE sender_id = :uid OR ticket_id IN (SELECT id FROM support_tickets WHERE user_id = :uid)"), {"uid": uid})
        db.execute(text("DELETE FROM support_tickets WHERE user_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM user_verification_documents WHERE user_id = :uid"), {"uid": uid})
        db.execute(text("UPDATE screening_reports SET verified_by_id = NULL WHERE verified_by_id = :uid"), {"uid": uid})
        # Patient cascade
        db.execute(text("UPDATE screening_reports SET patient_id = NULL WHERE patient_id IN (SELECT id FROM patients WHERE user_id = :uid)"), {"uid": uid})
        db.execute(text("UPDATE sessions SET assigned_psychologist_id = NULL WHERE assigned_psychologist_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM sessions WHERE user_id = :uid OR patient_id IN (SELECT id FROM patients WHERE user_id = :uid)"), {"uid": uid})
        db.execute(text("DELETE FROM patients WHERE user_id = :uid"), {"uid": uid})
        
        # Wallet cascade
        db.execute(text("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = :uid) OR created_by_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM wallets WHERE user_id = :uid"), {"uid": uid})
        
        # Profiles
        db.execute(text("DELETE FROM clinic_profiles WHERE clinic_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM org_profiles WHERE org_id = :uid"), {"uid": uid})
        
        # Finally user
        db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})
        
        db.expunge(current_user)
        db.commit()
    except Exception as exc:
        db.rollback()
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Failed to delete account due to associated data constraints: {exc}")

    return {"status": "deleted", "user_id": user_id}

@router.patch("/me", response_model=UserOut)
def update_me(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile."""
    if req.email and req.email != current_user.email:
        if db.query(User).filter(User.email == req.email).first():
            raise HTTPException(status_code=409, detail="Email already registered")
        current_user.email = req.email

    if req.title is not None:
        current_user.title = req.title
    if req.first_name is not None:
        current_user.first_name = req.first_name
    if req.last_name is not None:
        current_user.last_name = req.last_name
    if req.phone is not None:
        current_user.phone = req.phone
    if req.date_of_birth is not None:
        current_user.date_of_birth = req.date_of_birth
    if req.gender is not None:
        current_user.gender = req.gender
    if req.designation is not None:
        current_user.designation = req.designation
    
    if req.professional_domain is not None and req.professional_domain != current_user.professional_domain:
        old_domain = current_user.professional_domain
        new_domain = req.professional_domain
        
        # If the user switches to a domain that requires RCI (Clinical Psychologist)
        if new_domain == "Clinical Psychologist" and old_domain != "Clinical Psychologist":
            # Reset verification status so they must upload RCI documents
            current_user.verification_status = "not_submitted"
            current_user.can_assess = False
            
        current_user.professional_domain = new_domain

    db.commit()
    db.refresh(current_user)
    return _user_to_out(current_user)


# ── Forgot password ───────────────────────────────────────────────────────────

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(req: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Creates a password reset request. The actual email sending is handled by 
    an automated background script (process_password_resets.py) to prevent 
    blocking the API and to simulate a queue.
    """
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        # Create a new pending request
        reset_req = DBPasswordResetRequest(
            user_id=user.id,
            email=user.email,
            status=ResetRequestStatus.pending
        )
        db.add(reset_req)
        db.commit()

    # Always return success to prevent email enumeration attacks
    return {"message": "If this email is registered, a reset link will be sent shortly."}


# ── Reset Password (from link) ────────────────────────────────────────────────

from datetime import datetime, timezone

@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Validates the token, verifies the email matches, checks expiration, 
    and updates the user's password.
    """
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Find the request
    reset_req = db.query(DBPasswordResetRequest).filter(
        DBPasswordResetRequest.token == req.token,
        DBPasswordResetRequest.status == ResetRequestStatus.sent
    ).first()

    if not reset_req:
        raise HTTPException(status_code=400, detail="Invalid or already used reset token.")

    if reset_req.email.lower() != req.email.lower():
        raise HTTPException(status_code=400, detail="Email does not match the reset request.")

    # Check expiration (if expires_at is set, and if current time > expires_at)
    if reset_req.expires_at and datetime.now(timezone.utc) > reset_req.expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    # Find the user
    user = db.query(User).filter(User.id == reset_req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Update the password
    user.hashed_password = hash_password(req.new_password)
    
    # Mark request as completed
    reset_req.status = ResetRequestStatus.completed
    reset_req.token = None # Invalidate the token

    db.commit()
    return {"message": "Password successfully reset. You may now log in."}


# ── Change Password ───────────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel

class ChangePasswordRequest(_BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authenticated user changes their own password."""
    # Verify current password
    if not current_user.hashed_password or not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    db_user = db.query(User).filter(User.id == current_user.id).first()
    db_user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully."}



@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload or replace the current user's profile avatar."""
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{file.content_type}' not allowed. Use JPG, PNG, or WebP.",
        )

    AVATARS_DIR.mkdir(parents=True, exist_ok=True)

    # Determine extension from content type
    ext_map = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    ext = ext_map.get(file.content_type, ".jpg")
    filename = f"{current_user.id}{ext}"
    dest = AVATARS_DIR / filename

    # Remove old avatar if exists with different extension
    for old in AVATARS_DIR.glob(f"{current_user.id}.*"):
        old.unlink(missing_ok=True)

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # Update DB
    db_user = db.query(User).filter(User.id == current_user.id).first()
    db_user.avatar_path = f"uploads/avatars/{filename}"
    db.commit()

    return {
        "status": "uploaded",
        "avatar_url": f"/api/auth/avatar/{current_user.id}",
    }


@router.get("/avatar/{user_id}")
async def serve_avatar(user_id: str):
    """Serve a user's avatar image. Returns 404 if no avatar uploaded."""
    # Sanitize user_id to prevent path traversal
    from pathlib import PurePosixPath
    safe_id = PurePosixPath(user_id).name
    if not safe_id or safe_id != user_id:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    for ext in (".jpg", ".png", ".webp"):
        path = AVATARS_DIR / f"{safe_id}{ext}"
        if path.exists():
            media_types = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
            return FileResponse(path, media_type=media_types[ext])
    raise HTTPException(status_code=404, detail="Avatar not found")


# ── Document Upload (Legacy — redirects to /api/verification/upload) ──────────
# Kept for backwards compatibility; new clients should use /api/verification/upload.

@router.post("/documents")
async def upload_documents_legacy(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Legacy document upload endpoint. Use POST /api/verification/upload instead."""
    raise HTTPException(
        status_code=410,
        detail="This endpoint has been replaced. Use POST /api/verification/upload with document_type and category fields.",
    )


# ── Verification Status ───────────────────────────────────────────────────────

@router.get("/verification-status")
def get_verification_status(current_user: User = Depends(get_current_user)):
    return {
        "status": current_user.verification_status.value if isinstance(current_user.verification_status, VerificationStatus) else current_user.verification_status,
        "notes": current_user.verification_notes,
    }


# ── Admin: Serve Verification Documents ──────────────────────────────────────

@router.get("/admin/documents/{user_id}")
def list_user_documents(
    user_id: str,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: list all uploaded verification documents for a user."""
    from app.models.verification import UserVerificationDocument

    docs = db.query(UserVerificationDocument).filter(
        UserVerificationDocument.user_id == user_id
    ).all()

    return {
        "files": [
            {
                "document_type": d.document_type,
                "original_filename": d.original_filename,
                "filename": d.file_path.split("/")[-1] if d.file_path else "",
                "status": d.status,
                "category": d.document_category.value,
                "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            }
            for d in docs
        ]
    }


@router.get("/admin/documents/{user_id}/{filename}")
async def serve_user_document(
    user_id: str,
    filename: str,
    _: User = Depends(require_super_admin),
):
    """Super Admin: stream a single uploaded verification document for inline viewing."""
    # Sanitise — prevent path traversal
    safe_name = Path(filename).name
    doc_path = DOCUMENTS_DIR / user_id / safe_name

    if not doc_path.exists() or not doc_path.is_file():
        raise HTTPException(status_code=404, detail="Document not found")

    ext = doc_path.suffix.lower()
    media_type_map = {
        ".pdf":  "application/pdf",
        ".jpg":  "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png":  "image/png",
    }
    media_type = media_type_map.get(ext, "application/octet-stream")

    return FileResponse(
        path=doc_path,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
    )


# ── Super Admin: Verification Queue ──────────────────────────────────────────

@router.get("/verification-queue", response_model=List[UserOut])
def verification_queue(
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """List all users with pending verification."""
    users = db.query(User).filter(User.verification_status == VerificationStatus.pending).all()
    return [_user_to_out(u) for u in users]


@router.patch("/verify/{user_id}")
def verify_user(
    user_id: str,
    req: VerificationActionRequest,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin approves or rejects a user's document verification."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.action == "approve":
        user.verification_status = VerificationStatus.approved
        user.verification_notes = req.notes or ""
    else:
        user.verification_status = VerificationStatus.rejected
        user.verification_notes = req.notes or "Documents did not meet requirements. Please resubmit."

    db.commit()
    status_val = user.verification_status.value if isinstance(user.verification_status, VerificationStatus) else user.verification_status
    return {"status": status_val, "user_id": user_id}


# ── Clinic/Org Admin: Manage Staff ────────────────────────────────────────────────

@router.post("/staff", response_model=UserOut, status_code=201)
def add_staff(
    req: AddStaffRequest,
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    """Admin adds a staff member who shares the same clinic_id (or org_id)."""
    actual_clinic_id = current_user.clinic_id or current_user.id
    if not actual_clinic_id:
        raise HTTPException(status_code=400, detail="No organization associated with this account")

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    is_org = current_user.role == UserRole.org_admin
    new_role = UserRole.org_staff if is_org else UserRole.clinic_staff
    new_account_type = AccountType.organization if is_org else AccountType.clinic

    staff = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        title=req.title,
        first_name=req.first_name,
        last_name=req.last_name,
        phone=req.phone,
        role=new_role,
        account_type=new_account_type,
        clinic_id=actual_clinic_id,
        clinic_name=current_user.clinic_name,
        address=current_user.address,
        verification_status=VerificationStatus.approved,  # Vouched for by admin
        can_assess=(req.role_type == "psychology_assessment"),
        rci_number=req.rci_number if req.role_type == "psychology_assessment" else None,
        module_permissions={
            "assessments": req.role_type == "psychology_assessment",
            "appointments": False,
            "candidates": True,
            "reports": True,
            "can_view_wallet_history": False
        }
    )
    db.add(staff)
    db.flush()
    _create_wallet(staff.id, db)
    db.commit()
    db.refresh(staff)

    # ── Send confirmation email to new staff member ───────────────────────────
    staff_name = f"{req.first_name} {req.last_name or ''}".strip()
    role_label = "Psychology Assessment Staff" if req.role_type == "psychology_assessment" else "Staff Member"
    email_service.send_staff_added_email(
        staff_email=req.email,
        staff_name=staff_name,
        clinic_name=current_user.clinic_name or "Your Organization",
        role=role_label,
        temp_password=req.password,  # Notify them of their initial password
    )
    # ─────────────────────────────────────────────────────────────────────────

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        target_user_id=staff.id,
        org_id=actual_clinic_id,
        action="STAFF_ADDED",
        details={"role": staff.role.value if isinstance(staff.role, UserRole) else staff.role}
    )

    return _user_to_out(staff)


@router.get("/staff", response_model=List[UserOut])
def list_staff(
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    """Admin lists all staff in their organization."""
    actual_clinic_id = current_user.clinic_id or current_user.id
    if not actual_clinic_id:
        raise HTTPException(status_code=400, detail="No organization associated with this account")
    
    target_role = UserRole.org_staff if current_user.role == UserRole.org_admin else UserRole.clinic_staff
    
    staff = (
        db.query(User)
        .filter(
            User.clinic_id == actual_clinic_id,
            User.role == target_role,
        )
        .all()
    )
    return [_user_to_out(u) for u in staff]

@router.put("/staff/{staff_id}/permissions", response_model=UserOut)
def update_staff_permissions(
    staff_id: str,
    req: StaffPermissionsUpdate,
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    """Clinic Admin updates specific module permissions for a staff member."""
    actual_clinic_id = current_user.clinic_id or current_user.id
    staff = db.query(User).filter(
        User.id == staff_id,
        User.clinic_id == actual_clinic_id,
        User.role.in_([UserRole.clinic_staff, UserRole.org_staff])
    ).first()

    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    staff.module_permissions = req.module_permissions
    
    # Also sync can_assess with module_permissions.assessments for backward compatibility if needed
    if "assessments" in req.module_permissions:
        staff.can_assess = req.module_permissions["assessments"]

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(staff, "module_permissions")

    db.commit()
    db.refresh(staff)
    
    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        target_user_id=staff.id,
        org_id=actual_clinic_id,
        action="UPDATE_STAFF_PERMISSIONS",
        details={"permissions": req.module_permissions}
    )
    
    return _user_to_out(staff)

# ── Register OAuth Router ─────────────────────────────────────────────────────

@router.get("/staff/{staff_id}", response_model=UserOut)
def get_staff_detail(
    staff_id: str,
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    """Admin views a single staff member."""
    actual_clinic_id = current_user.clinic_id or current_user.id
    target_roles = [UserRole.clinic_staff, UserRole.org_staff, UserRole.clinic_admin, UserRole.org_admin]
    staff = db.query(User).filter(
        User.id == staff_id,
        User.clinic_id == actual_clinic_id,
        User.role.in_(target_roles)
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    return _user_to_out(staff)

@router.patch("/staff/{staff_id}", response_model=UserOut)
def update_staff(
    staff_id: str,
    req: UpdateStaffRequest,
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    """Admin updates their staff member's details."""
    actual_clinic_id = current_user.clinic_id or current_user.id
    target_roles = [UserRole.clinic_staff, UserRole.org_staff, UserRole.clinic_admin, UserRole.org_admin]
    staff = db.query(User).filter(
        User.id == staff_id,
        User.clinic_id == actual_clinic_id,
        User.role.in_(target_roles)
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    updates = req.model_dump(exclude_unset=True)
    
    # Process role if it was sent
    if "role" in updates and updates["role"]:
        try:
            updates["role"] = UserRole(updates["role"])
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {updates['role']}")
            
    for field, value in updates.items():
        if field == "can_assess":
            staff.can_assess = value
            if staff.module_permissions is None:
                staff.module_permissions = {}
            staff.module_permissions["assessments"] = value
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(staff, "module_permissions")
        else:
            setattr(staff, field, value)
            
    db.commit()
    db.refresh(staff)
    
    # Log the staff update activity
    safe_updates = {}
    for k, v in updates.items():
        if hasattr(v, "value"):
            safe_updates[k] = v.value
        else:
            safe_updates[k] = v

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        target_user_id=staff.id,
        org_id=actual_clinic_id,
        action="UPDATE_STAFF_DETAILS",
        details=safe_updates
    )
    
    return _user_to_out(staff)

from app.auth.oauth import router as oauth_router
router.include_router(oauth_router)
