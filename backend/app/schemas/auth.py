"""
Pydantic schemas for auth request/response models.
"""
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, field_validator
from datetime import date


# ── Registration ──────────────────────────────────────────────────────────────

class RegisterIndividualRequest(BaseModel):
    """Registration payload for an Individual Psychologist account."""
    title: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    email: EmailStr
    password: str
    phone: str  # Required — must be OTP-verified
    phone_otp_token: Optional[str] = None  # Firebase ID token proving phone was verified
    professional_domain: Optional[str] = None  # e.g. Clinical Psychologist, Counseling Psychologist, etc.
    rci_number: Optional[str] = None
    specialization: Optional[str] = None
    designation: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    terms_accepted: bool  # Required compliance flag
    ai_disclaimer_accepted: bool
    refund_policy_accepted: bool
    professional_responsibility_accepted: bool

    # ── Advanced verification fields ──────────────────────────────────────
    rci_crosscheck_passed: Optional[bool] = None  # True if phone/email/address matched RCI
    address: Optional[str] = None  # User's address for cross-referencing

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class RegisterClinicRequest(BaseModel):
    """Registration payload for a Clinic account (creates a clinic_admin)."""
    title: Optional[str] = None
    first_name: str          # Contact person first name
    last_name: Optional[str] = None  # Contact person last name
    email: EmailStr
    password: str
    phone: str  # Required — must be OTP-verified
    phone_otp_token: Optional[str] = None  # Firebase ID token proving phone was verified
    clinic_name: str
    clinic_type: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    roc_number: Optional[str] = None
    terms_accepted: bool  # Required compliance flag

    # ── Bank verification fields (Razorpay) ───────────────────────────────
    bank_account_number: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    bank_verified: Optional[bool] = None  # Set by frontend after Razorpay API call
    company_pan: Optional[str] = None
    pan_verified: Optional[bool] = None
    
    ai_disclaimer_accepted: bool
    refund_policy_accepted: bool
    professional_responsibility_accepted: bool

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class RegisterOrgRequest(BaseModel):
    """Registration payload for an Organization account (creates an org_admin)."""
    title: Optional[str] = None
    first_name: str          # Contact person first name
    last_name: Optional[str] = None  # Contact person last name
    email: EmailStr
    password: str
    phone: str  # Required — must be OTP-verified
    phone_otp_token: Optional[str] = None  # Firebase ID token proving phone was verified
    org_name: str
    org_type: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    cin_number: Optional[str] = None
    company_pan: Optional[str] = None
    pan_verified: Optional[bool] = None
    terms_accepted: bool  # Required compliance flag
    ai_disclaimer_accepted: bool
    refund_policy_accepted: bool
    professional_responsibility_accepted: bool

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v



class AddStaffRequest(BaseModel):
    """Clinic Admin adds a new staff member to their clinic."""
    title: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    email: EmailStr
    password: str
    phone: str
    role_type: Literal["staff_view", "psychology_assessment"]
    rci_number: Optional[str] = None


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    account_type: Optional[str] = None  # e.g. "super_admin", "clinic_admin", "clinic_staff", "individual_psychologist"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    email: EmailStr
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ── Response schemas ──────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    email: str
    title: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    role: str
    account_type: str
    verification_status: str
    professional_domain: Optional[str] = None
    clinic_id: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_type: Optional[str] = None
    roc_number: Optional[str] = None
    rci_number: Optional[str] = None
    specialization: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool
    can_assess: bool = False
    module_permissions: Optional[dict] = None

    # Avatar — resolved URL for the frontend
    avatar_url: Optional[str] = None
    e_signature_path: Optional[str] = None

    # OAuth info (provider name only; never expose provider IDs)
    oauth_provider: Optional[str] = None

    # RCI Reviewer Profile
    cv_path: Optional[str] = None
    cv_original_filename: Optional[str] = None
    bio: Optional[str] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class VerificationActionRequest(BaseModel):
    """Super Admin: approve or reject a user's document verification."""
    action: Literal["approve", "reject"]
    notes: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    title: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    designation: Optional[str] = None
    professional_domain: Optional[str] = None

class StaffPermissionsUpdate(BaseModel):
    module_permissions: dict
class UpdateStaffRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    is_active: Optional[bool] = None
    can_assess: Optional[bool] = None
    role: Optional[str] = None
