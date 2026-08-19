from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.patient import Session, Patient
from app.assessments.screening.level1.models import ScreeningReport, ScreeningLevel1Session
from typing import List, Dict, Any

router = APIRouter(prefix="/api/verification-queue", tags=["verification-queue"])

@router.get("")
def get_all_pending_verifications(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch all pending assessments across the platform that require psychologist verification.
    Psychologists can pick these up, or admins can view them.
    """
    if current_user.role not in ("individual_psychologist", "super_admin", "clinic_admin", "org_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to access verification queue.")

    results = []

    # 1. Fetch Narrative Intelligence (TAT) Sessions that are pending
    # validation_status is usually "pending" or "Under Verification"
    tat_sessions = db.query(Session, User).outerjoin(User, Session.user_id == User.id).filter(
        Session.validation_status.in_(["pending", "Under Verification", "Assigned"]),
        Session.user_id != current_user.id
    ).all()

    for sess, usr in tat_sessions:
        results.append({
            "id": sess.id,
            "assessment_type": "tat",
            "assessment_name": "Narrative Intelligence Assessment",
            "patient_id": sess.patient_id,
            "patient_name": sess.patient_name or "Unknown",
            "requested_at": sess.created_at.isoformat() if sess.created_at else None,
            "status": sess.validation_status,
            "assigned_to": sess.assigned_psychologist_id,
            "requested_by": f"{usr.first_name} {usr.last_name or ''}".strip() if usr else "Unknown"
        })

    # 2. Fetch Screening Level 1 Reports that are pending
    from sqlalchemy import cast, String
    screening_pending = (
        db.query(ScreeningReport, ScreeningLevel1Session, User, Patient)
        .join(ScreeningLevel1Session, ScreeningReport.assessment_id == ScreeningLevel1Session.id)
        .outerjoin(User, ScreeningLevel1Session.core_user_id == cast(User.id, String))
        .outerjoin(Patient, ScreeningLevel1Session.core_patient_id == cast(Patient.id, String))
        .filter(
            ScreeningReport.status.in_(["pending", "Under Verification", "Assigned"]),
            ScreeningLevel1Session.core_user_id != str(current_user.id)
        )
    ).all()

    for rep, sess, usr, pat in screening_pending:
        pat_name = f"{pat.first_name} {pat.last_name or ''}".strip() if pat else "Unknown"
        results.append({
            "id": rep.assessment_id, # using assessment_id as identifier
            "assessment_type": "screening_level1",
            "assessment_name": "Screening Assessment",
            "patient_id": sess.core_patient_id,
            "patient_name": pat_name,
            "requested_at": rep.generated_at.isoformat() if rep.generated_at else None,
            "status": rep.status,
            "assigned_to": rep.verified_by_id,
            "requested_by": f"{usr.first_name} {usr.last_name or ''}".strip() if usr else "Unknown"
        })

    # Sort by requested_at descending
    results.sort(key=lambda x: x["requested_at"] or "", reverse=True)
    return results


@router.post("/{assessment_type}/{id}/assign")
def assign_verification(
    assessment_type: str,
    id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign an assessment verification to the current psychologist."""
    if current_user.role != "individual_psychologist":
        raise HTTPException(status_code=403, detail="Only psychologists can claim verification requests.")

    if assessment_type == "tat":
        session = db.query(Session).filter(Session.id == id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.assigned_psychologist_id and session.assigned_psychologist_id != current_user.id:
            raise HTTPException(status_code=400, detail="Already assigned to someone else")
        
        session.assigned_psychologist_id = current_user.id
        session.validation_status = "Assigned"
        db.commit()
        return {"status": "success", "assigned_to": current_user.id}
        
    elif assessment_type == "screening_level1":
        report = db.query(ScreeningReport).filter(ScreeningReport.assessment_id == id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        if report.verified_by_id and report.verified_by_id != current_user.id:
            raise HTTPException(status_code=400, detail="Already assigned to someone else")
            
        report.verified_by_id = current_user.id
        report.status = "Assigned"
        db.commit()
        return {"status": "success", "assigned_to": current_user.id}
        
    raise HTTPException(status_code=400, detail="Invalid assessment type")


@router.post("/{assessment_type}/{id}/reject")
def reject_verification(
    assessment_type: str,
    id: str,
    payload: Dict[str, Any],
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject an assessment report."""
    if current_user.role != "individual_psychologist":
        raise HTTPException(status_code=403, detail="Only psychologists can reject verification requests.")

    verification_notes = payload.get("verification_notes", "")

    if assessment_type == "tat":
        session = db.query(Session).filter(Session.id == id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.assigned_psychologist_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not assigned to you")
            
        session.validation_status = "pending"
        session.assigned_psychologist_id = None
        # Optionally, you could log the previous assignee in validation_notes
        session.validation_notes = f"Previously rejected by {current_user.id}. Notes: {verification_notes}"
        db.commit()
        
        from app.services.audit_service import audit_service
        audit_service.log_activity(
            db=db,
            user_id=current_user.id,
            org_id=None,
            action="VERIFICATION_REJECTED",
            details={"assessment_id": id, "type": "tat"}
        )
        
        return {"status": "success", "message": "TAT session rejected"}
        
    elif assessment_type == "screening_level1":
        report = db.query(ScreeningReport).filter(ScreeningReport.assessment_id == id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        if report.verified_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not assigned to you")
            
        report.status = "pending"
        report.verified_by_id = None
        report.verification_notes = f"Previously rejected by {current_user.id}. Notes: {verification_notes}"
        db.commit()
        
        from app.services.audit_service import audit_service
        audit_service.log_activity(
            db=db,
            user_id=current_user.id,
            org_id=None,
            action="VERIFICATION_REJECTED",
            details={"assessment_id": id, "type": "screening_level1"}
        )
        
        return {"status": "success", "message": "Screening report rejected"}

    raise HTTPException(status_code=400, detail="Invalid assessment type")


@router.get("/{assessment_type}/{id}")
def get_verification_details(
    assessment_type: str,
    id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch the full report details for review."""
    if current_user.role not in ("individual_psychologist", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized.")

    if assessment_type == "tat":
        import json
        from app.database import DATA_STORE_DIR
        session = db.query(Session).filter(Session.id == id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        data = {}
        if session.session_data_path:
            json_path = DATA_STORE_DIR / session.session_data_path
            if json_path.exists():
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
        return {
            "session": {
                "id": session.id,
                "patient_id": session.patient_id,
                "status": session.validation_status,
                "assigned_to": session.assigned_psychologist_id,
            },
            "report_data": data
        }
        
    elif assessment_type == "screening_level1":
        report = db.query(ScreeningReport).filter(ScreeningReport.assessment_id == int(id)).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
            
        return {
            "report": {
                "assessment_id": report.assessment_id,
                "status": report.status,
                "assigned_to": report.verified_by_id,
            },
            "report_data": report.json_data
        }

    raise HTTPException(status_code=400, detail="Invalid assessment type")


from pydantic import BaseModel
from typing import Optional

class VerifyApprovalRequest(BaseModel):
    verification_notes: str
    executive_summary: Optional[str] = None
    ai_clinical_insight: Optional[str] = None
    clinical_formulation: Optional[str] = None # For TAT

@router.post("/{assessment_type}/{id}/approve")
def approve_verification(
    assessment_type: str,
    id: str,
    req: VerifyApprovalRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve and save edited findings."""
    from datetime import datetime
    if current_user.role != "individual_psychologist":
        raise HTTPException(status_code=403, detail="Only psychologists can approve verifications.")

    validator_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
    license_number = getattr(current_user, "rci_number", "")

    if assessment_type == "tat":
        session = db.query(Session).filter(Session.id == id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.assigned_psychologist_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not assigned to you")
            
        session.validation_status = "Verified by Psychologist"
        session.validator_name = validator_name
        session.validator_license = license_number
        session.validation_date = datetime.now()
        session.validation_notes = req.verification_notes

        # Also update the JSON file on disk
        import json
        from app.database import DATA_STORE_DIR
        if session.session_data_path:
            json_path = DATA_STORE_DIR / session.session_data_path
            if json_path.exists():
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                # Edit clinical formulation if provided
                if req.clinical_formulation and "report_summary" in data:
                    data["report_summary"]["clinical_formulation"] = req.clinical_formulation
                    
                data["psychologist_validation"] = {
                    "status": "Verified by Psychologist",
                    "validator_name": validator_name,
                    "license_number": license_number,
                    "validation_date": datetime.now().isoformat(),
                    "notes": req.verification_notes,
                }
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, default=str)

        db.commit()
        
        from app.services.audit_service import audit_service
        audit_service.log_activity(
            db=db,
            user_id=current_user.id,
            org_id=None,
            action="VERIFICATION_COMPLETED",
            details={"assessment_id": id, "type": "tat", "status": "Verified by Psychologist"}
        )
        
        return {"status": "success"}

    elif assessment_type == "screening_level1":
        report = db.query(ScreeningReport).filter(ScreeningReport.assessment_id == int(id)).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        if report.verified_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not assigned to you")

        json_data = report.json_data
        if isinstance(json_data, str):
            import json
            json_data = json.loads(json_data)
            
        report_summary = json_data.get("report_summary", json_data)
        
        # Log changes
        history = report.changes_history or []
        changes = {
            "verified_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
            "notes": req.verification_notes,
            "edits": {}
        }
        
        if req.executive_summary is not None and req.executive_summary != report_summary.get("executive_summary"):
            changes["edits"]["executive_summary"] = {"old": report_summary.get("executive_summary"), "new": req.executive_summary}
            report_summary["executive_summary"] = req.executive_summary
            
        if req.ai_clinical_insight is not None and req.ai_clinical_insight != report_summary.get("ai_clinical_insight"):
            changes["edits"]["ai_clinical_insight"] = {"old": report_summary.get("ai_clinical_insight"), "new": req.ai_clinical_insight}
            report_summary["ai_clinical_insight"] = req.ai_clinical_insight
            
        history.append(changes)
        
        if "report_summary" in json_data:
            json_data["report_summary"] = report_summary
        else:
            json_data = report_summary
            
        json_data["psychologist_validation"] = {
            "is_verified": True,
            "validator_name": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
            "license_number": getattr(current_user, "rci_number", ""),
            "validation_date": datetime.utcnow().strftime('%d-%m-%Y'),
            "notes": req.verification_notes,
            "e_signature_path": getattr(current_user, "e_signature_path", "")
        }
            
        report.json_data = json_data
        report.changes_history = history
        report.status = "Verified by Psychologist"
        report.verified_at = datetime.utcnow()
        report.verification_notes = req.verification_notes
        
        db.commit()
        
        from app.services.audit_service import audit_service
        audit_service.log_activity(
            db=db,
            user_id=current_user.id,
            org_id=None,
            action="VERIFICATION_COMPLETED",
            details={"assessment_id": id, "type": "screening_level1", "status": "Verified by Psychologist"}
        )
        
        return {"status": "success"}

    raise HTTPException(status_code=400, detail="Invalid assessment type")
