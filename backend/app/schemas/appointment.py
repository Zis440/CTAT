from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime

class AppointmentCreate(BaseModel):
    patient_id: str
    psychologist_id: Optional[str] = None
    appointment_date: date
    start_time: str
    duration_minutes: int = 60
    purpose: Optional[str] = None
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    """Partial update — all fields optional."""
    patient_id: Optional[str] = None
    appointment_date: Optional[date] = None
    start_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None

class AppointmentOut(BaseModel):
    id: str
    psychologist_id: str
    patient_id: str
    clinic_id: Optional[str] = None
    appointment_date: date
    start_time: str
    duration_minutes: int
    status: str
    purpose: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AppointmentAdminOut(AppointmentOut):
    """Extended view for Super Admin / Clinic Admin — includes denormalized names."""
    psychologist_name: Optional[str] = None
    psychologist_email: Optional[str] = None
    patient_name: Optional[str] = None
    clinic_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
