import random
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.user import User, UserRole, VerificationStatus
from app.models.patient import Session as AssessmentSession
from app.models.verification_request import VerificationRequest, VerificationRequestStatus
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

SLA_HOURS_BY_ATTEMPT = {1: 15, 2: 6, 3: 3}
MAX_ASSIGNMENT_ATTEMPTS = 3

def calculate_psychologist_score(psychologist: User) -> float:
    """Calculate a composite score based on rating and experience."""
    rating = psychologist.rating or 3.0
    experience = psychologist.experience_years or 1

    score = (rating * 10) + min(experience, 20)

    jitter = random.uniform(0.85, 1.15)
    return score * jitter

def _get_eligible_validators(db: Session, exclude_id: str = None) -> list[User]:
    """
    Return only users eligible to validate reports:
      - Role: individual_psychologist
      - Professional Domain: Clinical Psychologist
      - RCI number present (RCI Verified)
      - Verification Status: approved (Psyichub Verified)
      - Account is active
    """
    candidates = db.query(User).filter(
        User.role == UserRole.individual_psychologist,
        User.professional_domain.ilike("%clinical%"),
        User.rci_number.isnot(None),
        User.rci_number != "",
        User.verification_status == VerificationStatus.approved,
        User.is_active == True
    ).all()

    if exclude_id:
        candidates = [c for c in candidates if c.id != exclude_id]

    return candidates

def assign_verification_request(db: Session, request_id: str = None, session_id: str = None) -> VerificationRequest:
    """
    Assigns or re-assigns a VerificationRequest to the best available
    Psyichub Verified Clinical Psychologist.
    """
    if not request_id and not session_id:
        raise ValueError("Must provide either request_id or session_id")

    v_req = None
    if request_id:
        v_req = db.query(VerificationRequest).filter(VerificationRequest.id == request_id).first()
    else:

        v_req = db.query(VerificationRequest).filter(
            VerificationRequest.session_id == session_id,
            VerificationRequest.status.in_([
                VerificationRequestStatus.PENDING,
                VerificationRequestStatus.ASSIGNED,
                VerificationRequestStatus.EXPIRED
            ])
        ).first()

    if not v_req:
        v_req = VerificationRequest(
            session_id=session_id,
            status=VerificationRequestStatus.PENDING
        )
        db.add(v_req)
        db.commit()
        db.refresh(v_req)

    if v_req.status in [
        VerificationRequestStatus.VERIFIED,
        VerificationRequestStatus.REJECTED,
        VerificationRequestStatus.ESCALATED,
    ]:
        return v_req

    if v_req.assignment_attempts >= MAX_ASSIGNMENT_ATTEMPTS:
        v_req.status = VerificationRequestStatus.ESCALATED
        db.commit()
        db.refresh(v_req)
        logger.warning(f"VerificationRequest {v_req.id} ESCALATED after {MAX_ASSIGNMENT_ATTEMPTS} failed attempts.")

        try:
            email_service.send_escalation_notification(v_req.id, v_req.session_id)
        except Exception as e:
            logger.error(f"Failed to send escalation notification: {e}")
        return v_req

    candidates = _get_eligible_validators(db, exclude_id=v_req.assigned_psychologist_id)

    if not candidates:
        candidates = _get_eligible_validators(db)

    if not candidates:
        logger.error("No eligible Psyichub Verified Clinical Psychologists found for assignment.")
        return v_req

    candidates.sort(key=calculate_psychologist_score, reverse=True)
    selected_psychologist = candidates[0]

    v_req.assigned_psychologist_id = selected_psychologist.id
    v_req.status = VerificationRequestStatus.ASSIGNED
    v_req.assigned_at = datetime.now(timezone.utc)
    v_req.assignment_attempts += 1

    if v_req.session_id.startswith("SCR_"):
        from app.assessments.screening.level1.models import ScreeningLevel1Session, ScreeningReport
        scr_report = db.query(ScreeningReport).filter(ScreeningReport.assessment_id == v_req.session_id).first()
        if scr_report:
            scr_report.verified_by_id = selected_psychologist.id
            scr_report.status = "Assigned"

        assess_session = db.query(ScreeningLevel1Session).filter(ScreeningLevel1Session.id == v_req.session_id).first()
        if assess_session:
            from app.models.patient import Patient
            pat = db.query(Patient).filter(Patient.id == assess_session.core_patient_id).first()
            patient_name = f"{pat.first_name} {pat.last_name or ''}".strip() if pat else "Screening Candidate"
        else:
            patient_name = "Screening Candidate"
    else:
        assess_session = db.query(AssessmentSession).filter(AssessmentSession.id == v_req.session_id).first()
        if assess_session:
            assess_session.assigned_psychologist_id = selected_psychologist.id
        patient_name = assess_session.patient_name if assess_session else "Patient"

    db.commit()
    db.refresh(v_req)

    psychologist_name = f"{selected_psychologist.first_name} {selected_psychologist.last_name or ''}".strip()
    sla_hours = SLA_HOURS_BY_ATTEMPT.get(v_req.assignment_attempts, 3)
    try:
        email_service.send_verification_assignment_email(
            psychologist_email=selected_psychologist.email,
            psychologist_name=psychologist_name,
            assessment_name="Psychological Assessment Report",
            patient_name=patient_name,
        )
    except Exception as e:
        logger.error(f"Failed to send verification assignment email: {e}")

    logger.info(
        f"Assigned VerificationRequest {v_req.id} to {psychologist_name} "
        f"(attempt #{v_req.assignment_attempts}, SLA={sla_hours}h)"
    )
    return v_req

def process_expired_requests(db: Session):
    """
    Checks for VerificationRequests that have been ASSIGNED and exceeded their SLA.
    SLA tiers:
      Attempt 1: 15 hours
      Attempt 2: 6 hours
      Attempt 3: 3 hours
    After attempt 3 expires → ESCALATED.
    """
    now = datetime.now(timezone.utc)

    assigned_requests = db.query(VerificationRequest).filter(
        VerificationRequest.status == VerificationRequestStatus.ASSIGNED
    ).all()

    count = 0
    for req in assigned_requests:
        if not req.assigned_at:
            continue

        sla_hours = SLA_HOURS_BY_ATTEMPT.get(req.assignment_attempts, 3)

        cutoff_time = req.assigned_at + timedelta(hours=sla_hours)

        if now > cutoff_time:
            logger.info(f"VerificationRequest {req.id} expired ({sla_hours}h limit, attempt #{req.assignment_attempts}). Reassigning...")
            req.status = VerificationRequestStatus.EXPIRED
            db.commit()

            assign_verification_request(db, request_id=req.id)
            count += 1

    return count

def process_pending_requests(db: Session) -> int:
    """Assign any VerificationRequests that are in PENDING status."""
    pending_requests = db.query(VerificationRequest).filter(
        VerificationRequest.status == VerificationRequestStatus.PENDING
    ).all()
    count = 0
    for req in pending_requests:
        try:
            assign_verification_request(db, request_id=req.id)
            count += 1
        except Exception as e:
            logger.error(f"Failed to auto-assign pending request {req.id}: {e}")
    return count
