"""
Patient API router — /api/patients/*

CRUD operations for patient records.  Patients are scoped per-user, but within
a clinic they are visible to all staff who share the same ``clinic_id``.

Endpoints:
  POST   /api/patients              — Create a new patient
  GET    /api/patients              — List patients visible to current user
  GET    /api/patients/{patient_id} — Get a single patient
  PUT    /api/patients/{patient_id} — Update patient details
  DELETE /api/patients/{patient_id} — Delete a patient record
"""
from typing import Optional, List, Literal
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import or_
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.auth.dependencies import get_current_user, require_permission, require_patients_or_assessments, require_any_permission
from app.models.patient import Patient
from app.services.email_service import email_service

router = APIRouter(prefix="/api/patients", tags=["patients"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    patient_type: str = "new"  # "new", "existing", "anonymous"
    first_name: str = "Anonymous"
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[Literal["Male", "Female"]] = None
    gender_confidence: Optional[float] = None
    consent_given: bool = False
    background: Optional[str] = None
    environment: Optional[str] = None
    living_condition: Optional[str] = None
    family_structure: Optional[str] = None
    residence_type: Optional[str] = None
    environment_type: Optional[str] = None
    education_level: Optional[str] = None
    occupation: Optional[str] = None
    socioeconomic_status: Optional[str] = None
    notes: str = ""


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[Literal["Male", "Female"]] = None
    gender_confidence: Optional[float] = None
    consent_given: Optional[bool] = None
    background: Optional[str] = None
    environment: Optional[str] = None
    living_condition: Optional[str] = None
    family_structure: Optional[str] = None
    residence_type: Optional[str] = None
    environment_type: Optional[str] = None
    education_level: Optional[str] = None
    occupation: Optional[str] = None
    socioeconomic_status: Optional[str] = None
    notes: Optional[str] = None


class PatientOut(BaseModel):
    id: str
    user_id: str
    clinic_id: Optional[str] = None
    patient_type: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    gender_confidence: Optional[float] = None
    consent_given: bool
    background: Optional[str] = None
    environment: Optional[str] = None
    living_condition: Optional[str] = None
    family_structure: Optional[str] = None
    residence_type: Optional[str] = None
    environment_type: Optional[str] = None
    education_level: Optional[str] = None
    occupation: Optional[str] = None
    socioeconomic_status: Optional[str] = None
    notes: Optional[str] = None
    total_sessions: int
    first_session_date: Optional[str] = None
    last_session_date: Optional[str] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _patient_to_out(p: Patient) -> PatientOut:
    return PatientOut(
        id=p.id,
        user_id=p.user_id,
        clinic_id=p.clinic_id,
        patient_type=p.patient_type,
        first_name=p.first_name,
        last_name=p.last_name,
        email=p.email,
        phone_number=p.phone_number,
        date_of_birth=p.date_of_birth,
        age=p.computed_age,
        gender=p.gender,
        gender_confidence=p.gender_confidence,
        consent_given=p.consent_given,
        background=p.background,
        environment=p.environment,
        living_condition=p.living_condition,
        family_structure=p.family_structure,
        residence_type=p.residence_type,
        environment_type=p.environment_type,
        education_level=p.education_level,
        occupation=p.occupation,
        socioeconomic_status=p.socioeconomic_status,
        notes=p.notes,
        total_sessions=p.total_sessions,
        first_session_date=p.first_session_date.isoformat() if p.first_session_date and hasattr(p.first_session_date, 'isoformat') else p.first_session_date,
        last_session_date=p.last_session_date.isoformat() if p.last_session_date and hasattr(p.last_session_date, 'isoformat') else p.last_session_date,
        created_at=p.created_at.isoformat() if p.created_at and hasattr(p.created_at, 'isoformat') else p.created_at,
    )


def _visible_patients_query(user: User, db: DBSession):
    """
    Return a query scoped to the patients the current user is allowed to see.
    - If super_admin, see all patients
    - If clinic_admin, see all patients in that clinic
    - If clinic_staff, see only patients they created
    - Otherwise see only their own patients
    """
    if getattr(user, "role", None) == "super_admin":
        return db.query(Patient).filter(Patient.patient_type != "self")

    if getattr(user, "role", None) in ("clinic_admin", "org_admin", "clinic_staff", "org_staff") and user.clinic_id:
        from app.models.org_request import OrgAssessmentRequest
        org_patient_ids = db.query(OrgAssessmentRequest.patient_id).filter(OrgAssessmentRequest.org_id == user.clinic_id)
        query = db.query(Patient).filter(
            (Patient.clinic_id == user.clinic_id) | (Patient.id.in_(org_patient_ids))
        )
    else:
        query = db.query(Patient).filter(Patient.user_id == user.id)
        
    return query.filter(Patient.patient_type != "self")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=PatientOut, status_code=201)
def create_patient(
    req: PatientCreate,
    current_user: User = Depends(require_any_permission("candidates", "patients")),
    db: DBSession = Depends(get_db),
):
    """Create a new patient record linked to the current user."""
    computed_age = req.age
    if req.date_of_birth:
        today = date.today()
        computed_age = (
            today.year - req.date_of_birth.year
            - ((today.month, today.day) < (req.date_of_birth.month, req.date_of_birth.day))
        )

    patient = Patient(
        user_id=current_user.id,
        clinic_id=current_user.clinic_id,  # auto-inherit clinic membership
        patient_type=req.patient_type,
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email,
        phone_number=req.phone_number,
        date_of_birth=req.date_of_birth,
        age=computed_age,
        gender=req.gender,
        gender_confidence=req.gender_confidence,
        consent_given=req.consent_given,
        background=req.background,
        environment=req.environment,
        living_condition=req.living_condition,
        family_structure=req.family_structure,
        residence_type=req.residence_type,
        environment_type=req.environment_type,
        education_level=req.education_level,
        occupation=req.occupation,
        socioeconomic_status=req.socioeconomic_status,
        notes=req.notes,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # ── Send confirmation email to patient (if email provided) ────────────────
    if patient.email and patient.patient_type != "anonymous":
        patient_name = f"{patient.first_name or ''} {patient.last_name or ''}".strip() or "Patient"
        added_by_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
        email_service.send_patient_added_email(
            patient_email=patient.email,
            patient_name=patient_name,
            clinic_name=current_user.clinic_name,
            added_by=added_by_name,
        )
    # ──────────────────────────────────────────────────────────────────────────

    return _patient_to_out(patient)


@router.get("", response_model=List[PatientOut])
def list_patients(
    current_user: User = Depends(require_patients_or_assessments),
    db: DBSession = Depends(get_db),
):
    """List all patients visible to the current user (own + clinic)."""
    patients = (
        _visible_patients_query(current_user, db)
        .order_by(Patient.created_at.desc())
        .all()
    )
    return [_patient_to_out(p) for p in patients]


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: str,
    current_user: User = Depends(require_patients_or_assessments),
    db: DBSession = Depends(get_db),
):
    """Get a single patient by ID (must be visible to current user)."""
    patient = (
        _visible_patients_query(current_user, db)
        .filter(Patient.id == patient_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _patient_to_out(patient)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: str,
    req: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Update a patient's details (only admins or individuals)."""
    if current_user.role in ("clinic_staff", "org_staff"):
        raise HTTPException(status_code=403, detail="Staff members can only read patient details")

    patient = (
        _visible_patients_query(current_user, db)
        .filter(Patient.id == patient_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
        
    if "date_of_birth" in update_data and patient.date_of_birth:
        today = date.today()
        patient.age = (
            today.year - patient.date_of_birth.year
            - ((today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day))
        )

    db.commit()
    db.refresh(patient)
    return _patient_to_out(patient)


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Delete a patient record. Only admins can delete."""
    if current_user.role in ("clinic_staff", "org_staff"):
        raise HTTPException(status_code=403, detail="Staff members cannot delete patients")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )
        
    has_permission = False
    if patient.user_id == current_user.id or current_user.role == "super_admin":
        has_permission = True
    elif current_user.role in ("clinic_admin", "org_admin") and patient.clinic_id == current_user.clinic_id and current_user.clinic_id is not None:
        has_permission = True
        
    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete this patient",
        )
        
    db.delete(patient)
    db.commit()
    return {"status": "deleted", "patient_id": patient_id}
