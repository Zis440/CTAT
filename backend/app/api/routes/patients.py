"""
Legacy patient intake API route — /api/patient/intake

This endpoint maintains backwards compatibility with the frontend's existing
patient intake flow.  Under the hood it now creates/reads Patient records in
SQLAlchemy instead of the old CSV file.
"""
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.schemas.analysis import PatientIntakeRequest
from app.models.user import User
from app.auth.dependencies import get_current_user, require_permission
from app.models.patient import Patient

router = APIRouter(prefix="/api/patient", tags=["patient"])

@router.post("/intake")
def patient_intake(
    req: PatientIntakeRequest,
    current_user: User = Depends(require_permission("assessments")),
    db: DBSession = Depends(get_db),
):
    if req.patient_type == "existing":
        if not req.patient_id:
            raise HTTPException(status_code=400, detail="Missing patient_id")
        patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return _patient_to_dict(patient)

    if req.patient_type == "anonymous":
        pid = f"ANON_{str(uuid.uuid4())[:8].upper()}"
        first_name = "Anonymous"
        last_name = None
    else:
        pid = f"PAT_{str(uuid.uuid4())[:8].upper()}"
        first_name = req.first_name or "Unknown"
        last_name = req.last_name

    computed_age = req.age
    if req.date_of_birth:
        today = date.today()
        computed_age = (
            today.year - req.date_of_birth.year
            - ((today.month, today.day) < (req.date_of_birth.month, req.date_of_birth.day))
        )

    patient = Patient(
        id=pid,
        user_id=current_user.id,
        clinic_id=current_user.clinic_id,
        patient_type=req.patient_type if req.patient_type == "anonymous" else "new",
        first_name=first_name,
        last_name=last_name,
        email=req.email,
        phone_number=req.phone_number,
        date_of_birth=req.date_of_birth,
        age=computed_age,
        gender=req.gender or "Not specified",
        background=req.background or "Not specified",
        environment=req.environment or "Not specified",
        notes=req.notes,
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)

    from app.services.audit_service import audit_service
    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        org_id=current_user.clinic_id,
        target_user_id=None,
        action="CANDIDATE_CREATED",
        details={"patient_id": patient.id, "patient_type": req.patient_type}
    )

    return _patient_to_dict(patient)

def _patient_to_dict(p: Patient) -> dict:
    """Convert a Patient ORM object to the dict format expected by the frontend."""
    return {
        "patient_id": p.id,
        "patient_type": p.patient_type,
        "first_name": p.first_name,
        "last_name": p.last_name,
        "email": p.email,
        "phone_number": p.phone_number,
        "date_of_birth": p.date_of_birth.isoformat() if p.date_of_birth and hasattr(p.date_of_birth, 'isoformat') else (p.date_of_birth if p.date_of_birth else None),
        "age": p.computed_age,
        "gender": p.gender,
        "consent_given": p.consent_given,
        "first_session_date": p.first_session_date.isoformat() if p.first_session_date else None,
        "total_sessions": p.total_sessions or 0,
        "last_session_date": p.last_session_date.isoformat() if p.last_session_date else None,
        "notes": p.notes or "",
        "demographic_data": {
            "background": p.background or "",
            "environment": p.environment or "",
        },
    }
