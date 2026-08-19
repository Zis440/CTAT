"""
Appointment ORM model.

Tracks scheduled appointments between a psychologist (user) and a patient.
Visible to:
  - The psychologist who owns the appointment
  - Clinic admins (for appointments within their clinic)
  - Super admins (all appointments platform-wide)
"""
import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, Date, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id

class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_id("APT"),
    )

    psychologist_id = Column(
        String, ForeignKey("users.id"), nullable=False, index=True
    )

    patient_id = Column(
        String, ForeignKey("patients.id"), nullable=False, index=True
    )

    clinic_id = Column(String, nullable=True, index=True)

    appointment_date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)

    status = Column(
        SAEnum(AppointmentStatus, name="appointmentstatus"),
        default=AppointmentStatus.scheduled,
        nullable=False,
    )

    purpose = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Appointment {self.id} psych={self.psychologist_id} patient={self.patient_id} {self.appointment_date}>"
