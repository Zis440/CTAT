"""
PDF report serving API route.

Reports are stored under ``data_store/reports/<user_id>/`` and are
auth-gated so users can only access their own reports (or their clinic's).
"""
from pathlib import PurePosixPath, Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DBSession

from app.database import get_db, DATA_STORE_DIR, REPORTS_DIR
from app.models.user import User
from app.auth.dependencies import get_current_user, require_permission, require_any_permission
from app.models.patient import Session
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/pdf/{filename:path}")
async def serve_pdf(
    filename: str,
    current_user: User = Depends(require_any_permission("reports", "assessments")),
    db: DBSession = Depends(get_db),
):
    """Serve a generated PDF report. Checks ownership via the sessions table."""
    # ── Path traversal protection ─────────────────────────────────────────
    # Strip any directory components (../../etc) and validate extension
    safe_name = PurePosixPath(filename).name  # "../../foo.pdf" → "foo.pdf"
    if not safe_name or not safe_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Look up the session that references this PDF
    session = db.query(Session).filter(
        Session.pdf_filename.contains(safe_name)
    ).first()

    if session:
        # Verify the current user is allowed to access this report
        allowed = session.user_id == current_user.id
        if getattr(current_user, "role", None) == "super_admin":
            allowed = True
        elif session.assigned_psychologist_id == current_user.id:
            allowed = True
        elif not allowed and current_user.clinic_id:
            # Check if the session owner is in the same clinic
            owner = db.query(User).filter(User.id == session.user_id).first()
            if owner and owner.clinic_id == current_user.clinic_id:
                allowed = True
        
        if not allowed:
            # Check if they are the assigned psychologist via VerificationRequest (fallback for legacy sync)
            from app.models.verification_request import VerificationRequest
            v_req = db.query(VerificationRequest).filter(
                VerificationRequest.session_id == session.id,
                VerificationRequest.assigned_psychologist_id == current_user.id
            ).first()
            if v_req:
                allowed = True

        if not allowed:
            raise HTTPException(status_code=403, detail="Access denied")

        pdf_path = DATA_STORE_DIR / session.pdf_filename
        if pdf_path.exists():
            return FileResponse(pdf_path, media_type="application/pdf", filename=safe_name)

    # ── Fallback 1: Dynamic generation for Employee Mental Health & Wellbeing ──
    if safe_name.startswith("screening_level1_"):
        import re, json
        match = re.match(r"screening_level1_(SCR_[a-f0-9_]+)\.pdf", safe_name)
        if match:
            assessment_id = match.group(1)
            from app.assessments.screening.level1.models import ScreeningLevel1Session, ScreeningReport
            
            assessment = db.query(ScreeningLevel1Session).filter(ScreeningLevel1Session.id == assessment_id).first()
            if assessment:
                # Check permissions
                allowed = False
                if getattr(current_user, "role", None) in ("super_admin", "clinic_admin", "org_admin"):
                    allowed = True
                elif assessment.core_user_id == str(current_user.id):
                    allowed = True
                else:
                    report = db.query(ScreeningReport).filter(ScreeningReport.assessment_id == assessment_id).first()
                    if report and report.verified_by_id == current_user.id:
                        allowed = True
                        
                if allowed:
                    if assessment.pdf_filename:
                        pdf_path = DATA_STORE_DIR / assessment.pdf_filename
                        if pdf_path.exists():
                            return FileResponse(pdf_path, media_type="application/pdf", filename=safe_name)

                    if 'report' not in locals():
                        report = db.query(ScreeningReport).filter(ScreeningReport.assessment_id == assessment_id).first()
                    
                    if report:
                        from app.assessments.screening.level1.engines.report_generator import generate_report
                        import os
                        
                        report_data = report.json_data
                        if isinstance(report_data, str):
                            report_data = json.loads(report_data)
                            
                        user_info = {
                            "name": f"{getattr(current_user, 'first_name', '')} {getattr(current_user, 'last_name', '')}".strip() or "Staff",
                            "designation": getattr(current_user, 'role', 'Org Staff'),
                        }
                        import datetime as dt
                        completed_at = assessment.end_time or assessment.start_time or dt.datetime.now()
                        patient_info = {
                            "name": assessment.core_patient_id or "Anonymous",
                            "patient_id": assessment.core_patient_id or "Unknown",
                            "completed_at": completed_at,
                            "assessment_date": completed_at.strftime('%d-%m-%Y'),
                            "assessment_time": completed_at.strftime('%I:%M %p')
                        }
                        
                        output_dir = DATA_STORE_DIR / "temp_reports"
                        output_dir.mkdir(parents=True, exist_ok=True)
                        file_path = output_dir / safe_name
                        
                        clinic_info = None
                        if hasattr(current_user, 'clinic_id') and current_user.clinic_id:
                            from app.models.clinic import ClinicProfile
                            from app.models.user import User
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

                        generate_report(
                            report=report_data,
                            patient_info=patient_info,
                            output_path=file_path,
                            user_info=user_info,
                            clinic_info=clinic_info
                        )
                        
                        return FileResponse(file_path, media_type="application/pdf", filename=safe_name)

    # ── Fallback 2: Try the user's own report directory ──
    user_path = REPORTS_DIR / str(current_user.id) / safe_name
    if user_path.exists():
        return FileResponse(user_path, media_type="application/pdf", filename=safe_name)

    raise HTTPException(status_code=404, detail="PDF report not found")


@router.post("/pdf/{filename:path}/open")
async def open_pdf_with_audit(
    filename: str,
    current_user: User = Depends(require_any_permission("reports", "assessments")),
    db: DBSession = Depends(get_db),
):
    """Serve a generated PDF report and log the REPORT_OPENED event."""
    safe_name = PurePosixPath(filename).name
    if not safe_name or not safe_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid filename")

    session = db.query(Session).filter(
        Session.pdf_filename.contains(safe_name)
    ).first()

    if session:
        allowed = session.user_id == current_user.id
        if getattr(current_user, "role", None) == "super_admin":
            allowed = True
        elif session.assigned_psychologist_id == current_user.id:
            allowed = True
        elif not allowed and current_user.clinic_id:
            owner = db.query(User).filter(User.id == session.user_id).first()
            if owner and owner.clinic_id == current_user.clinic_id:
                allowed = True
        
        if not allowed:
            from app.models.verification_request import VerificationRequest
            v_req = db.query(VerificationRequest).filter(
                VerificationRequest.session_id == session.id,
                VerificationRequest.assigned_psychologist_id == current_user.id
            ).first()
            if v_req:
                allowed = True

        if not allowed:
            raise HTTPException(status_code=403, detail="Access denied")

        pdf_path = DATA_STORE_DIR / session.pdf_filename
        if pdf_path.exists():
            # Audit log the event
            patient_name = "Anonymous"
            if session.patient_id:
                from app.models.patient import Patient
                pat = db.query(Patient).filter(Patient.id == session.patient_id).first()
                if pat:
                    patient_name = f"{getattr(pat, 'first_name', '')} {getattr(pat, 'last_name', '')}".strip() or "Anonymous"
            
            audit_service.log_activity(
                db=db,
                user_id=current_user.id,
                target_user_id=None,
                org_id=getattr(current_user, "clinic_id", None),
                action="REPORT_OPENED",
                details={
                    "assessment_id": session.id,
                    "assessment_name": "Narrative Intelligence Assessment",
                    "patient_id": session.patient_id,
                    "patient_name": patient_name,
                    "performed_by": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
                    "clinic_or_org_name": current_user.clinic_name or "Independent Psychologist"
                }
            )
            return FileResponse(
                pdf_path, 
                media_type="application/pdf", 
                filename=safe_name,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Expose-Headers": "Content-Disposition"
                }
            )

    user_path = REPORTS_DIR / str(current_user.id) / "tat" / safe_name
    if not user_path.exists():
        user_path = REPORTS_DIR / str(current_user.id) / safe_name
        
    if not user_path.exists():
        # Fallback to search recursively for the basename in the user's report directory
        import glob
        matches = glob.glob(str(REPORTS_DIR / str(current_user.id) / "**" / safe_name), recursive=True)
        if matches:
            user_path = Path(matches[0])

    if user_path.exists():
        audit_service.log_activity(
            db=db,
            user_id=current_user.id,
            target_user_id=None,
            org_id=getattr(current_user, "clinic_id", None),
            action="REPORT_OPENED",
            details={
                "assessment_id": "UNKNOWN",
                "assessment_name": "Unknown Assessment",
                "patient_id": "UNKNOWN",
                "patient_name": "Anonymous",
                "performed_by": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
                "clinic_or_org_name": current_user.clinic_name or "Independent Psychologist"
            }
        )
        return FileResponse(
            user_path, 
            media_type="application/pdf", 
            filename=safe_name,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

    raise HTTPException(status_code=404, detail="PDF report not found")
