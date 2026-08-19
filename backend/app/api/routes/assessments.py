from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List

from app.database import get_db
from app.auth.dependencies import require_super_admin
from app.models.assessment import Assessment
from app.schemas.assessment import AssessmentResponse, AssessmentUpdate

router = APIRouter(
    prefix="/api/assessments",
    tags=["Assessments"]
)

def _assessment_to_response(a: Assessment) -> AssessmentResponse:
    """Manually map ORM object to response schema (snake_case → camelCase)."""
    return AssessmentResponse(
        id=a.id,
        slug=getattr(a, 'slug', None),
        name=a.name,
        category=a.category,
        clinicPrice=float(a.clinic_price) if a.clinic_price is not None else None,
        psychologistPrice=float(a.psychologist_price) if a.psychologist_price is not None else None,
        orgPrice=float(a.org_price) if a.org_price is not None else None,
        isComingSoon=a.is_coming_soon or False,
    )

@router.get("", response_model=List[AssessmentResponse])
def get_assessments(db: Session = Depends(get_db)):
    """
    Fetch all assessments from the database.
    Any authenticated user can read (Individual Psychologists, Clinic Staff, etc.).
    """
    assessments = db.query(Assessment).order_by(Assessment.id).all()

    def sort_key(a: Assessment):
        if a.slug == 'tat':
            return (1, '')
        elif a.slug == 'screening_level1' or "Employee Mental" in a.name:
            return (2, '')
        return (3, a.id)

    assessments.sort(key=sort_key)
    return [_assessment_to_response(a) for a in assessments]

@router.put("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: str,
    assessment_in: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin),
):
    """
    Update the prices for a specific assessment. Super Admin only.
    """
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found"
        )

    if assessment_in.name is not None:
        assessment.name = assessment_in.name
    if assessment_in.category is not None:
        assessment.category = assessment_in.category
    if assessment_in.isComingSoon is not None:
        assessment.is_coming_soon = assessment_in.isComingSoon
    if assessment_in.clinicPrice is not None:
        assessment.clinic_price = assessment_in.clinicPrice
    if assessment_in.psychologistPrice is not None:
        assessment.psychologist_price = assessment_in.psychologistPrice
    if assessment_in.orgPrice is not None:
        assessment.org_price = assessment_in.orgPrice

    assessment.updated_at = func.now()

    db.commit()
    db.refresh(assessment)
    return _assessment_to_response(assessment)
