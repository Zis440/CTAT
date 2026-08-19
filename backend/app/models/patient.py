"""
Patient and Session ORM models.

Patient replaces the old CSV-based patient_database.csv.
Session tracks metadata for each TAT analysis session; the full JSON blob
stays on disk to keep the database small.

Patients are scoped to practitioners via user_id, but within a clinic they
are visible to all staff sharing the same clinic_id.
"""
import uuid
from datetime import date
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date, Text, ForeignKey,
)
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=lambda: generate_id("PAT"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    clinic_id = Column(String, nullable=True, index=True)

    patient_type = Column(String, nullable=False, default="new")
    first_name = Column(String, default="Anonymous")
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    gender_confidence = Column(Float, nullable=True)
    consent_given = Column(Boolean, default=False)

    background = Column(Text, nullable=True)
    environment = Column(Text, nullable=True)

    living_condition = Column(String, nullable=True)
    family_structure = Column(String, nullable=True)
    residence_type = Column(String, nullable=True)
    environment_type = Column(String, nullable=True)
    education_level = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    socioeconomic_status = Column(String, nullable=True)

    notes = Column(Text, default="")

    total_sessions = Column(Integer, default=0)
    first_session_date = Column(DateTime(timezone=True), server_default=func.now())
    last_session_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def computed_age(self) -> int | None:
        """Auto-calculate age from date_of_birth. Falls back to raw age column."""
        if self.date_of_birth:
            dob = self.date_of_birth
            if isinstance(dob, str):
                try:
                    dob = date.fromisoformat(dob)
                except (ValueError, TypeError):
                    return self.age
            today = date.today()
            return today.year - dob.year - (
                (today.month, today.day) < (dob.month, dob.day)
            )
        return self.age

    def __repr__(self) -> str:
        name_str = f"{self.first_name} {self.last_name}" if self.last_name else self.first_name
        return f"<Patient {self.id} ({name_str})>"

class Session(Base):
    """
    Metadata record for a TAT analysis session.

    The heavy analysis payload (card results, aggregation) is stored as a JSON
    file on disk at ``session_data_path``.  Only lightweight metadata lives in
    the database to keep it small and enable fast listing/filtering queries.
    """
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: generate_id("SES"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)

    session_data_path = Column(String, nullable=False)
    pdf_filename = Column(String, nullable=True)

    cards_examined = Column(String, nullable=True)
    patient_name = Column(String, nullable=True)

    validation_status = Column(String, default="Draft")
    validator_name = Column(String, nullable=True)
    validator_license = Column(String, nullable=True)
    validation_date = Column(DateTime(timezone=True), nullable=True)
    validation_notes = Column(Text, nullable=True)
    assigned_psychologist_id = Column(String, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<Session {self.id} patient={self.patient_id}>"
