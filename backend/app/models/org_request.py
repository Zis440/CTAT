"""
Organization Assessment Request model.
Tracks SLA compliance for assessments requested by organizations.
"""
import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id

class OrgRequestStatus(str, enum.Enum):
    pending = "pending"
    assigned = "assigned"
    completed = "completed"
    expired = "expired"

class OrgAssessmentRequest(Base):
    __tablename__ = "org_assessment_requests"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_id("REQ"),
    )

    org_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)

    assigned_psychologist_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(
        SAEnum(OrgRequestStatus, name="orgrequeststatus"),
        default=OrgRequestStatus.pending,
        nullable=False,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sla_deadline = Column(DateTime(timezone=True), nullable=False)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<OrgAssessmentRequest {self.id} org={self.org_id} patient={self.patient_id} status={self.status.value}>"
