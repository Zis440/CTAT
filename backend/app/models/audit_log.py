from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import datetime
import uuid

from app.database import Base
from app.utils.id_generator import generate_id

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: generate_id("AUD"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)  # Renamed from admin_id
    target_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    details = Column(JSON, nullable=True)
    signature_hash = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
