import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id


class ResetRequestStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    completed = "completed"


class PasswordResetRequest(Base):
    __tablename__ = "password_resets"

    id = Column(String, primary_key=True, default=lambda: generate_id("RST"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    token = Column(String, nullable=True, unique=True, index=True)
    status = Column(
        SAEnum(ResetRequestStatus, name="resetrequeststatus"),
        default=ResetRequestStatus.pending,
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<PasswordResetRequest {self.email} ({self.status})>"
