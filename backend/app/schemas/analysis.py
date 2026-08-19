"""
Pydantic request/response schemas for the Psyichub API.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, Optional, Literal
from datetime import date

class PatientIntakeRequest(BaseModel):
    patient_type: str = "new"
    patient_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[date] = None
    age: Optional[Any] = None
    gender: Optional[Literal["Male", "Female"]] = None
    background: Optional[str] = None
    environment: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("age", mode="before")
    def coerce_age(cls, v):
        """Frontend sends age as a string from HTML input; coerce to int or None."""
        if v is None or v == "" or v == "null":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

class AnalyzeCardRequest(BaseModel):
    patientId: str
    cardId: str
    story: str = Field(..., max_length=10000)
    effectiveAge: Optional[int] = None

class AggregateRequest(BaseModel):
    patientId: str
    card_results: Dict[str, Any]
    assessment_name: Optional[str] = "Assessment"
    request_psychologist_validation: Optional[bool] = False

class ValidateSessionRequest(BaseModel):
    validator_name: str
    license_number: str
    validation_notes: Optional[str] = ""

class FeedbackRequest(BaseModel):
    session_id: str
    card_id: str
    feedback_type: str
    payload: Dict[str, Any]
