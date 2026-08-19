"""
Anonymous Link ORM model.
Tracks one-time tokens for candidates to self-administer assessments.
"""
import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id


from sqlalchemy.dialects.postgresql import JSONB

class AnonymousLink(Base):
    __tablename__ = "anonymous_links"

    token = Column(String, primary_key=True, default=lambda: generate_id("LNK"))
    org_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    
    used = Column(Boolean, default=False, nullable=False)
    resulting_patient_id = Column(String, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    resulting_session_id = Column(String, ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    
    selected_cards = Column(JSON, nullable=True)
    request_validation = Column(Boolean, default=False, nullable=False)

    # Remote Assessment Consent
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_timestamp = Column(DateTime(timezone=True), nullable=True)
    consent_ip_address = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<AnonymousLink {self.token} org={self.org_id} used={self.used}>"
