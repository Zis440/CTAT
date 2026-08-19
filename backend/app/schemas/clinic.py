from pydantic import BaseModel, ConfigDict
from typing import Optional

class ClinicProfileUpdate(BaseModel):
    clinic_name: Optional[str] = None
    tagline: Optional[str] = None
    contact_email: Optional[str] = None
    support_phone: Optional[str] = None

class ClinicProfileOut(BaseModel):
    clinic_id: str
    clinic_name: Optional[str] = None
    tagline: Optional[str] = None
    contact_email: Optional[str] = None
    support_phone: Optional[str] = None
    logo_path: Optional[str] = None
    cover_path: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
