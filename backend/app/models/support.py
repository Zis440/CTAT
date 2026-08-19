import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id

class TicketStatus(str, enum.Enum):
    open = "open"
    closed = "closed"

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(String, primary_key=True, default=lambda: generate_id("TKT"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    subject = Column(String, nullable=False)
    message = Column(String, nullable=False)
    status = Column(
        SAEnum(TicketStatus, name="ticketstatus"),
        default=TicketStatus.open,
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(String, primary_key=True, default=lambda: generate_id("MSG"))
    ticket_id = Column(String, ForeignKey("support_tickets.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    attachment_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
