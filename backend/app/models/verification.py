"""
SQLAlchemy models for the dynamic verification documents system.

Tables:
  - user_verification_documents     — per-user document uploads with status tracking
  - verification_document_requirements — config table defining required/optional docs per account type
"""
import uuid
import enum

from sqlalchemy import (
    Column, String, Boolean, Text, Integer, DateTime, ForeignKey,
    Enum as SAEnum, UniqueConstraint, Index, JSON, Float
)
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id

class DocumentCategory(str, enum.Enum):
    professional = "professional"
    business     = "business"
    identity     = "identity"
    compliance   = "compliance"

class UserVerificationDocument(Base):
    """A single verification document uploaded by a user."""
    __tablename__ = "user_verification_documents"

    id                = Column(String, primary_key=True, default=lambda: generate_id("DOC"))
    user_id           = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_category = Column(SAEnum(DocumentCategory, name="document_category", create_type=False), nullable=False)
    document_type     = Column(String(100), nullable=False)
    file_path         = Column(Text, nullable=False)
    original_filename = Column(Text, nullable=True)
    status            = Column(String(20), default="pending", nullable=False)
    is_required       = Column(Boolean, default=True, nullable=False)
    uploaded_at       = Column(DateTime(timezone=True), server_default=func.now())

    detected_document_type = Column(String(100), nullable=True)
    ocr_fields             = Column(JSON, nullable=True)
    ocr_confidence         = Column(Float, nullable=True)
    verification_response  = Column(JSON, nullable=True)
    verification_status    = Column(String(50), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "document_type", name="uq_user_document_type"),
        Index("idx_uvd_user_id", "user_id"),
        Index("idx_uvd_document_type", "document_type"),
    )

    def __repr__(self) -> str:
        return f"<VerificationDoc {self.document_type} for user={self.user_id} [{self.status}]>"

class VerificationDocumentRequirement(Base):
    """Configuration row defining which documents are required for each account/clinic type."""
    __tablename__ = "verification_document_requirements"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    account_type      = Column(String(20), nullable=False)
    clinic_subtype    = Column(String(50), nullable=True)
    document_type     = Column(String(100), nullable=False)
    document_category = Column(SAEnum(DocumentCategory, name="document_category", create_type=False), nullable=False)
    is_required       = Column(Boolean, nullable=False)
    label             = Column(String(200), nullable=False)
    description       = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_vdr_account_type", "account_type"),
        Index("idx_vdr_clinic_subtype", "clinic_subtype"),
    )

    def __repr__(self) -> str:
        return f"<DocRequirement {self.document_type} for {self.account_type}/{self.clinic_subtype}>"
