from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SupportTicketCreate(BaseModel):
    subject: str
    message: str

class SupportTicketOut(BaseModel):
    id: str
    user_id: str
    subject: str
    message: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SupportTicketAdminOut(BaseModel):
    id: str
    user_id: str
    subject: str
    message: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SupportMessageCreate(BaseModel):
    message: str

class SupportMessageOut(BaseModel):
    id: str
    ticket_id: str
    sender_id: str
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    message: str
    attachment_path: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
