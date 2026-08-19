import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id


class VerificationRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    ESCALATED = "ESCALATED"


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(String, primary_key=True, default=lambda: generate_id("VRQ"))
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_psychologist_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    status = Column(
        SAEnum(VerificationRequestStatus, name="verificationrequeststatus"),
        default=VerificationRequestStatus.PENDING,
        nullable=False,
        index=True
    )
    
    assignment_attempts = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    notes = Column(String, nullable=True)

    def __repr__(self) -> str:
        return f"<VerificationRequest {self.id} (Session: {self.session_id}) - {self.status.value}>"
