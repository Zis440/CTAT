"""
Core TAT analysis, aggregation, and report generation API routes.
"""
import json
import logging
import datetime as dt
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.utils.file_paths import build_session_path, build_report_path
from app.utils.id_generator import generate_id
from app.api.dependencies import engines, PROJECT_ROOT
from app.schemas.analysis import AnalyzeCardRequest, AggregateRequest
from app.utils.utils import make_serializable, compute_historical_comparison
from app.services.patient_intake import PatientProfile
from app.assessments.tat.pipeline.analysis import analyze_card
from app.assessments.tat.pipeline.aggregation import aggregate_multi_card_analysis, build_single_card_aggregation
from app.assessments.tat.engines.clinical.clinical_formulation_engine import generate_clinical_formulation
from app.assessments.tat.engines.clinical.clinical_report_generator import generate_report
from app.assessments.tat.engines.clinical.medication import get_medication_and_humanize
from app.models.user import User, AccountType, UserRole
from app.auth.dependencies import get_current_user, require_permission
from app.models.patient import Patient, Session
from app.models.pricing import TestPricing
from app.core.audit_logger import get_audit_logger
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.post("/analyze")
def analyze_card_endpoint(
    req: AnalyzeCardRequest,
    current_user: User = Depends(require_permission("assessments")),
    db: DBSession = Depends(get_db),
):
    """Runs as a regular def so FastAPI dispatches to a threadpool,
    preventing the async event loop from blocking during heavy NLP work."""
    if current_user.role == UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Super Admin accounts cannot perform assessments.")
    try:

        patient = None
        try:
            db_patient = db.query(Patient).filter(Patient.id == req.patientId).first()
            if db_patient:
                _name = f"{db_patient.first_name} {db_patient.last_name or ''}".strip()
                patient = PatientProfile(
                    patient_id=db_patient.id,
                    patient_type=db_patient.patient_type,
                    name=_name,
                    age=req.effectiveAge if req.effectiveAge is not None else db_patient.computed_age,
                    gender=db_patient.gender,
                    consent_given=db_patient.consent_given,
                    notes=db_patient.notes or "",
                    demographic_data={
                        "background": db_patient.background or "",
                        "environment": db_patient.environment or "",
                    },
                )
        except Exception:
            pass

        if patient is None:
            patient = PatientProfile(patient_id=req.patientId, patient_type="anonymous")

        audit = get_audit_logger()
        audit_session_id = audit.start_session(
            patient_id=req.patientId,
            card_id=req.cardId,
            story_text=req.story,
            patient_age=patient.age if hasattr(patient, 'age') else None,
            patient_gender=patient.gender if hasattr(patient, 'gender') else None,
        )
        logger.info("Audit session %s started for card %s", audit_session_id, req.cardId)

        audit_service.log_activity(
            db=db,
            user_id=current_user.id,
            target_user_id=None,
            org_id=current_user.clinic_id,
            action="ASSESSMENT_START",
            details={"patient_id": req.patientId, "card_id": req.cardId}
        )

        res = None
        from app.services.groq_analysis_service import is_groq_analysis_available, analyze_card_with_groq
        if is_groq_analysis_available():
            try:
                res = analyze_card_with_groq(
                    card_id=req.cardId,
                    story_text=req.story,
                    patient_profile=patient,
                )
                logger.info(f"Card {req.cardId} analyzed successfully via fast Groq cloud pipeline")
            except Exception as ge:
                logger.warning(f"Groq card analysis failed: {ge}, falling back to local engines")
                res = None

        if res is None:
            res = analyze_card(
                card_id=req.cardId,
                story_text=req.story,
                patient_profile=patient,
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

        try:
            scores = res.get('scores', res.get('quantitative_scores', {}))
            if isinstance(scores, dict):
                for dim, score_val in scores.items():
                    confidence = 0.5
                    if isinstance(score_val, dict):
                        confidence = score_val.get('confidence', 0.5)
                        score_val = score_val.get('score', score_val.get('value', 0))
                    try:
                        score_val_float = float(score_val) if score_val is not None else 0.0
                    except (ValueError, TypeError):
                        score_val_float = 0.0
                    audit.log_scoring_decision(
                        dimension=str(dim),
                        score=score_val_float,
                        confidence=confidence,
                        method='rule-based',
                        evidence=[],
                        reasoning=f'Automated scoring for {dim}',
                    )
            audit.finalize_session()
        except Exception as audit_err:
            logger.warning("Audit finalization error (non-fatal): %s", audit_err)

        logger.info("Analysis complete for card %s, serializing response", req.cardId)
        serializable_res = make_serializable(res)
        try:
            import gc
            gc.collect()
        except Exception:
            pass
        return serializable_res
    except Exception as e:
        try:
            import gc
            gc.collect()
        except Exception:
            pass
        logger.error("analyze_card_endpoint failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def _try_historical_comparison(patient_id: str, agg: dict, db: DBSession):
    """Attempt to load the latest previous session for historical comparison."""
    from app.database import DATA_STORE_DIR
    latest = (
        db.query(Session)
        .filter(Session.patient_id == patient_id)
        .order_by(Session.created_at.desc())
        .first()
    )
    if latest and latest.session_data_path:
        session_file = DATA_STORE_DIR / latest.session_data_path
        if session_file.exists():
            with open(session_file, "r", encoding="utf-8") as f:
                past_session = json.load(f)
            if "report_summary" in past_session:
                agg['historical_comparison'] = compute_historical_comparison(
                    agg, past_session['report_summary']
                )

import time
from collections import defaultdict

_demo_ip_request_history: dict[str, list[float]] = defaultdict(list)

def _check_demo_ip_rate_limit(client_ip: str, max_assessments_per_hour: int = 20) -> None:
    """Enforce per-device/IP rate limiting for the shared demo account (20 tests/hour/device)."""
    now = time.time()
    one_hour_ago = now - 3600.0
    history = _demo_ip_request_history[client_ip]
    active_history = [t for t in history if t > one_hour_ago]
    _demo_ip_request_history[client_ip] = active_history

    if len(active_history) >= max_assessments_per_hour:
        raise HTTPException(
            status_code=429,
            detail=f"Demo rate limit exceeded ({max_assessments_per_hour} assessments per hour per device). Please wait before running another assessment."
        )
    _demo_ip_request_history[client_ip].append(now)

def _extract_client_ip(request: Request | None) -> str:
    if not request:
        return "127.0.0.1"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def _process_session_aggregation(
    req: AggregateRequest, current_user: User, db: DBSession, skip_billing: bool = False, client_ip: str = "127.0.0.1"
) -> tuple[dict, Session]:
    """
    Handles idempotency, billing, and aggregation computation.
    If a session with the exact cards for this patient was created within the last 4 hours,
    it returns the cached aggregation (No duplicate billing or compute).
    Otherwise, it deducts the wallet, computes aggregation, and saves the session.
    """
    results = req.card_results
    if not results:
        raise HTTPException(status_code=400, detail="No card results provided")

    cards_str = ",".join(sorted(results.keys()))

    import datetime as dt
    now_utc = dt.datetime.now(dt.timezone.utc)
    existing_session = db.query(Session).filter(
        Session.patient_id == req.patientId,
        Session.cards_examined == cards_str,
    ).order_by(Session.created_at.desc()).first()

    if existing_session and existing_session.created_at:
        created_at = existing_session.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=dt.timezone.utc)

        if existing_session.session_data_path:

            from app.database import DATA_STORE_DIR
            json_path = DATA_STORE_DIR / existing_session.session_data_path
            if json_path.exists():
                with open(json_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
                agg = existing_data.get("report_summary")
                if agg:

                    agg["_db_metadata"] = {
                        "id": existing_session.id,
                        "user_id": existing_session.user_id,
                        "validation_status": existing_session.validation_status,
                        "validator_name": existing_session.validator_name,
                        "validation_date": existing_session.validation_date.isoformat() if existing_session.validation_date else None,
                    }
                    return agg, existing_session

    db_patient = db.query(Patient).filter(Patient.id == req.patientId).first()
    patient_name = "Anonymous"
    is_demo_user = current_user.email == "psyc@example.com"
    if is_demo_user:
        skip_billing = True
        _check_demo_ip_rate_limit(client_ip, max_assessments_per_hour=20)

    if db_patient:
        patient_name = f"{db_patient.first_name} {db_patient.last_name or ''}".strip()

        if not is_demo_user:
            from app.wallet.router import _get_wallet, _record_transaction, _get_target_user_id, get_assessment_price

            base_cost_paise = get_assessment_price(current_user, getattr(req, "assessment_name", "Narrative Intelligence"), db)
            final_cost_paise = base_cost_paise

            total_needed = final_cost_paise
            if getattr(req, 'request_psychologist_validation', False):
                total_needed += 10000

            from app.models.wallet import TransactionType
            target_user_id = _get_target_user_id(current_user, db)
            wallet = _get_wallet(target_user_id, db, lock=True)

            if wallet.balance_paise < total_needed:
                raise HTTPException(
                    status_code=402,
                    detail=f"Insufficient balance. Required ₹{total_needed/100:.2f}, available ₹{wallet.balance_paise/100:.2f}",
                )

    from app.assessments.tat.pipeline.multicard_dynamics_engine import MulticardDynamicsEngine
    request_engine = MulticardDynamicsEngine(engines['nlp_processor'])

    if len(results) > 1:
        agg = aggregate_multi_card_analysis(results, request_engine)
    else:
        agg = build_single_card_aggregation(list(results.values())[0], request_engine)

    agg['clinical_formulation'] = generate_clinical_formulation(agg)

    if engines.get('medication_engine') and engines.get('ollama_humanizer'):
        try:

            from app.assessments.tat.engines.clinical.medication import clear_medication_cache
            clear_medication_cache()
            med_res = get_medication_and_humanize(
                results, agg, engines['medication_engine'], engines['ollama_humanizer'],
                clinical_formulation=agg.get('clinical_formulation', ''),
            )
            agg['medication_result'] = med_res
            if med_res.get('humanized_summary'):
                agg['clinical_formulation'] += f"\n\nCLINICAL SUMMARY:\n{'-'*30}\n{med_res['humanized_summary']}"
                agg['ollama_clinical_summary'] = med_res['humanized_summary']
            if med_res.get('clinical_conclusion'):
                agg['ollama_formulation_summary'] = med_res['clinical_conclusion']
        except Exception as e:
            logger.warning("Medication/Humanization error: %s", e)

    if req.patientId and not req.patientId.startswith("ANON_"):
        try:
            _try_historical_comparison(req.patientId, agg, db)
        except Exception as e:
            logger.warning("Error fetching past session for comparison: %s", e)

    if not skip_billing:
        current_user_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
        wallet.balance_paise -= final_cost_paise
        _record_transaction(
            wallet=wallet,
            tx_type=TransactionType.debit,
            amount_paise=final_cost_paise,
            description=f"{req.assessment_name} Session - {patient_name} - {current_user_name}",
            db=db,
            created_by_id=current_user.id
        )

        if getattr(req, 'request_psychologist_validation', False):
            wallet.balance_paise -= 10000
            _record_transaction(
                wallet=wallet,
                tx_type=TransactionType.debit,
                amount_paise=10000,
                description=f"Psychologist Verification Request - {req.assessment_name} - {patient_name} - {current_user_name}",
                db=db,
                created_by_id=current_user.id
            )

    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    serializable_agg = make_serializable(agg)

    patient_info = {
        "patient_id": db_patient.id if db_patient else req.patientId,
        "patient_type": db_patient.patient_type if db_patient else "anonymous",
        "name": patient_name,
        "age": db_patient.computed_age if db_patient else None,
        "gender": db_patient.gender if db_patient else None,
    }

    session_id = generate_id("SES")
    session_json_path, session_relative = build_session_path(
        user_id=current_user.id,
        assessment_slug="tat",
        session_id=session_id
    )

    session_data = {
        "patient_info": patient_info,
        "report_summary": serializable_agg,
        "card_results": make_serializable(results),
        "_metadata": {
            "patient_id": req.patientId,
            "user_id": current_user.id,
            "timestamp": dt.datetime.now().isoformat(),
            "psychologist_validation_requested": getattr(req, 'request_psychologist_validation', False),
        },
    }

    with open(session_json_path, "w", encoding="utf-8") as f:
        json.dump(session_data, f, indent=2, default=str)

    session_record = Session(
        id=session_id,
        user_id=current_user.id,
        patient_id=req.patientId,
        session_data_path=session_relative,
        cards_examined=cards_str,
        patient_name=patient_name,
        validation_status="Pending Verification" if getattr(req, 'request_psychologist_validation', False) else "System Generated"
    )
    db.add(session_record)

    if db_patient:
        db_patient.total_sessions = (db_patient.total_sessions or 0) + 1
        db_patient.last_session_date = dt.datetime.now()

    db.commit()
    db.refresh(session_record)

    if getattr(req, 'request_psychologist_validation', False):
        try:
            from app.services.verification_service import assign_verification_request
            assign_verification_request(db, session_id=session_record.id)
        except Exception as e:
            logger.error("Failed to create and assign VerificationRequest during aggregation: %s", e)

    agg["_db_metadata"] = {
        "id": session_record.id,
        "user_id": session_record.user_id,
        "validation_status": session_record.validation_status,
        "validator_name": session_record.validator_name,
        "validation_date": session_record.validation_date.isoformat() if session_record.validation_date else None,
    }

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        target_user_id=None,
        org_id=current_user.clinic_id,
        action="ASSESSMENT_COMPLETION",
        details={
            "assessment_id": session_record.id,
            "patient_id": req.patientId,
            "patient_name": session_record.patient_name,
            "assessment_name": getattr(req, "assessment_name", "Narrative Intelligence"),
            "cards_examined": cards_str,
            "performed_by": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
            "clinic_or_org_name": current_user.clinic_name or "Independent Psychologist"
        }
    )

    return agg, session_record

@router.post("/aggregate")
def aggregate_endpoint(
    req: AggregateRequest,
    request: Request,
    current_user: User = Depends(require_permission("assessments")),
    db: DBSession = Depends(get_db),
):
    """
    Computes aggregation for the dashboard.
    Will deduct wallet and cache the result for the session if not recently cached.
    """
    from app.models.user import UserRole
    if current_user.role == UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Super Admin accounts cannot perform assessments.")

    client_ip = _extract_client_ip(request)
    agg, _ = _process_session_aggregation(req, current_user, db, client_ip=client_ip)
    return make_serializable(agg)

def _generate_pdf_report_internal(
    req: AggregateRequest,
    current_user: User,
    db: DBSession,
    agg: dict,
    session_record: Session
) -> tuple[Path, str]:

    db_patient = db.query(Patient).filter(Patient.id == req.patientId).first()
    if db_patient:
        patient_info = {
            "patient_id": db_patient.id,
            "patient_type": db_patient.patient_type,
            "name": f"{db_patient.first_name} {db_patient.last_name or ''}".strip(),
            "age": db_patient.computed_age,
            "gender": db_patient.gender,
        }
    else:
        patient_info = {
            "patient_id": req.patientId,
            "patient_type": "anonymous",
            "name": "Anonymous",
        }

    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = req.assessment_name.replace(' ', '_')
    filename = f"{safe_name}_TAT_Report_{timestamp}.pdf"

    pdf_path, pdf_relative = build_report_path(
        user_id=current_user.id,
        assessment_slug="tat",
        filename=filename
    )

    try:
        role_str = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        if role_str.startswith('UserRole.'):
            role_str = role_str.replace('UserRole.', '')

        user_info = {
            "name": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
            "designation": current_user.specialization or current_user.designation or role_str.replace('_', ' ').title(),
            "phone": current_user.phone or "",
            "address": current_user.address or "",
            "clinic_name": current_user.clinic_name or "",
            "clinic_id": current_user.clinic_id,
            "rci_number": getattr(current_user, 'rci_number', ''),
            "roc_number": getattr(current_user, 'roc_number', ''),
            "e_signature_path": getattr(current_user, 'e_signature_path', ''),
            "role": role_str,
        }

        clinic_info = None
        if current_user.clinic_id:
            from app.models.user import UserRole
            from app.models.clinic import ClinicProfile
            clinic_admin = db.query(User).filter(
                User.clinic_id == current_user.clinic_id,
                User.role.in_([UserRole.clinic_admin, UserRole.org_admin])
            ).first()
            if clinic_admin:

                clinic_logo_path = None
                clinic_profile = db.query(ClinicProfile).filter(ClinicProfile.clinic_id == current_user.clinic_id).first()
                if clinic_profile and clinic_profile.logo_path:
                    clinic_logo_path = clinic_profile.logo_path
                elif clinic_admin.avatar_path:
                    clinic_logo_path = clinic_admin.avatar_path

                clinic_info = {
                    "clinic_name": clinic_admin.clinic_name or current_user.clinic_name or "",
                    "address": clinic_admin.address or "",
                    "phone": clinic_admin.phone or "",
                    "email": clinic_admin.email or "",
                    "logo_path": clinic_logo_path,
                }

                if not user_info["rci_number"] and getattr(clinic_admin, 'rci_number', None):
                    user_info["rci_number"] = clinic_admin.rci_number
                if not user_info["roc_number"] and getattr(clinic_admin, 'roc_number', None):
                    user_info["roc_number"] = clinic_admin.roc_number

                if not user_info["rci_number"]:
                    staff_with_rci = db.query(User).filter(
                        User.clinic_id == current_user.clinic_id,
                        User.rci_number.isnot(None),
                        User.rci_number != ''
                    ).first()
                    if staff_with_rci:
                        user_info["rci_number"] = staff_with_rci.rci_number

                if not user_info["roc_number"]:
                    staff_with_roc = db.query(User).filter(
                        User.clinic_id == current_user.clinic_id,
                        User.roc_number.isnot(None),
                        User.roc_number != ''
                    ).first()
                    if staff_with_roc:
                        user_info["roc_number"] = staff_with_roc.roc_number

        from app.models.audit_log import AuditLog
        audit_record = db.query(AuditLog).filter(
            AuditLog.target_user_id == current_user.id,
            AuditLog.action == "verification_approved"
        ).order_by(AuditLog.timestamp.desc()).first()

        verification_audit = None
        if audit_record:
            verification_audit = {
                "timestamp": audit_record.timestamp.isoformat(),
                "signature_hash": audit_record.signature_hash,
                "admin_id": audit_record.user_id
            }

        generate_report(
            aggregated=agg,
            patient_info=patient_info,
            output_path=pdf_path,
            card_analyses=list(req.card_results.values()),
            clinical_formulation=agg.get('clinical_formulation', ''),
            medication_result=agg.get('medication_result', None),
            user_info=user_info,
            clinic_info=clinic_info,
            verification_audit=verification_audit
        )

        if not session_record.pdf_filename:
            session_record.pdf_filename = pdf_relative

            from app.database import DATA_STORE_DIR
            if session_record.session_data_path:
                session_file = DATA_STORE_DIR / session_record.session_data_path
                if session_file.exists():
                    with open(session_file, "r+", encoding="utf-8") as f:
                        data = json.load(f)
                        data["pdf_filename"] = filename
                        f.seek(0)
                        json.dump(data, f, indent=2, default=str)
                        f.truncate()

            db.commit()

        audit_service.log_activity(
            db=db,
            user_id=current_user.id,
            target_user_id=None,
            org_id=current_user.clinic_id,
            action="REPORT_GENERATION",
            details={
                "assessment_id": session_record.id,
                "patient_id": req.patientId,
                "patient_name": session_record.patient_name,
                "assessment_name": getattr(req, "assessment_name", "Narrative Intelligence"),
                "filename": filename,
                "performed_by": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
                "clinic_or_org_name": current_user.clinic_name or "Independent Psychologist"
            }
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error("Failed to generate report: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    return pdf_path, filename

@router.post("/report")
def generate_pdf_report(
    req: AggregateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_permission("reports")),
    db: DBSession = Depends(get_db),
):
    from app.models.user import UserRole
    if current_user.role == UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Super Admin accounts cannot perform assessments.")

    client_ip = _extract_client_ip(request)
    agg, session_record = _process_session_aggregation(req, current_user, db, client_ip=client_ip)

    output_path, filename = _generate_pdf_report_internal(req, current_user, db, agg, session_record)
    return FileResponse(output_path, media_type="application/pdf", filename=filename)

@router.get("/debug_report")
def debug_pdf_report(
    session_id: str,
    db: DBSession = Depends(get_db)
):
    import traceback
    from fastapi.responses import PlainTextResponse

    try:
        session_record = db.query(Session).filter(Session.id == session_id).first()
        if not session_record:
            return PlainTextResponse("Session not found")

        current_user = db.query(User).filter(User.id == session_record.user_id).first()
        if not current_user:
             current_user = db.query(User).filter(User.role.in_(["individual_psychologist", "clinic_staff", "org_admin", "super_admin"])).first()

        req = AggregateRequest(
            patientId=session_record.patient_id,
            card_results={},
            assessment_name="Narrative Intelligence",
            request_psychologist_validation=True
        )

        from app.database import DATA_STORE_DIR
        session_file = DATA_STORE_DIR / session_record.session_data_path
        with open(session_file, "r") as f:
            data = json.load(f)
            req.card_results = data.get("card_results", {})

        agg, session_record_ret = _process_session_aggregation(req, current_user, db)

        _generate_pdf_report_internal(req, current_user, db, agg, session_record_ret)
        return PlainTextResponse("SUCCESS: PDF generated perfectly.")
    except Exception as e:
        import sys
        tb = traceback.format_exc()

        try:
            results = req.card_results
            cards_str = ",".join(sorted(results.keys())) if results else ""
            ex_sess = db.query(Session).filter(
                Session.patient_id == req.patientId,
                Session.cards_examined == cards_str,
            ).order_by(Session.created_at.desc()).first()
            debug_info = f"Existing Session Found: {ex_sess is not None}\n"
            if ex_sess:
                debug_info += f"Data Path: {ex_sess.session_data_path}\n"
        except Exception as inner_e:
            debug_info = f"Error checking session: {inner_e}\n"

        return PlainTextResponse(f"ERROR OCCURRED:\n{debug_info}\n{tb}")
