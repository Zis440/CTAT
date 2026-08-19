import os
import json
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import datetime as dt
from datetime import datetime
from pathlib import Path
from fastapi.responses import FileResponse

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission

# Employee Mental Health & Wellbeing Models and Adapters
from app.assessments.screening.level1 import models, schemas
from app.assessments.screening.level1.utils.question_bank import get_all_questions
from app.assessments.screening.level1.services.ollama_client import get_llm_insight
from app.assessments.screening.level1.services.scoring import generate_report_data
from app.assessments.screening.level1.services.screening_level1_adapter import ScreeningLevel1Adapter
from app.services.audit_service import audit_service

router = APIRouter(
    prefix="/api/assessments/screening/level1",
    tags=["Employee Mental Health & Wellbeing"]
)

# ---------------------------------------------------------
# Assessment Endpoints
# ---------------------------------------------------------

@router.get("/questions")
def get_questions(current_user = Depends(require_permission("assessments"))):
    return get_all_questions()

@router.get("/insight")
async def get_insight(
    context: str = Query("general", description="Current assessment phase hint"),
    current_user = Depends(require_permission("assessments"))
):
    """Return an LLM-generated or curated insight message for the current phase."""
    insight = await get_llm_insight(context)
    return insight

@router.post("/start", response_model=schemas.AssessmentResponse)
def start_assessment(
    core_patient_id: str = Query(None, description="Required in embedded mode to link to CoreThematics patient"),
    db: Session = Depends(get_db), 
    current_user = Depends(require_permission("assessments"))
):
    try:
        from app.wallet.router import _get_target_user_id, _get_wallet, get_assessment_price
        
        charge_user_id = _get_target_user_id(current_user, db)
        wallet = _get_wallet(charge_user_id, db, lock=True)
        
        required_balance = get_assessment_price(current_user, "Employee Mental Health & Wellbeing", db)
        
        if wallet.balance_paise < required_balance:
            raise HTTPException(status_code=402, detail=f"Insufficient wallet balance. Required ₹{required_balance/100:.2f}, available ₹{wallet.balance_paise/100:.2f}")
            
        # Deduction will happen in background_generate_and_save_report upon successful generation
            
        db_assessment = ScreeningLevel1Adapter.initialize_session(db, current_user, core_patient_id)
        
        audit_service.log_activity(
            db=db,
            user_id=current_user.id,
            target_user_id=None,
            org_id=getattr(current_user, "clinic_id", None),
            action="ASSESSMENT_START",
            details={"assessment_id": db_assessment.id, "patient_id": core_patient_id, "type": "screening_level1"}
        )
        
        return db_assessment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{assessment_id}/complete")
def complete_assessment(
    assessment_id: str, 
    data: schemas.AssessmentComplete, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    # In embedded mode, the session doesn't have user_id, it has core_user_id.
    assessment = db.query(models.ScreeningLevel1Session).filter(
        models.ScreeningLevel1Session.id == assessment_id,
        models.ScreeningLevel1Session.core_user_id == str(current_user.id)
    ).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if assessment.end_time is not None:
        return {"message": "Assessment already completed", "status": "duplicate_prevented"}

    # Billing is now handled in /start

    # Save questionnaire responses
    if data.questionnaire_responses:
        db.add_all([
            models.ScreeningQuestionnaireResponse(
                assessment_id=assessment_id,
                question_id=q.question_id,
                score=q.score
            ) for q in data.questionnaire_responses
        ])

    # Save game metrics
    if data.game_metrics:
        db.add_all([
            models.ScreeningGameMetric(
                assessment_id=assessment_id,
                game_type=g.game_type,
                score=g.score,
                movement_count=g.movement_count,
                completion_time_seconds=g.completion_time_seconds,
                advanced_metrics=g.advanced_metrics
            ) for g in data.game_metrics
        ])

    # Save patient context
    if data.patient_context:
        assessment.patient_context = data.patient_context.model_dump()

    # Save Story Assessments
    if data.story_assessments:
        db.add_all([
            models.ScreeningStoryAssessment(
                assessment_id=assessment_id,
                card_id=story.card_id,
                story_text=story.story_text,
                movement_count=story.movement_count,
                completion_time_seconds=story.completion_time_seconds
            ) for story in data.story_assessments
        ])

    assessment.end_time = datetime.utcnow()
    
    from app.models.patient import Patient
    pat = db.query(Patient).filter(Patient.id == assessment.core_patient_id).first()
    pat_name = f"{pat.first_name} {pat.last_name or ''}".strip() if pat else "Unknown"

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        target_user_id=None,
        org_id=getattr(current_user, "clinic_id", None),
        action="ASSESSMENT_COMPLETION",
        details={
            "assessment_id": assessment_id, 
            "assessment_name": "Employee Mental Health & Wellbeing",
            "patient_id": assessment.core_patient_id,
            "patient_name": pat_name,
            "performed_by": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
            "clinic_or_org_name": current_user.clinic_name or "Independent Psychologist"
        }
    )
    
    db.commit()
    
    # Synchronously generate the report to match Narrative Intelligence
    background_generate_and_save_report(assessment_id, data.request_validation)

    return {"message": "Assessment completed successfully"}

# ---------------------------------------------------------
# Report Verification Endpoints
# ---------------------------------------------------------

@router.get("/verification/pending")
def get_pending_verifications(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("assessments"))
):
    from app.models.user import User as UserModel
    from sqlalchemy import cast, String
    if current_user.role not in ("clinic_admin", "org_admin", "clinic_staff", "org_staff"):
        raise HTTPException(status_code=403, detail="Not authorized to view verification queue.")
    
    pending = (
        db.query(models.ScreeningReport, models.ScreeningLevel1Session, UserModel)
        .join(models.ScreeningLevel1Session, models.ScreeningReport.assessment_id == models.ScreeningLevel1Session.id)
        .outerjoin(UserModel, models.ScreeningLevel1Session.core_user_id == cast(UserModel.id, String))
        .filter(models.ScreeningReport.status == "Pending Verification")
    )
    if current_user.clinic_id:
        pending = pending.filter(UserModel.clinic_id == current_user.clinic_id)
        
    result = []
    for rep, sess, usr in pending.all():
        result.append({
            "assessment_id": rep.assessment_id,
            "patient_id": sess.core_patient_id,
            "requested_at": rep.generated_at,
            "status": rep.status,
            "user_name": f"{usr.first_name} {usr.last_name or ''}".strip() if usr else "Unknown"
        })
    return result

@router.post("/{assessment_id}/request-verification")
def request_verification(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("assessments"))
):
    report = db.query(models.ScreeningReport).filter(models.ScreeningReport.assessment_id == assessment_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.status not in ("AI Generated", "Draft"):
        raise HTTPException(status_code=400, detail=f"Cannot request verification for report with status {report.status}")

    # Deduct ₹100
    from app.models.wallet import Wallet, WalletTransaction, TransactionType
    from app.models.user import User as UserModel
    
    charge_user_id = current_user.id
    if getattr(current_user, "role", None) in ("clinic_staff", "org_staff") and current_user.clinic_id:
        admin_role = "org_admin" if current_user.role == "org_staff" else "clinic_admin"
        admin = db.query(UserModel).filter(UserModel.clinic_id == current_user.clinic_id, UserModel.role == admin_role).first()
        if admin:
            charge_user_id = admin.id

    wallet = db.query(Wallet).filter(Wallet.user_id == charge_user_id).first()
    if not wallet or wallet.balance_paise < 10000:
        raise HTTPException(status_code=402, detail="Insufficient wallet balance. Please recharge.")
        
    wallet.balance_paise -= 10000
    tx = WalletTransaction(
        wallet_id=wallet.id,
        type=TransactionType.debit,
        amount_paise=10000,
        balance_after_paise=wallet.balance_paise,
        description=f"Psychologist Verification Request - Screening - Assessment {assessment_id}",
        created_by_id=current_user.id,
    )
    db.add(tx)

    report.status = "Pending Verification"
    db.commit()
    
    session_info = db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()
    target_pid = session_info.core_patient_id if session_info else None

    from app.services.audit_service import audit_service
    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        target_user_id=target_pid,
        org_id=getattr(current_user, "clinic_id", None),
        action="VERIFICATION_REQUESTED",
        details={"assessment_id": assessment_id, "type": "screening_level1"}
    )
    
    return {"message": "Verification requested successfully", "status": report.status}

class VerifyReportRequest(BaseModel):
    executive_summary: Optional[str] = None
    ai_clinical_insight: Optional[str] = None
    verification_notes: str

@router.post("/{assessment_id}/verify")
def verify_report(
    assessment_id: str,
    data: VerifyReportRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("assessments"))
):
    if current_user.role not in ("clinic_admin", "org_admin", "clinic_staff", "org_staff"):
        raise HTTPException(status_code=403, detail="Not authorized to verify reports.")

    report = db.query(models.ScreeningReport).filter(models.ScreeningReport.assessment_id == assessment_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.status != "Pending Verification":
        raise HTTPException(status_code=400, detail="Report is not under verification")

    json_data = report.json_data
    if isinstance(json_data, str):
        json_data = json.loads(json_data)
        
    report_summary = json_data.get("report_summary", json_data)
    
    # Log changes
    history = report.changes_history or []
    changes = {
        "verified_by": current_user.id,
        "timestamp": datetime.utcnow().isoformat(),
        "notes": data.verification_notes,
        "edits": {}
    }
    
    if data.executive_summary is not None and data.executive_summary != report_summary.get("executive_summary"):
        changes["edits"]["executive_summary"] = {"old": report_summary.get("executive_summary"), "new": data.executive_summary}
        report_summary["executive_summary"] = data.executive_summary
        
    if data.ai_clinical_insight is not None and data.ai_clinical_insight != report_summary.get("ai_clinical_insight"):
        changes["edits"]["ai_clinical_insight"] = {"old": report_summary.get("ai_clinical_insight"), "new": data.ai_clinical_insight}
        report_summary["ai_clinical_insight"] = data.ai_clinical_insight
        
    history.append(changes)
    
    # Save back
    if "report_summary" in json_data:
        json_data["report_summary"] = report_summary
    else:
        json_data = report_summary
        
    report.json_data = json_data
    report.changes_history = history
    report.status = "Verified by Psychologist"
    report.verified_by_id = current_user.id
    report.verified_at = datetime.utcnow()
    report.verification_notes = data.verification_notes
    
    db.commit()
    
    session_info = db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()
    if session_info:
        try:
            create_pdf_for_assessment(session_info, db, json_data, current_user=current_user)
        except Exception as e:
            print(f"Error generating PDF during verification: {e}")
    target_pid = session_info.core_patient_id if session_info else None

    from app.services.audit_service import audit_service
    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        target_user_id=target_pid,
        org_id=getattr(current_user, "clinic_id", None),
        action="VERIFICATION_COMPLETED",
        details={"assessment_id": assessment_id, "type": "screening_level1", "status": "Verified by Psychologist"}
    )
    
    return {"message": "Report verified successfully", "status": report.status}

# ---------------------------------------------------------
# Report Endpoints
# ---------------------------------------------------------

@router.delete("/{assessment_id}")
def delete_screening_session(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("assessments"))
):
    """Delete a screening session and its report."""
    if not assessment_id.startswith("SCR_"):
        assessment_id = f"SCR_{assessment_id}"
        
    assessment = db.query(models.ScreeningLevel1Session).filter(
        models.ScreeningLevel1Session.id == assessment_id
    ).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    user_role = getattr(current_user, "role", None)
    
    # If not a super_admin or clinic/org admin, the user must be the session owner
    if user_role not in ("super_admin", "clinic_admin", "org_admin"):
        if assessment.core_user_id != str(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="Not authorized to delete this session. Only admins or the creator can delete it.",
            )
            
    db.delete(assessment)
    db.commit()
    return {"status": "deleted", "assessment_id": assessment_id}



def create_pdf_for_assessment(assessment, db, report_data: dict, current_user=None):
    from app.assessments.screening.level1.engines.report_generator import generate_report
    from app.models.user import User
    from app.models.patient import Patient
    import datetime as dt
    from app.database import DATA_STORE_DIR
    from app.utils.file_paths import build_report_path
    
    if not current_user:
        current_user = db.query(User).filter(User.id == assessment.core_user_id).first()
        
    role_str = str(getattr(current_user, 'role', 'Org Staff')).replace('UserRole.', '').replace('_', ' ').title() if current_user else 'Staff'
    
    user_info = {
        "name": f"{getattr(current_user, 'first_name', '')} {getattr(current_user, 'last_name', '')}".strip() or "Staff" if current_user else "Staff",
        "designation": getattr(current_user, 'specialization', '') or getattr(current_user, 'designation', '') or role_str if current_user else role_str,
        "phone": getattr(current_user, 'phone', '') if current_user else '',
        "address": getattr(current_user, 'address', '') if current_user else '',
        "clinic_name": getattr(current_user, 'clinic_name', '') if current_user else '',
        "rci_number": getattr(current_user, 'rci_number', '') if current_user else '',
        "roc_number": getattr(current_user, 'roc_number', '') if current_user else '',
    }

    clinic_info = None
    if current_user and hasattr(current_user, 'clinic_id') and current_user.clinic_id:
        from app.models.clinic import ClinicProfile
        clinic_admin = db.query(User).filter(
            User.clinic_id == current_user.clinic_id,
            User.role.in_(["clinic_admin", "org_admin"])
        ).first()
        
        if clinic_admin:
            clinic_logo_path = None
            clinic_profile = db.query(ClinicProfile).filter(ClinicProfile.clinic_id == current_user.clinic_id).first()
            if clinic_profile and clinic_profile.logo_path:
                clinic_logo_path = clinic_profile.logo_path
            elif clinic_admin.avatar_path:
                clinic_logo_path = clinic_admin.avatar_path
                
            clinic_info = {
                "clinic_name": getattr(clinic_admin, 'clinic_name', '') or getattr(current_user, 'clinic_name', ''),
                "address": getattr(clinic_admin, 'address', ''),
                "phone": getattr(clinic_admin, 'phone', ''),
                "email": getattr(clinic_admin, 'email', ''),
                "logo_path": clinic_logo_path
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
                
    patient_name = "Anonymous"
    patient = None
    if getattr(assessment, 'core_patient_id', None):
        patient = db.query(Patient).filter(Patient.id == assessment.core_patient_id).first()
        if patient:
            patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() or "Anonymous"
            
    completed_at = getattr(assessment, 'end_time', None) or getattr(assessment, 'start_time', None) or dt.datetime.now()
    
    # Convert UTC to IST (Asia/Kolkata)
    try:
        from zoneinfo import ZoneInfo
        ist_zone = ZoneInfo("Asia/Kolkata")
        if completed_at.tzinfo:
            completed_at = completed_at.astimezone(ist_zone)
        else:
            completed_at = completed_at.replace(tzinfo=dt.timezone.utc).astimezone(ist_zone)
    except Exception:
        pass # fallback to naive if zoneinfo fails for any reason
        
    # USE completed_at to correctly set the original assessment date
    assessment_date = completed_at.strftime('%d-%m-%Y')
    assessment_time = completed_at.strftime('%I:%M %p')
            
    pat_context = assessment.patient_context or {}
    patient_info = {
        "name": patient_name,
        "patient_id": assessment.core_patient_id or "Unknown",
        "age": patient.computed_age if patient and patient.computed_age else pat_context.get("age"),
        "gender": patient.gender if patient and patient.gender else pat_context.get("gender"),
        "completed_at": completed_at,
        "assessment_date": assessment_date,
        "assessment_time": assessment_time
    }

    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Screening_Level1_Report_{assessment.id}_{timestamp}.pdf"
    
    file_path, pdf_relative = build_report_path(
        user_id=str(current_user.id) if current_user else str(getattr(assessment, 'core_user_id', 'unknown')),
        assessment_slug="screening_level1",
        filename=filename
    )
    
    generate_report(
        report=report_data,
        patient_info=patient_info,
        output_path=file_path,
        user_info=user_info,
        clinic_info=clinic_info
    )
    
    assessment.pdf_filename = pdf_relative
    db.commit()
    return pdf_relative




def background_generate_and_save_report(assessment_id: str, request_validation: bool = False):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        assessment = db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()
        if not assessment:
            return
            
        # CoreThematics user fetch or fallback. Wait, in embedded mode, we might just pass empty strings if user_id is null.
        # But for reporting purposes, the patient context is more important.
        user_info = {
            "name": "CoreUser",
            "email": "",
            "age": 0,
            "role": "patient",
            "organization": ""
        }

        q_responses = db.query(models.ScreeningQuestionnaireResponse).filter(
            models.ScreeningQuestionnaireResponse.assessment_id == assessment_id
        ).all()
        g_metrics = db.query(models.ScreeningGameMetric).filter(
            models.ScreeningGameMetric.assessment_id == assessment_id
        ).all()
        story_assessments_db = db.query(models.ScreeningStoryAssessment).filter(
            models.ScreeningStoryAssessment.assessment_id == assessment_id
        ).all()

        story_assessments_data = [{"card_id": t.card_id, "story_text": t.story_text} for t in story_assessments_db if t.story_text]
        patient_context = assessment.patient_context if hasattr(assessment, 'patient_context') else None

        report_data = generate_report_data(user_info, q_responses, g_metrics, story_assessments_data, patient_context)

        # Build Comprehensive JSON payload matching Narrative Intelligence structure
        comprehensive_data = {
            "patient_info": {
                "patient_id": assessment.core_patient_id,
                "name": "Anonymous" # Can be updated to fetch actual patient if needed
            },
            "report_summary": report_data,
            "card_results": {
                "questionnaire_responses": [{"question_id": q.question_id, "score": q.score} for q in q_responses],
                "game_metrics": [{"game_type": g.game_type, "score": g.score, "movement_count": g.movement_count, "completion_time_seconds": g.completion_time_seconds} for g in g_metrics],
                "story_assessments": story_assessments_data
            },
            "_metadata": {
                "assessment_id": assessment_id,
                "patient_id": assessment.core_patient_id,
                "user_id": assessment.core_user_id,
                "timestamp": assessment.end_time.isoformat() if assessment.end_time else None,
                "test_type": "screening_level1"
            }
        }

        try:
            from app.utils.file_paths import build_session_path
            
            # Write session data to data_store/sessions/<user_id>/...
            session_data_path = None
            if assessment.core_user_id:
                session_file_path, session_data_path = build_session_path(
                    user_id=str(assessment.core_user_id),
                    assessment_slug="screening_level1",
                    session_id=str(assessment_id)
                )
                
                with open(session_file_path, "w", encoding="utf-8") as f:
                    import json
                    json.dump(comprehensive_data, f, indent=2, default=str)
                
                assessment.session_data_path = session_data_path
            
            db_report = db.query(models.ScreeningReport).filter(
                models.ScreeningReport.assessment_id == assessment_id
            ).first()
            if db_report:
                db_report.json_data = comprehensive_data
                db_report.status = "Pending Verification" if request_validation else "AI Generated"
            else:
                db_report = models.ScreeningReport(
                    assessment_id=assessment_id, 
                    json_data=comprehensive_data,
                    status="Pending Verification" if request_validation else "AI Generated"
                )
                db.add(db_report)
                try:
                    db.flush()
                except IntegrityError:
                    db.rollback()
                    print(f"Report already exists for {assessment_id}. Ignoring duplicate background generation.")
                    return
            
            # Generate the PDF in background
            try:
                create_pdf_for_assessment(assessment, db, comprehensive_data, current_user=None)
            except Exception as e:
                import traceback
                print(f"Error generating PDF in background: {e}")
                traceback.print_exc()
            
            from app.models.user import User
            from app.models.patient import Patient
            user = db.query(User).filter(User.id == assessment.core_user_id).first()
            pat = db.query(Patient).filter(Patient.id == assessment.core_patient_id).first()
            
            user_name = f"{user.first_name} {user.last_name or ''}".strip() if user else str(assessment.core_user_id)
            clinic_name = getattr(user, "clinic_name", None) or "Independent Psychologist" if user else "Independent Psychologist"
            pat_name = f"{pat.first_name} {pat.last_name or ''}".strip() if pat else str(assessment.core_patient_id)

            from app.services.audit_service import audit_service
            audit_service.log_activity(
                db=db,
                user_id=assessment.core_user_id,
                target_user_id=None,
                action="REPORT_GENERATION",
                details={
                    "assessment_id": assessment_id, 
                    "assessment_name": "Employee Mental Health & Wellbeing",
                    "patient_id": assessment.core_patient_id,
                    "patient_name": pat_name,
                    "performed_by": user_name,
                    "clinic_or_org_name": clinic_name
                }
            )
            
            # Perform Wallet Deduction ONLY upon successful generation
            if user:
                from app.wallet.router import _get_target_user_id, _get_wallet, _record_transaction, get_assessment_price
                from app.models.wallet import TransactionType
                from app.models.assessment import Assessment
                
                charge_user_id = _get_target_user_id(user, db)
                wallet = _get_wallet(charge_user_id, db, lock=True)
                
                assessment_name = "Employee Mental Health & Wellbeing"
                
                required_balance = get_assessment_price(user, assessment_name, db)
                validation_price = 10000 if request_validation else 0
                total_required = required_balance + validation_price
                
                if wallet.balance_paise >= total_required:
                    wallet.balance_paise -= required_balance
                    patient_name = pat_name or "Unknown Patient"
                    user_name = f"{user.first_name} {user.last_name or ''}".strip()
                    
                    _record_transaction(
                        wallet=wallet,
                        tx_type=TransactionType.debit,
                        amount_paise=required_balance,
                        description=f"{assessment_name} Fee - {patient_name} - {user_name}",
                        db=db,
                        created_by_id=user.id
                    )

                    if request_validation:
                        wallet.balance_paise -= validation_price
                        _record_transaction(
                            wallet=wallet,
                            tx_type=TransactionType.debit,
                            amount_paise=validation_price,
                            description=f"Psychologist Verification Request - {assessment_name} - {patient_name} - {user_name}",
                            db=db,
                            created_by_id=user.id
                        )

            db.commit()
        except IntegrityError:
            db.rollback()
    except Exception as e:
        print(f"Background report generation failed: {e}")
        try:
            # Try to save a failed status report so it doesn't hang
            db_report = db.query(models.ScreeningReport).filter(models.ScreeningReport.assessment_id == assessment_id).first()
            if not db_report:
                db_report = models.ScreeningReport(
                    assessment_id=assessment_id,
                    json_data={"error": str(e)},
                    status="Rejected"
                )
                db.add(db_report)
            else:
                db_report.status = "Rejected"
                db_report.json_data = {"error": str(e)}
            db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()

@router.get("/report/{assessment_id}")
def get_report(assessment_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user = Depends(require_permission("assessments"))):
    if not assessment_id.startswith("SCR_"):
        assessment_id = f"SCR_{assessment_id}"
        
    existing_report = db.query(models.ScreeningReport).filter(models.ScreeningReport.assessment_id == assessment_id).first()
    if existing_report:
        data = existing_report.json_data
        if isinstance(data, str):
            data = json.loads(data)
        summary = data.get("report_summary", data)
        summary["status"] = existing_report.status
        if existing_report.verified_by_id:
            from app.models.user import User as UserModel
            usr = db.query(UserModel).filter(UserModel.id == existing_report.verified_by_id).first()
            if usr:
                summary["verified_by_name"] = f"{usr.first_name} {usr.last_name or ''}".strip()
                
        # Inject patient_id into employee_information so the frontend can display it
        sess = db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()
        if sess and sess.core_patient_id:
            if "employee_information" not in summary:
                summary["employee_information"] = {}
            summary["employee_information"]["patient_id"] = sess.core_patient_id
                
        return summary

    assessment = db.query(models.ScreeningLevel1Session).filter(
        models.ScreeningLevel1Session.id == assessment_id
    ).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # PERMANENT FIX: Allow access if assessment is anonymous (no core_user_id) 
    # OR if it strictly matches the currently authenticated user
    if assessment.core_user_id is not None and assessment.core_user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="You do not have permission to view this report.")

    # If no report exists, since generation is now synchronous, return 404
    raise HTTPException(status_code=404, detail="Report generation failed or is missing")

@router.post("/report/{assessment_id}/save-pdf")
async def save_pdf(
    assessment_id: str, 
    file: UploadFile = File(...),
    core_patient_id: str = Query(None),
    current_user = Depends(require_permission("assessments")),
    db: Session = Depends(get_db)
):
    if not assessment_id.startswith("SCR_"):
        assessment_id = f"SCR_{assessment_id}"
        
    from app.utils.file_paths import build_report_path
    
    filename = f"screening_level1_report_{assessment_id}.pdf"
    file_path, pdf_relative = build_report_path(
        user_id=str(current_user.id),
        assessment_slug="screening_level1",
        filename=filename
    )
    
    with open(file_path, "wb") as buffer:
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="PDF exceeds the 10MB size limit.")
        buffer.write(contents)
    
    assessment = db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()
    if assessment:
        assessment.pdf_filename = pdf_relative
        
        # Also update JSON file
        from app.database import DATA_STORE_DIR
        import json
        if assessment.session_data_path:
            session_file = DATA_STORE_DIR / assessment.session_data_path
            if session_file.exists():
                with open(session_file, "r+", encoding="utf-8") as f:
                    data = json.load(f)
                    data["pdf_filename"] = filename
                    f.seek(0)
                    json.dump(data, f, indent=2, default=str)
                    f.truncate()
                    
        db.commit()
        
    return {"status": "success", "file_path": pdf_relative}

from app.assessments.screening.level1.engines.report_generator import generate_report

@router.post("/report/{assessment_id}/open-pdf")
def open_pdf(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("reports"))
):
    if not assessment_id.startswith("SCR_"):
        assessment_id = f"SCR_{assessment_id}"
        
    assessment = db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Session not found")
    
    from app.database import DATA_STORE_DIR
    
    # We should ONLY return the existing PDF. Do not regenerate on download.
    if assessment and getattr(assessment, "pdf_filename", None):
        existing_pdf_path = DATA_STORE_DIR / assessment.pdf_filename
        if existing_pdf_path.exists():
            # Audit log download
            patient_name = "Anonymous"
            if assessment.core_patient_id:
                from app.models.patient import Patient
                pat = db.query(Patient).filter(Patient.id == assessment.core_patient_id).first()
                if pat:
                    patient_name = f"{getattr(pat, 'first_name', '')} {getattr(pat, 'last_name', '')}".strip() or "Anonymous"
                    
            audit_service.log_activity(
                db=db,
                user_id=current_user.id,
                target_user_id=None,
                org_id=getattr(current_user, "clinic_id", None),
                action="REPORT_OPENED",
                details={
                    "assessment_id": assessment_id, 
                    "assessment_name": "Employee Mental Health & Wellbeing",
                    "patient_id": assessment.core_patient_id,
                    "patient_name": patient_name,
                    "performed_by": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
                    "clinic_or_org_name": current_user.clinic_name or "Independent Psychologist"
                }
            )
            return FileResponse(
                existing_pdf_path,
                media_type="application/pdf",
                filename=existing_pdf_path.name,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Expose-Headers": "Content-Disposition"
                }
            )
            
    # Fallback search if exact path from DB fails or is missing
    import glob
    search_pattern = str(DATA_STORE_DIR / "reports" / "*" / "screening_level1" / f"Screening_Level1_Report_{assessment.id}_*.pdf")
    matches = glob.glob(search_pattern)
    if matches:
        latest_file = sorted(matches)[-1]
        
        # Log opening from fallback
        patient_name = "Anonymous"
        if assessment.core_patient_id:
            from app.models.patient import Patient
            pat = db.query(Patient).filter(Patient.id == assessment.core_patient_id).first()
            if pat:
                patient_name = f"{getattr(pat, 'first_name', '')} {getattr(pat, 'last_name', '')}".strip() or "Anonymous"
        audit_service.log_activity(
            db=db,
            user_id=current_user.id,
            target_user_id=None,
            org_id=getattr(current_user, "clinic_id", None),
            action="REPORT_OPENED",
            details={
                "assessment_id": assessment_id, 
                "assessment_name": "Employee Mental Health & Wellbeing",
                "patient_id": assessment.core_patient_id,
                "patient_name": patient_name,
                "performed_by": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
                "clinic_or_org_name": current_user.clinic_name or "Independent Psychologist"
            }
        )
        return FileResponse(
            latest_file,
            media_type="application/pdf",
            filename=f"screening_level1_report_{assessment_id}.pdf",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
        
    # If no PDF exists, attempt to generate it on-the-fly from existing report data
    db_report = db.query(models.ScreeningReport).filter(
        models.ScreeningReport.assessment_id == assessment_id
    ).first()
    
    if db_report and db_report.json_data:
        try:
            pdf_relative = create_pdf_for_assessment(assessment, db, db_report.json_data, current_user=current_user)
            if pdf_relative:
                generated_pdf_path = DATA_STORE_DIR / pdf_relative
                if generated_pdf_path.exists():
                    return FileResponse(
                        generated_pdf_path,
                        media_type="application/pdf",
                        filename=generated_pdf_path.name,
                        headers={
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Expose-Headers": "Content-Disposition"
                        }
                    )
        except Exception as e:
            import traceback
            print(f"Error generating PDF on-the-fly: {e}")
            traceback.print_exc()
    
    raise HTTPException(status_code=404, detail="PDF report not found. It might still be generating in the background.")
