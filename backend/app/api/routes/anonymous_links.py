from datetime import datetime, timedelta
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from app.database import get_db
from app.models.anonymous_link import AnonymousLink
from app.models.assessment import Assessment
from app.models.patient import Patient, Session as AppSession
from app.auth.dependencies import get_current_user, require_permission
from app.models.user import User
from app.config import SystemConfig

router = APIRouter(prefix="/api/anonymous", tags=["anonymous_links"])
org_router = APIRouter(prefix="/api/org/anonymous-links", tags=["org_anonymous_links"])
clinic_router = APIRouter(prefix="/api/clinic/anonymous-links", tags=["clinic_anonymous_links"])

class CreateAnonymousLinkRequest(BaseModel):
    assessment_id: str
    expires_in_hours: int = 3
    patient_id: str | None = None
    selected_cards: list[str] | None = None
    request_validation: bool = False

class AnonymousLinkResponse(BaseModel):
    model_config = {"from_attributes": True}
    token: str
    assessment_id: str
    expires_at: datetime
    used: bool

@org_router.post("/", response_model=AnonymousLinkResponse)
def create_anonymous_link(
    req: CreateAnonymousLinkRequest,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Organization Staff/Admins can generate a one-time link for a candidate.
    Note: Org Admins view history only; this endpoint is for Org Staff.
    """

    pass

    assessment = db.query(Assessment).filter(Assessment.id == req.assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    from datetime import timezone
    expires_at = datetime.now(timezone.utc) + timedelta(hours=req.expires_in_hours)
    new_link = AnonymousLink(
        org_id=current_user.id,
        assessment_id=req.assessment_id,
        expires_at=expires_at,
        resulting_patient_id=req.patient_id,
        selected_cards=req.selected_cards,
        request_validation=req.request_validation
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    return new_link

@org_router.get("/")
def get_anonymous_links(
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Org Admins see all links created by anyone in their organization.
    Org Staff, Clinic Staff, and Individual Psychologists see only their own links.
    """
    if current_user.role not in ["org_admin", "org_staff", "clinic_staff", "individual_psychologist", "super_admin"]:
        raise HTTPException(status_code=403, detail="Your account type cannot view anonymous links history.")

    if current_user.role in ["org_staff", "clinic_staff"]:
        perms = current_user.module_permissions or {}
        if isinstance(perms, str):
            import json
            perms = json.loads(perms)
        if not perms.get("remote_assessment_link_management", False):
            raise HTTPException(status_code=403, detail="Access denied. Missing module permission: remote_assessment_link_management")

    if current_user.role == "org_admin":

        links = db.query(AnonymousLink, Assessment.name.label("assessment_name"), User)\
                  .outerjoin(Assessment, AnonymousLink.assessment_id == Assessment.id)\
                  .outerjoin(User, AnonymousLink.org_id == User.id)\
                  .filter(User.clinic_id == current_user.clinic_id)\
                  .order_by(AnonymousLink.created_at.desc())\
                  .all()

        return [
            {
                "token": link[0].token,
                "assessment_name": link[1] if link[1] else f"Assessment ID {link[0].assessment_id}",
                "created_at": link[0].created_at,
                "expires_at": link[0].expires_at,
                "used": link[0].used,
                "used_at": link[0].used_at,
                "resulting_patient_id": link[0].resulting_patient_id,
                "creator_name": f"{link[2].first_name} {link[2].last_name or ''}".strip() if link[2] else "Unknown",
                "creator_role": link[2].role.value if link[2] and hasattr(link[2].role, 'value') else str(link[2].role) if link[2] else "unknown",
            }
            for link in links
        ]
    else:

        links = db.query(AnonymousLink, Assessment.name.label("assessment_name"))\
                  .outerjoin(Assessment, AnonymousLink.assessment_id == Assessment.id)\
                  .filter(AnonymousLink.org_id == current_user.id)\
                  .order_by(AnonymousLink.created_at.desc())\
                  .all()

        return [
            {
                "token": link[0].token,
                "assessment_name": link[1] if link[1] else f"Assessment ID {link[0].assessment_id}",
                "created_at": link[0].created_at,
                "expires_at": link[0].expires_at,
                "used": link[0].used,
                "used_at": link[0].used_at,
                "resulting_patient_id": link[0].resulting_patient_id,
                "creator_name": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
                "creator_role": current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
            }
            for link in links
        ]

@org_router.delete("/{token}")
def revoke_anonymous_link(
    token: str,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(require_permission("remote_assessment_link_management"))
):
    """
    Revoke an active anonymous link.
    Org Admins can revoke any link in their org.
    Org Staff can only revoke their own links.
    """
    link = db.query(AnonymousLink).filter(AnonymousLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")

    if current_user.role != "org_admin" and link.org_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only revoke your own links.")

    from datetime import datetime, timezone
    link.expires_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "success", "message": "Link revoked successfully."}

@clinic_router.get("/")
def get_clinic_anonymous_links(
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clinic Admins see all links created by anyone in their clinic (by clinic_id).
    """
    if current_user.role != "clinic_admin":
        raise HTTPException(status_code=403, detail="Only clinic admins can view clinic anonymous links.")

    links = db.query(AnonymousLink, Assessment.name.label("assessment_name"), User)\
              .outerjoin(Assessment, AnonymousLink.assessment_id == Assessment.id)\
              .outerjoin(User, AnonymousLink.org_id == User.id)\
              .filter(User.clinic_id == current_user.clinic_id)\
              .order_by(AnonymousLink.created_at.desc())\
              .all()

    return [
        {
            "token": link[0].token,
            "assessment_name": link[1] if link[1] else f"Assessment ID {link[0].assessment_id}",
            "created_at": link[0].created_at,
            "expires_at": link[0].expires_at,
            "used": link[0].used,
            "used_at": link[0].used_at,
            "resulting_patient_id": link[0].resulting_patient_id,
            "creator_name": f"{link[2].first_name} {link[2].last_name or ''}".strip() if link[2] else "Unknown",
            "creator_role": link[2].role.value if link[2] and hasattr(link[2].role, 'value') else str(link[2].role) if link[2] else "unknown",
        }
        for link in links
    ]

@router.get("/validate/{token}")
def validate_anonymous_link(token: str, db: DbSession = Depends(get_db)):
    """
    Public endpoint to validate an anonymous link before starting an assessment.
    """
    link = db.query(AnonymousLink).filter(AnonymousLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")

    if link.used:
        raise HTTPException(status_code=400, detail="This link has already been used.")

    from datetime import timezone
    now_utc = datetime.now(timezone.utc)

    expires_at = link.expires_at
    if expires_at.tzinfo is None:

        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now_utc:
        raise HTTPException(status_code=400, detail="This link has expired.")

    assessment = db.query(Assessment).filter(Assessment.id == link.assessment_id).first()

    patient = None
    if link.resulting_patient_id:
        patient_record = db.query(Patient).filter(Patient.id == link.resulting_patient_id).first()
        if patient_record:
            patient = {
                "first_name": patient_record.first_name,
                "last_name": patient_record.last_name,
                "email": patient_record.email,
            }

    return {
        "valid": True,
        "assessment_name": assessment.name if assessment else "Unknown Assessment",
        "assessment_id": link.assessment_id,
        "org_id": link.org_id,
        "patient": patient,
        "selected_cards": link.selected_cards,
        "request_validation": link.request_validation,
        "consent_given": link.consent_given
    }

@router.post("/consent/{token}")
def record_anonymous_consent(token: str, request: Request, db: DbSession = Depends(get_db)):
    """
    Record user consent before starting an anonymous assessment.
    """
    link = db.query(AnonymousLink).filter(AnonymousLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")

    if link.used:
        raise HTTPException(status_code=400, detail="This link has already been used.")

    link.consent_given = True
    link.consent_timestamp = datetime.utcnow()
    link.consent_ip_address = request.client.host if request.client else None

    db.commit()
    return {"message": "Consent recorded successfully."}

@router.get("/{token}/screening-questions")
def get_anonymous_screening_questions(token: str, db: DbSession = Depends(get_db)):
    """
    Public endpoint to fetch questions for the EMHW assessment for an anonymous link.
    """
    link = db.query(AnonymousLink).filter(AnonymousLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")

    if link.used:
        raise HTTPException(status_code=400, detail="This link has already been used.")

    from datetime import timezone, datetime
    now_utc = datetime.now(timezone.utc)
    expires_at = link.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now_utc:
        raise HTTPException(status_code=400, detail="This link has expired.")

    from app.assessments.screening.level1.utils.question_bank import get_all_questions
    return get_all_questions()

class SubmitAnonymousAssessmentRequest(BaseModel):
    first_name: str
    last_name: str = ""
    email: str = ""
    responses: Dict[str, Any]

def process_anonymous_assessment_background(
    link_token: str,
    org_id: str,
    patient_id: str,
    patient_type: str,
    patient_name: str,
    assessment_id: str,
    assessment_name: str,
    request_validation: bool,
    responses_data: dict
):
    from app.database import SessionLocal
    from app.api.dependencies import engines
    from app.models.user import User
    from app.models.patient import Patient
    from app.services.patient_intake import PatientProfile
    import logging

    logger = logging.getLogger(__name__)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == org_id).first()
        if not user:
            logger.error("Anonymous submit: User not found for org_id %s", org_id)
            return

        db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
        patient_profile = PatientProfile(
            patient_id=patient_id,
            patient_type=patient_type,
            name=patient_name,
            age=db_patient.computed_age if db_patient else None,
            gender=db_patient.gender if db_patient else None,
            consent_given=True
        )

        is_emhw = "Screening" in assessment_name or "Wellbeing" in assessment_name or "Mental Health" in assessment_name

        if is_emhw:

            from app.wallet.router import _get_target_user_id, _get_wallet, _record_transaction, get_assessment_price
            from app.models.wallet import TransactionType

            charge_user_id = _get_target_user_id(user, db)
            wallet = _get_wallet(charge_user_id, db, lock=True)

            required_balance = get_assessment_price(user, assessment_name, db)

            if wallet.balance_paise < required_balance:
                logger.error("Anonymous submit: Insufficient wallet balance for org_id %s. Proceeding to save assessment anyway.", org_id)

            from app.assessments.screening.level1 import models as screening_models
            from app.assessments.screening.level1.services.screening_level1_adapter import ScreeningLevel1Adapter

            db_assessment = ScreeningLevel1Adapter.initialize_session(db, user, core_patient_id=patient_id)

            q_responses = responses_data.get("questionnaire_responses", [])
            if q_responses:
                db.add_all([
                    screening_models.ScreeningQuestionnaireResponse(
                        assessment_id=db_assessment.id,
                        question_id=q.get("question_id"),
                        score=q.get("score")
                    ) for q in q_responses
                ])

            g_metrics = responses_data.get("game_metrics", [])
            if g_metrics:
                db.add_all([
                    screening_models.ScreeningGameMetric(
                        assessment_id=db_assessment.id,
                        game_type=g.get("game_type"),
                        score=g.get("score"),
                        movement_count=g.get("movement_count"),
                        completion_time_seconds=g.get("completion_time_seconds")
                    ) for g in g_metrics
                ])

            p_context = responses_data.get("patient_context")
            if p_context:
                db_assessment.patient_context = p_context

            s_assessments = responses_data.get("story_assessments", [])
            if s_assessments:
                db.add_all([
                    screening_models.ScreeningStoryAssessment(
                        assessment_id=db_assessment.id,
                        card_id=story.get("card_id"),
                        story_text=story.get("story_text"),
                        movement_count=story.get("movement_count"),
                        completion_time_seconds=story.get("completion_time_seconds")
                    ) for story in s_assessments
                ])

            from datetime import datetime
            db_assessment.end_time = datetime.utcnow()
            db.commit()

            from app.services.audit_service import audit_service
            audit_service.log_activity(
                db=db,
                user_id=user.id,
                target_user_id=None,
                org_id=getattr(user, "clinic_id", None),
                action="ASSESSMENT_COMPLETION",
                details={
                    "assessment_id": db_assessment.id,
                    "assessment_name": assessment_name,
                    "patient_id": patient_id,
                    "patient_name": patient_name,
                    "performed_by": f"{user.first_name} {user.last_name or ''}".strip(),
                    "clinic_or_org_name": user.clinic_name or "Independent Psychologist"
                }
            )

            import threading
            from app.api.routes.screening_level1 import background_generate_and_save_report
            threading.Thread(target=background_generate_and_save_report, args=(db_assessment.id,)).start()

            logger.info("Anonymous EMHW assessment successfully processed for %s", patient_id)
            return {"type": "EMHW", "id": db_assessment.id}

        else:

            from app.assessments.tat.pipeline.analysis import analyze_card
            from app.schemas.analysis import AggregateRequest
            from app.api.routes.analysis import _process_session_aggregation, _generate_pdf_report_internal

            cards_data = responses_data.get("cards", [])
            card_results = {}
            for card in cards_data:
                card_id = card.get("card_id")
                story = card.get("story")
                if not card_id or not story: continue

                res = analyze_card(
                    card_id=card_id,
                    story_text=story,
                    patient_profile=patient_profile,
                    semantic_engine=engines['semantic_engine'],
                    murray_engine=engines['murray_engine'],
                    theme_engine=engines['theme_engine'],
                    relational_engine=engines['relational_engine'],
                    quantitative_scorer=engines['quantitative_scorer'],
                    scoring_engine=engines['scoring_engine'],
                    conflict_engine=engines['conflict_engine'],
                    environment_classifier=engines['environment_classifier'],
                    visual_engine=engines.get('visual_engine'),
                    defense_engine=engines.get('defense_engine'),
                )
                card_results[card_id] = res

            if not card_results:
                logger.error("Anonymous submit: No valid cards analyzed.")
                return

            req = AggregateRequest(
                patientId=patient_id,
                assessment_name=assessment_name,
                card_results=card_results,
                request_psychologist_validation=request_validation
            )

            agg, session_record = _process_session_aggregation(req, user, db, skip_billing=False)

            _generate_pdf_report_internal(req, user, db, agg, session_record)

            logger.info("Anonymous TAT assessment successfully processed for %s", patient_id)

            from app.models.anonymous_link import AnonymousLink
            link_record = db.query(AnonymousLink).filter(AnonymousLink.token == link_token).first()
            if link_record:
                link_record.resulting_session_id = session_record.id
                db.commit()

            return {"type": "TAT", "id": session_record.id}

    except Exception as e:
        logger.error("Failed to process anonymous assessment in background: %s", e, exc_info=True)
        return None
    finally:
        db.close()

@router.post("/submit/{token}")
def submit_anonymous_assessment(
    token: str,
    req: SubmitAnonymousAssessmentRequest,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db)
):
    """
    Public endpoint to submit the assessment via an anonymous link.
    """
    link = db.query(AnonymousLink).filter(AnonymousLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")

    if link.used:
        raise HTTPException(status_code=400, detail="This link has already been used.")

    if not link.consent_given:
        raise HTTPException(status_code=400, detail="Consent is required before submitting the assessment.")

    if link.resulting_patient_id:
        patient_id = link.resulting_patient_id
        patient_name = f"{req.first_name} {req.last_name}".strip()
    else:

        new_patient = Patient(
            user_id=link.org_id,
            patient_type="anonymous",
            first_name=req.first_name,
            last_name=req.last_name,
            email=req.email,
            consent_given=True
        )
        db.add(new_patient)
        db.flush()
        patient_id = new_patient.id
        patient_name = f"{req.first_name} {req.last_name}".strip()

    link.used = True
    link.used_at = datetime.utcnow()
    link.resulting_patient_id = patient_id

    assessment_record = db.query(Assessment).filter(Assessment.id == link.assessment_id).first()
    assessment_name = assessment_record.name if assessment_record else "Anonymous Assessment"

    background_tasks.add_task(
        process_anonymous_assessment_background,
        link_token=token,
        org_id=link.org_id,
        patient_id=patient_id,
        patient_type=new_patient.patient_type if 'new_patient' in locals() else "anonymous",
        patient_name=patient_name,
        assessment_id=link.assessment_id,
        assessment_name=assessment_name,
        request_validation=link.request_validation,
        responses_data=req.responses.copy()
    )

    db.commit()

    return {"message": "Assessment submitted successfully."}
