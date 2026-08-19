"""
User model for Psyichub authentication system.

Roles:
  - super_admin         : Full platform access, manages verification queue, sets pricing
  - clinic_admin        : Manages clinic wallet, staff, and sessions within their clinic
  - clinic_staff        : Runs assessments under a clinic; cannot recharge wallet
  - individual_psychologist : Independent practitioner with their own wallet

Account types:
  - individual  : Solo psychologist subscription
  - clinic      : Clinic/institution with multiple staff
"""
import uuid
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Date, Enum as SAEnum, Float, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class UserRole(str, enum.Enum):
    super_admin             = "super_admin"
    clinic_admin            = "clinic_admin"
    clinic_staff            = "clinic_staff"
    individual_psychologist = "individual_psychologist"
    org_admin               = "org_admin"
    org_staff               = "org_staff"


class AccountType(str, enum.Enum):
    individual   = "individual"
    clinic       = "clinic"
    organization = "organization"


class VerificationStatus(str, enum.Enum):
    not_submitted = "not_submitted"
    pending       = "pending"
    approved      = "approved"
    rejected      = "rejected"


class User(Base):
    __tablename__ = "users"

    id              = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email           = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=True)          # nullable for OAuth-only users
    # ✅ plain_password REMOVED — security fix

    # ── Profile ───────────────────────────────────────────────────
    title           = Column(String, nullable=True)           # e.g., Mr., Dr., Ms.
    first_name      = Column(String, nullable=False)          # ← was full_name
    last_name       = Column(String, nullable=True)           # ← new
    phone           = Column(String, nullable=True)
    date_of_birth   = Column(Date,   nullable=True)
    gender          = Column(String, nullable=True)

    # ── Avatar & Signature ────────────────────────────────────────
    avatar_path     = Column(String, nullable=True)
    e_signature_path = Column(String, nullable=True)

    # ── OAuth ─────────────────────────────────────────────────────
    oauth_provider    = Column(String, nullable=True)
    oauth_provider_id = Column(String, nullable=True)
    oauth_avatar_url  = Column(String, nullable=True)

    # ── Role & Account ────────────────────────────────────────────
    role = Column(
        SAEnum(UserRole, name="userrole"),
        default=UserRole.individual_psychologist,
        nullable=False,
    )
    account_type = Column(
        SAEnum(AccountType, name="accounttype"),
        default=AccountType.individual,
        nullable=False,
    )

    # ── Verification ──────────────────────────────────────────────
    verification_status = Column(
        SAEnum(VerificationStatus, name="verificationstatus"),
        default=VerificationStatus.not_submitted,
        nullable=False,
    )
    verification_notes = Column(String, nullable=True)

    # ── Clinic-specific ───────────────────────────────────────────
    clinic_id   = Column(String, nullable=True, index=True)
    clinic_name = Column(String, nullable=True)
    clinic_type = Column(String, nullable=True)
    address     = Column(String, nullable=True)

    # ── Professional credentials ──────────────────────────────────
    professional_domain = Column(String, nullable=True)
    roc_number      = Column(String, nullable=True)   # Clinic: Registrar of Companies number
    rci_number      = Column(String, nullable=True)   # Individual: RCI Registration number (format: A######)
    specialization  = Column(String, nullable=True)
    designation     = Column(String, nullable=True)
    cv_path         = Column(String, nullable=True)
    cv_original_filename = Column(String, nullable=True)  # stores the user-uploaded filename
    bio             = Column(Text, nullable=True)

    # ── Psychologist Metrics (for Verification Assignment Algorithm) ──
    rating          = Column(Float, nullable=True)     # e.g. 4.8
    experience_years= Column(Integer, nullable=True)
    total_verifications_done = Column(Integer, default=0, nullable=False)

    # ── Flags ─────────────────────────────────────────────────────────
    is_active = Column(Boolean, default=True, nullable=False)
    can_assess = Column(Boolean, default=False, nullable=False)
    module_permissions = Column(JSONB, server_default='{}', default=dict)

    # ── Compliance / Consent ──────────────────────────────────────────
    terms_accepted_at = Column(DateTime(timezone=True), nullable=True)
    terms_accepted_ip = Column(String, nullable=True)
    ai_disclaimer_accepted = Column(Boolean, default=False, nullable=False)
    refund_policy_accepted = Column(Boolean, default=False, nullable=False)
    professional_responsibility_accepted = Column(Boolean, default=False, nullable=False)

    # ── Timestamps ────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ── Convenience property ──────────────────────────────────────
    @property
    def full_name(self) -> str:
        """Keeps PDF reports and existing response schemas working unchanged."""
        if self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name

    @property
    def clinic_subtype(self) -> str | None:
        """Normalize clinic_type (hyphenated from signup) to underscored form for requirement lookups."""
        if not self.clinic_type:
            return None
        return self.clinic_type.replace("-", "_")

    @property
    def avatar_url(self) -> str | None:
        if self.avatar_path:
            return f"/api/auth/avatar/{self.id}"
        if self.oauth_avatar_url:
            return self.oauth_avatar_url
        return None

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"