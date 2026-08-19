from datetime import timedelta
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.org_request import OrgAssessmentRequest, OrgRequestStatus

router = APIRouter(prefix="/api/org/requests", tags=["org_requests"])


class CreateRequestIn(BaseModel):
    patient_id: str
    assessment_id: str


class OrgRequestOut(BaseModel):
    id: str
    org_id: str
    patient_id: str
    assessment_id: str
    assigned_psychologist_id: Optional[str]
    status: str
    created_at: str
    sla_deadline: str

    class Config:
        from_attributes = True


@router.post("/", response_model=OrgRequestOut)
def create_assessment_request(
    data: CreateRequestIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role.value not in ("org_admin", "org_staff"):
        raise HTTPException(status_code=403, detail="Only organization accounts can request assessments.")

    # Prevent duplicate pending requests for the same candidate and assessment
    existing = db.query(OrgAssessmentRequest).filter(
        OrgAssessmentRequest.patient_id == data.patient_id,
        OrgAssessmentRequest.assessment_id == data.assessment_id,
        OrgAssessmentRequest.status.in_([OrgRequestStatus.pending, OrgRequestStatus.assigned])
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="An active request already exists for this candidate and assessment.")

    # Calculate SLA (24 hours from now)
    # Using python datetime since sqlalchemy server_default=func.now() happens on insert
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    deadline = now + timedelta(hours=24)

    req = OrgAssessmentRequest(
        org_id=current_user.clinic_id or current_user.id, # Organization ID
        patient_id=data.patient_id,
        assessment_id=data.assessment_id,
        status=OrgRequestStatus.pending,
        sla_deadline=deadline
    )
    
    db.add(req)
    db.commit()
    db.refresh(req)
    
    return {
        "id": req.id,
        "org_id": req.org_id,
        "patient_id": req.patient_id,
        "assessment_id": req.assessment_id,
        "assigned_psychologist_id": req.assigned_psychologist_id,
        "status": req.status.value,
        "created_at": req.created_at.isoformat(),
        "sla_deadline": req.sla_deadline.isoformat(),
    }


@router.get("/", response_model=List[OrgRequestOut])
def get_assessment_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role.value not in ("org_admin", "org_staff"):
        raise HTTPException(status_code=403, detail="Only organization accounts can view assessment requests.")

    org_id = current_user.clinic_id or current_user.id
    requests = db.query(OrgAssessmentRequest).filter(OrgAssessmentRequest.org_id == org_id).order_by(OrgAssessmentRequest.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "org_id": r.org_id,
            "patient_id": r.patient_id,
            "assessment_id": r.assessment_id,
            "assigned_psychologist_id": r.assigned_psychologist_id,
            "status": r.status.value,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "sla_deadline": r.sla_deadline.isoformat() if r.sla_deadline else "",
        }
        for r in requests
    ]
