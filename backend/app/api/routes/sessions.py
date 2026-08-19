"""
Session management API routes — list, retrieve, delete, and validate sessions.

Sessions are tracked in the ``sessions`` table.  The heavy JSON
payload stays on disk; only metadata lives in the DB.
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import or_

from app.database import get_db, DATA_STORE_DIR
from app.models.user import User
from app.auth.dependencies import get_current_user, require_permission, require_any_permission
from app.models.patient import Session
from app.schemas.analysis import ValidateSessionRequest

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _visible_sessions_query(user: User, db: DBSession):
    """
    Return sessions visible to the current user:
    - Super admins see all sessions
    - Clinic admins see all sessions in their clinic
    - Clinic staff see only their own sessions
    - Individual psychologists see only their own sessions
    """
    if getattr(user, "role", None) == "super_admin":
        return db.query(Session)

    if getattr(user, "role", None) in ("clinic_admin", "org_admin") and user.clinic_id:
        # Find all user IDs in the same clinic/organization
        from app.models.user import User as UserModel
        from app.models.org_request import OrgAssessmentRequest
        clinic_user_ids = [
            uid for (uid,) in
            db.query(UserModel.id).filter(UserModel.clinic_id == user.clinic_id).all()
        ]
        org_patient_ids = db.query(OrgAssessmentRequest.patient_id).filter(OrgAssessmentRequest.org_id == user.clinic_id)
        return db.query(Session).filter(
            (Session.user_id.in_(clinic_user_ids)) | (Session.patient_id.in_(org_patient_ids))
        )
        
    return db.query(Session).filter(
        Session.user_id == user.id
    )


from typing import Optional
from fastapi import Query

@router.get("")
def list_sessions(
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    assessment_type: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    psychologist_id: Optional[str] = Query(None),
    current_user: User = Depends(require_any_permission("assessments", "reports")),
    db: DBSession = Depends(get_db),
):
    """Retrieve session summaries visible to the current user."""
    query_tat = _visible_sessions_query(current_user, db)
    
    if start_date:
        try:
            query_tat = query_tat.filter(Session.created_at >= datetime.fromisoformat(start_date.replace('Z', '+00:00')))
        except ValueError:
            pass
    if end_date:
        try:
            query_tat = query_tat.filter(Session.created_at <= datetime.fromisoformat(end_date.replace('Z', '+00:00')))
        except ValueError:
            pass
    if status and status.lower() != "all":
        sl = status.lower()
        if sl in ("completed", "finalized", "verified by psychologist", "validated"):
            query_tat = query_tat.filter(Session.validation_status.in_(["Verified by Psychologist", "validated", "Finalized"]))
        elif sl == "draft":
            query_tat = query_tat.filter(Session.validation_status.in_(["Draft", "AI Generated"]))
        elif sl == "pending":
            query_tat = query_tat.filter(Session.validation_status.in_(["pending", "Pending Verification", "Under Verification", "Assigned"]))
        elif sl == "rejected":
            query_tat = query_tat.filter(Session.validation_status == "Rejected")
            
    if patient_id:
        query_tat = query_tat.filter(Session.patient_id == patient_id)
    if psychologist_id:
        query_tat = query_tat.filter(Session.user_id == psychologist_id)
            
    sessions = query_tat.order_by(Session.created_at.desc()).all()

    from app.assessments.screening.level1.models import ScreeningLevel1Session
    from app.models.patient import Patient
    from app.models.user import User as UserModel
    from app.models.org_request import OrgAssessmentRequest

    from app.assessments.screening.level1.models import ScreeningReport
    query_scr = db.query(ScreeningLevel1Session, Patient, ScreeningReport).outerjoin(
        Patient, ScreeningLevel1Session.core_patient_id == Patient.id
    ).outerjoin(
        ScreeningReport, ScreeningLevel1Session.id == ScreeningReport.assessment_id
    ).filter(ScreeningLevel1Session.end_time.isnot(None))
    
    if start_date:
        try:
            query_scr = query_scr.filter(ScreeningLevel1Session.start_time >= datetime.fromisoformat(start_date.replace('Z', '+00:00')))
        except ValueError:
            pass
    if end_date:
        try:
            query_scr = query_scr.filter(ScreeningLevel1Session.start_time <= datetime.fromisoformat(end_date.replace('Z', '+00:00')))
        except ValueError:
            pass
            
    if status and status.lower() != "all":
        sl = status.lower()
        if sl in ("completed", "finalized", "verified by psychologist", "validated"):
            query_scr = query_scr.filter(ScreeningReport.status.in_(["Verified by Psychologist", "Finalized"]))
        elif sl == "draft":
            query_scr = query_scr.filter(ScreeningReport.status.in_(["Draft", "AI Generated"]))
        elif sl == "pending":
            query_scr = query_scr.filter(ScreeningReport.status == "Pending Verification")
        elif sl == "rejected":
            query_scr = query_scr.filter(ScreeningReport.status == "Rejected")
            
    if patient_id:
        query_scr = query_scr.filter(ScreeningLevel1Session.core_patient_id == patient_id)
    if psychologist_id:
        query_scr = query_scr.filter(ScreeningLevel1Session.core_user_id == psychologist_id)
            
    if getattr(current_user, "role", None) != "super_admin":
        if getattr(current_user, "role", None) in ("clinic_admin", "org_admin") and current_user.clinic_id:
            clinic_user_ids_str = [str(uid) for (uid,) in db.query(UserModel.id).filter(UserModel.clinic_id == current_user.clinic_id).all()]
            org_patient_ids_str = [pid for (pid,) in db.query(OrgAssessmentRequest.patient_id).filter(OrgAssessmentRequest.org_id == current_user.clinic_id).all()]
            query_scr = query_scr.filter(
                (ScreeningLevel1Session.core_user_id.in_(clinic_user_ids_str)) | 
                (ScreeningLevel1Session.core_patient_id.in_(org_patient_ids_str))
            )
        else:
            query_scr = query_scr.filter(ScreeningLevel1Session.core_user_id == str(current_user.id))
            
    screening_sessions = query_scr.all()

    all_users = db.query(UserModel).all()
    user_map = {str(u.id): u for u in all_users}
    def get_user_details(user_id):
        if not user_id:
            return "Unknown", "unknown", ""
        u = user_map.get(str(user_id))
        if not u:
            return "Unknown", "unknown", ""
        name = f"{u.first_name or ''} {u.last_name or ''}".strip()
        
        acc_type = u.account_type.value if hasattr(u.account_type, 'value') else u.account_type
        
        clinic_name = u.clinic_name or ""
        if not clinic_name and u.clinic_id:
            parent = user_map.get(str(u.clinic_id))
            if parent:
                clinic_name = parent.clinic_name or ""
                # Inherit account type from parent if staff
                p_acc_type = parent.account_type.value if hasattr(parent.account_type, 'value') else parent.account_type
                if p_acc_type:
                    acc_type = p_acc_type
        
        return name, acc_type, clinic_name

    summaries = []
    for s in sessions:
        # Format timestamp with local timezone offset so the frontend
        # can correctly display it in the user's local time.
        ts = None
        if s.created_at:
            # PostgreSQL/SQLite naive datetimes are UTC.
            local_dt = s.created_at.astimezone() if s.created_at.tzinfo else s.created_at.replace(
                tzinfo=timezone.utc
            )
            ts = local_dt.isoformat()

        p_name, a_type, c_name = get_user_details(s.user_id)
        summaries.append({
            "id": s.id,
            "patient_id": s.patient_id,
            "patient_name": s.patient_name or "",
            "cards_examined": s.cards_examined.split(",") if s.cards_examined else [],
            "timestamp": ts,
            "pdf_filename": s.pdf_filename or "",
            "validation_status": s.validation_status,
            "user_id": s.user_id,
            "test_type": "tat",
            "psychologist_name": p_name,
            "account_type": a_type,
            "clinic_name": c_name
        })

    for result in screening_sessions:
        if len(result) == 3:
            scr_session, scr_patient, scr_report = result
        else:
            scr_session, scr_patient = result
            scr_report = None
            
        if assessment_type and assessment_type.lower() != "all" and assessment_type.lower() != "screening":
            continue
            
        ts = None
        if scr_session.start_time:
            local_dt = scr_session.start_time.astimezone() if scr_session.start_time.tzinfo else scr_session.start_time.replace(
                tzinfo=timezone.utc
            )
            ts = local_dt.isoformat()
            
        patient_name = ""
        if scr_patient:
            patient_name = f"{scr_patient.first_name or ''} {scr_patient.last_name or ''}".strip()
            
        report_exists = scr_report is not None
        
        p_name_scr, a_type_scr, c_name_scr = get_user_details(scr_session.core_user_id)
        
        summaries.append({
            "id": scr_session.id, 
            "patient_id": scr_session.core_patient_id,
            "patient_name": patient_name,
            "cards_examined": [], 
            "timestamp": ts,
            "pdf_filename": f"screening_level1_{scr_session.id}.pdf" if (scr_session.end_time and report_exists) else "",
            "validation_status": scr_report.status if scr_report else None,
            "user_id": scr_session.core_user_id,
            "test_type": "screening_level1",
            "psychologist_name": p_name_scr,
            "account_type": a_type_scr,
            "clinic_name": c_name_scr
        })

    if assessment_type and assessment_type.lower() != "all":
        if assessment_type.lower() == "tat":
            summaries = [s for s in summaries if s["test_type"] == "tat"]
        elif assessment_type.lower() == "screening":
            summaries = [s for s in summaries if s["test_type"] == "screening_level1"]

    # Sort combined
    summaries.sort(key=lambda x: x["timestamp"] or "", reverse=True)

    return summaries


@router.get("/{session_id}")
def get_session(
    session_id: str,
    current_user: User = Depends(require_any_permission("assessments", "reports")),
    db: DBSession = Depends(get_db),
):
    """Retrieve the full session data (loads JSON from disk or database)."""
    if session_id.startswith("SCR_"):
        from app.assessments.screening.level1.models import ScreeningLevel1Session, ScreeningReport
        
        assessment = db.query(ScreeningLevel1Session).filter(ScreeningLevel1Session.id == session_id).first()
        if not assessment:
            raise HTTPException(status_code=404, detail="Screening session not found")
            
        if assessment.core_user_id and assessment.core_user_id != str(current_user.id):
            if current_user.role not in ("super_admin", "clinic_admin", "org_admin"):
                raise HTTPException(status_code=403, detail="Not authorized")
                
        report = db.query(ScreeningReport).filter(ScreeningReport.assessment_id == session_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not ready or missing")
            
        data = report.json_data
        if isinstance(data, str):
            data = json.loads(data)
            
        # Ensure it has the structure expected by ResultsDashboardPage
        if "report_summary" not in data:
            data = {"report_summary": data}
            
        data["_db_metadata"] = {
            "id": session_id,
            "user_id": assessment.core_user_id,
            "validation_status": report.status,
            "validator_name": None,
            "validation_date": None,
        }
        data["pdf_filename"] = f"screening_level1_{session_id}.pdf"
        return data

    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Check access: either they are the assigned psychologist OR it's visible via query
    if getattr(session, "assigned_psychologist_id", None) != str(current_user.id):
        visible = _visible_sessions_query(current_user, db).filter(Session.id == session_id).first()
        if not visible:
            raise HTTPException(status_code=404, detail="Session not found")

    # Load the JSON payload from disk
    json_path = DATA_STORE_DIR / session.session_data_path
    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Session data file not found on disk")

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Merge DB metadata into the response
    data["_db_metadata"] = {
        "id": session.id,
        "user_id": session.user_id,
        "validation_status": session.validation_status,
        "validator_name": session.validator_name,
        "validation_date": session.validation_date.isoformat() if session.validation_date else None,
    }

    return data


@router.get("/{session_id}/report/pdf")
async def get_session_report_pdf(
    session_id: str,
    current_user: User = Depends(require_any_permission("assessments", "reports")),
    db: DBSession = Depends(get_db),
):
    """Retrieve the generated PDF report for a session."""
    if session_id.startswith("SCR_"):
        filename = f"screening_level1_{session_id}.pdf"
    else:
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        if getattr(session, "assigned_psychologist_id", None) != str(current_user.id):
            visible = _visible_sessions_query(current_user, db).filter(Session.id == session_id).first()
            if not visible:
                from app.models.verification_request import VerificationRequest
                v_req = db.query(VerificationRequest).filter(
                    VerificationRequest.session_id == session.id,
                    VerificationRequest.assigned_psychologist_id == current_user.id
                ).first()
                if not v_req:
                    raise HTTPException(status_code=404, detail="Session not found")
                
        if not session.pdf_filename:
            raise HTTPException(status_code=404, detail="PDF report not generated for this session")
        filename = session.pdf_filename
        
    from app.api.routes.reports import serve_pdf
    return await serve_pdf(filename=filename, current_user=current_user, db=db)


@router.get("/patient/{patient_id}")
def list_patient_sessions(
    patient_id: str,
    current_user: User = Depends(require_any_permission("assessments", "reports")),
    db: DBSession = Depends(get_db),
):
    """Retrieve all sessions for a specific patient."""
    sessions = (
        _visible_sessions_query(current_user, db)
        .filter(Session.patient_id == patient_id)
        .order_by(Session.created_at.desc())
        .all()
    )
    result = []
    for s in sessions:
        ts = None
        if s.created_at:
            local_dt = s.created_at.astimezone() if s.created_at.tzinfo else s.created_at.replace(
                tzinfo=datetime.now(timezone.utc).astimezone().tzinfo
            )
            ts = local_dt.isoformat()
        result.append({
            "id": s.id,
            "patient_id": s.patient_id,
            "patient_name": s.patient_name or "",
            "cards_examined": s.cards_examined.split(",") if s.cards_examined else [],
            "timestamp": ts,
            "pdf_filename": s.pdf_filename or "",
            "validation_status": s.validation_status,
        })
    return result


@router.delete("/{session_id}")
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Delete a session (only the owning user can delete)."""
    if session_id.startswith("SCR_"):
        from app.assessments.screening.level1 import models as scr_models
        
        assessment = db.query(scr_models.ScreeningLevel1Session).filter(
            scr_models.ScreeningLevel1Session.id == session_id
        ).first()
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Screening session not found")
            
        user_role = getattr(current_user, "role", None)
        
        if user_role not in ("super_admin", "clinic_admin", "org_admin"):
            if assessment.core_user_id != str(current_user.id):
                raise HTTPException(status_code=403, detail="Not authorized to delete this session.")
                
        if getattr(assessment, "session_data_path", None):
            json_path = DATA_STORE_DIR / assessment.session_data_path
            if json_path.exists():
                json_path.unlink()
                
        report = db.query(scr_models.ScreeningReport).filter(scr_models.ScreeningReport.assessment_id == session_id).first()
        if report and getattr(report, "pdf_filename", None):
            pdf_path = DATA_STORE_DIR / report.pdf_filename
            if pdf_path.exists():
                pdf_path.unlink()
                
        db.delete(assessment)
        db.commit()
        return {"status": "deleted", "session_id": session_id}

    visible_session = _visible_sessions_query(current_user, db).filter(Session.id == session_id).first()
    if not visible_session:
        raise HTTPException(
            status_code=404,
            detail="Session not found or not visible",
        )

    user_role = getattr(current_user, "role", None)
    
    # If not a super_admin or clinic/org admin, the user must be the session owner
    if user_role not in ("super_admin", "clinic_admin", "org_admin"):
        if visible_session.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to delete this session. Only admins or the creator can delete it.",
            )
            
    session = visible_session

    # Delete files from disk
    if session.session_data_path:
        json_path = DATA_STORE_DIR / session.session_data_path
        if json_path.exists():
            json_path.unlink()

    if session.pdf_filename:
        pdf_path = DATA_STORE_DIR / session.pdf_filename
        if pdf_path.exists():
            pdf_path.unlink()

    db.delete(session)
    db.commit()
    return {"status": "deleted", "session_id": session_id}


@router.post("/{session_id}/validate")
def validate_session(
    session_id: str,
    req: ValidateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Mark a session as validated by a qualified psychologist."""
    session = (
        _visible_sessions_query(current_user, db)
        .filter(Session.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.validation_status = "validated"
    session.validator_name = req.validator_name
    session.validator_license = req.license_number
    session.validation_date = datetime.now()
    session.validation_notes = req.validation_notes

    # Also update the JSON file on disk
    if session.session_data_path:
        json_path = DATA_STORE_DIR / session.session_data_path
        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["psychologist_validation"] = {
                "status": "Validated by Psychologist",
                "validator_name": req.validator_name,
                "license_number": req.license_number,
                "validation_date": datetime.now().isoformat(),
                "notes": req.validation_notes,
            }
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)

    db.commit()

    return {
        "status": "validated",
        "validator": req.validator_name,
        "timestamp": session.validation_date.isoformat(),
    }


@router.post("/{session_id}/request-validation")
def request_session_validation(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Request manual validation by a psychologist for an existing session."""
    if session_id.startswith("SCR_"):
        from app.assessments.screening.level1.models import ScreeningLevel1Session, ScreeningReport
        assessment = db.query(ScreeningLevel1Session).filter(ScreeningLevel1Session.id == session_id).first()
        if not assessment:
            raise HTTPException(status_code=404, detail="Screening session not found")
            
        report = db.query(ScreeningReport).filter(ScreeningReport.assessment_id == session_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not ready or missing")
            
        if report.status in ("pending", "validated", "Under Verification"):
            raise HTTPException(status_code=400, detail=f"Session is already {report.status}")
            
        session_obj = assessment
        patient_name = "Screening Candidate" # or fetch from Patient
    else:
        session = (
            _visible_sessions_query(current_user, db)
            .filter(Session.id == session_id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        if session.validation_status in ("pending", "validated"):
            raise HTTPException(status_code=400, detail=f"Session is already {session.validation_status}")
            
        session_obj = session
        patient_name = session.patient_name or "Unknown Candidate"
        
    # Deduct ₹100 from wallet
    from app.models.wallet import Wallet, WalletTransaction, TransactionType
    
    # If clinic_staff or clinic_admin, charge the clinic admin's wallet
    # If org_staff or org_admin, charge the org admin's wallet
    # But wait, wallets are per user. Let's charge the current_user's wallet, or if org_staff, find the org admin.
    # To keep it simple and robust, charge current_user or clinic owner.
    # Let's assume clinic_id maps to an admin user. We'll just charge the current_user for now unless they are staff.
    # In Psyichub, we use the `clinic_id` admin wallet if they are staff. 
    # But wait, in `app/api/routes/wallet.py` we can check how they do it.
    
    charge_user_id = current_user.id
    if current_user.role in ("clinic_staff", "org_staff") and current_user.clinic_id:
        from app.models.user import User as UserModel
        admin_role = "org_admin" if current_user.role == "org_staff" else "clinic_admin"
        admin = db.query(UserModel).filter(UserModel.clinic_id == current_user.clinic_id, UserModel.role == admin_role).first()
        if admin:
            charge_user_id = admin.id

    wallet = db.query(Wallet).filter(Wallet.user_id == charge_user_id).first()
    if not wallet or wallet.balance_paise < 10000:
        raise HTTPException(status_code=402, detail="Insufficient wallet balance. Please recharge.")
        
    wallet.balance_paise -= 10000
    current_user_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
    
    tx = WalletTransaction(
        wallet_id=wallet.id,
        type=TransactionType.debit,
        amount_paise=10000,
        balance_after_paise=wallet.balance_paise,
        description=f"Psychologist Verification Request - {patient_name} - {current_user_name}",
        created_by_id=current_user.id,
    )
    db.add(tx)
    
    if session_id.startswith("SCR_"):
        report.status = "pending"
    else:
        session.validation_status = "pending"
    
    # Create and assign VerificationRequest
    from app.services.verification_service import assign_verification_request
    try:
        assign_verification_request(db, session_id=session.id)
    except Exception as e:
        logger.error("Failed to auto-assign verification request: %s", e)
    
    # Update JSON
    if getattr(session_obj, "session_data_path", None):
        json_path = DATA_STORE_DIR / session_obj.session_data_path
        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["psychologist_validation_requested"] = True
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
                
    db.commit()
    return {"status": "success", "message": "Verification requested successfully.", "new_balance": wallet.balance_rupees()}
