from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Dict, Any
from datetime import datetime, timezone

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.verification_request import VerificationRequest, VerificationRequestStatus
from app.models.patient import Session as AssessmentSession
from app.assessments.tat.engines.clinical.clinical_report_generator import generate_report
from app.api.dependencies import SESSION_DIR

router = APIRouter(prefix="/api/psychologist-verification", tags=["Psychologist Verification Algorithm"])

@router.get("/queue", response_model=List[Dict[str, Any]])
def get_verification_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the queue of pending verifications assigned to the current psychologist."""
    if current_user.role != UserRole.individual_psychologist:
        raise HTTPException(status_code=403, detail="Only individual psychologists can access this verification queue.")
        
    requests = db.query(VerificationRequest).filter(
        VerificationRequest.assigned_psychologist_id == current_user.id,
        VerificationRequest.status == VerificationRequestStatus.ASSIGNED
    ).order_by(desc(VerificationRequest.assigned_at)).all()
    
    result = []
    for req in requests:
        session_info = db.query(AssessmentSession).filter(AssessmentSession.id == req.session_id).first()
        if session_info:
            # Look up the requesting user (the one who created the session)
            requesting_user = db.query(User).filter(User.id == session_info.user_id).first()
            result.append({
                "request_id": req.id,
                "session_id": session_info.id,
                "patient_name": session_info.patient_name,
                "created_at": req.created_at.isoformat() if req.created_at else None,
                "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
                "status": req.status.value,
                "report_pdf_path": session_info.pdf_filename,
                "assignment_attempts": req.assignment_attempts,
                "requesting_user_name": f"{requesting_user.first_name} {requesting_user.last_name or ''}".strip() if requesting_user else None,
                "requesting_user_domain": requesting_user.professional_domain if requesting_user else None,
            })
            
    return result

@router.get("/history", response_model=List[Dict[str, Any]])
def get_verification_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the history of verified reports by the current psychologist."""
    if current_user.role != UserRole.individual_psychologist:
        raise HTTPException(status_code=403, detail="Only individual psychologists can access this history.")
        
    requests = db.query(VerificationRequest).filter(
        VerificationRequest.assigned_psychologist_id == current_user.id,
        VerificationRequest.status == VerificationRequestStatus.VERIFIED
    ).order_by(desc(VerificationRequest.completed_at)).all()
    
    result = []
    for req in requests:
        session_info = db.query(AssessmentSession).filter(AssessmentSession.id == req.session_id).first()
        if session_info:
            requesting_user = db.query(User).filter(User.id == session_info.user_id).first()
            result.append({
                "request_id": req.id,
                "session_id": session_info.id,
                "patient_name": session_info.patient_name,
                "created_at": req.created_at.isoformat() if req.created_at else None,
                "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
                "completed_at": req.completed_at.isoformat() if req.completed_at else None,
                "status": req.status.value,
                "report_pdf_path": session_info.pdf_filename,
                "requesting_user_name": f"{requesting_user.first_name} {requesting_user.last_name or ''}".strip() if requesting_user else None,
                "requesting_user_domain": requesting_user.professional_domain if requesting_user else None,
            })
            
    return result

@router.post("/{request_id}/approve")
def approve_verification(
    request_id: str,
    notes: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a report verification and regenerate the PDF with the signature."""
    if current_user.role != UserRole.individual_psychologist:
        raise HTTPException(status_code=403, detail="Only psychologists can approve verifications.")
        
    v_req = db.query(VerificationRequest).filter(
        VerificationRequest.id == request_id,
        VerificationRequest.assigned_psychologist_id == current_user.id
    ).first()
    
    if not v_req:
        raise HTTPException(status_code=404, detail="Verification request not found or not assigned to you.")
        
    if v_req.status != VerificationRequestStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="This request is no longer pending assignment.")
        
    try:
        # Fetch session and regenerate report
        session_info = db.query(AssessmentSession).filter(AssessmentSession.id == v_req.session_id).first()
        if session_info and session_info.session_data_path:
            import json
            from app.database import DATA_STORE_DIR
            session_json_path = DATA_STORE_DIR / session_info.session_data_path
            
            if session_json_path.exists():
                with open(session_json_path, "r", encoding="utf-8") as f:
                    session_data = json.load(f)
                    
                analysis_data = session_data.get("report_summary", {})
                
                # Inject validation details
                validation_details = {
                    "validator_name": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
                    "license_number": current_user.rci_number or current_user.roc_number or "N/A",
                    "validation_date": datetime.now().strftime('%d-%m-%Y'),
                    "is_verified": True,
                    "signature_path": getattr(current_user, 'e_signature_path', '')
                }
                
                analysis_data['psychologist_validation'] = validation_details
                session_data["report_summary"] = analysis_data
                
                with open(session_json_path, "w", encoding="utf-8") as f:
                    json.dump(session_data, f, indent=2, default=str)
                    
                # Re-generate PDF
                if session_info.pdf_filename:
                    from app.database import DATA_STORE_DIR
                    pdf_path = DATA_STORE_DIR / session_info.pdf_filename
                    if pdf_path.exists():
                        try:
                            # Import the clinical report generator
                            from app.assessments.tat.engines.clinical.clinical_report_generator import generate_report
                            
                            p_info = session_data.get('patient_info', {})
                            
                            # Use original test performer for user_info
                            perf_user = db.query(User).filter(User.id == session_info.user_id).first()
                            if not perf_user:
                                perf_user = current_user
                                
                            clinic_info = None
                            if perf_user.role == UserRole.org_staff or perf_user.role == UserRole.org_admin:
                                from app.models.clinic import ClinicProfile
                                org_admin = db.query(User).filter(User.id == perf_user.clinic_id).first()
                                if org_admin:
                                    clinic_profile = db.query(ClinicProfile).filter(ClinicProfile.clinic_id == org_admin.clinic_id).first()
                                    c_logo = clinic_profile.logo_path if clinic_profile and clinic_profile.logo_path else org_admin.avatar_path
                                    clinic_info = {
                                        "clinic_name": getattr(org_admin, 'clinic_name', ''),
                                        "address": getattr(org_admin, 'address', ''),
                                        "phone": getattr(org_admin, 'phone', ''),
                                        "email": getattr(org_admin, 'email', ''),
                                        "logo_path": c_logo
                                    }
                            elif perf_user.role == UserRole.clinic_staff or perf_user.role == UserRole.clinic_admin:
                                from app.models.clinic import ClinicProfile
                                clinic_admin = db.query(User).filter(User.clinic_id == perf_user.clinic_id, User.role == UserRole.clinic_admin).first()
                                if not clinic_admin:
                                    clinic_admin = perf_user
                                clinic_logo_path = None
                                clinic_profile = db.query(ClinicProfile).filter(ClinicProfile.clinic_id == perf_user.clinic_id).first()
                                if clinic_profile and clinic_profile.logo_path:
                                    clinic_logo_path = clinic_profile.logo_path
                                elif clinic_admin.avatar_path:
                                    clinic_logo_path = clinic_admin.avatar_path
                                    
                                clinic_info = {
                                    "clinic_name": getattr(clinic_admin, 'clinic_name', '') or getattr(perf_user, 'clinic_name', ''),
                                    "address": getattr(clinic_admin, 'address', ''),
                                    "phone": getattr(clinic_admin, 'phone', ''),
                                    "email": getattr(clinic_admin, 'email', ''),
                                    "logo_path": clinic_logo_path
                                }

                            generate_report(
                                aggregated=analysis_data,
                                patient_info=p_info,
                                output_path=pdf_path,
                                card_analyses=list(session_data.get("card_results", {}).values()),
                                clinical_formulation=analysis_data.get("clinical_formulation", ""),
                                medication_result=analysis_data.get("medication_result", None),
                                user_info={
                                    "name": f"{perf_user.first_name} {perf_user.last_name or ''}".strip(),
                                    "rci_number": perf_user.rci_number,
                                    "roc_number": perf_user.roc_number,
                                    "clinic_name": perf_user.clinic_name,
                                    "role": perf_user.role,
                                    "designation": perf_user.specialization or "Clinical Psychologist",
                                    "phone": perf_user.phone or "",
                                    "address": perf_user.address or "",
                                    "e_signature_path": getattr(perf_user, 'e_signature_path', '')
                                },
                                clinic_info=clinic_info
                            )
                        except Exception as e:
                            import logging
                            logging.getLogger(__name__).error(f"Failed to regenerate PDF: {e}")
                        
                session_info.validation_status = "Verified by Psychologist"
                session_info.validator_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
                session_info.validation_date = datetime.now(timezone.utc)
                
                if session_info.id.startswith("SCR_"):
                    from app.assessments.screening.level1.models import ScreeningReport as ScrReport
                    scr_rep = db.query(ScrReport).filter(ScrReport.assessment_id == session_info.id).first()
                    if scr_rep:
                        scr_rep.status = "Verified by Psychologist"
                        scr_rep.verified_by_id = current_user.id
                        scr_rep.verified_at = datetime.now(timezone.utc)
                        scr_rep.verification_notes = notes
                        
                        import json
                        scr_data = scr_rep.json_data
                        if isinstance(scr_data, str):
                            scr_data = json.loads(scr_data)
                        
                        if scr_data:
                            scr_summary = scr_data.get("report_summary", scr_data)
                            scr_summary["psychologist_validation"] = validation_details
                            if "report_summary" in scr_data:
                                scr_data["report_summary"] = scr_summary
                            else:
                                scr_data = scr_summary
                            
                            scr_rep.json_data = scr_data

        
        # Mark as verified using raw SQL to guarantee the write.
        # We must also expunge the stale v_req from the ORM session so that
        # when db.commit() flushes dirty objects, it does NOT overwrite our
        # UPDATE with the old ASSIGNED status still held in memory.
        from sqlalchemy import text as _text
        db.expunge(v_req)  # remove stale object so ORM can't clobber our update
        db.execute(
            _text("UPDATE verification_requests SET status = :status, completed_at = :completed_at, notes = :notes WHERE id = :rid"),
            {"status": "VERIFIED", "completed_at": datetime.now(timezone.utc), "notes": notes, "rid": request_id}
        )
        current_user.total_verifications_done = (current_user.total_verifications_done or 0) + 1
                
        # Add Audit Log
        from app.services.audit_service import AuditService
        AuditService().log_activity(
            db=db,
            user_id=current_user.id,
            action="REPORT_VALIDATED",
            details={
                "assessment_id": session_info.id,
                "patient_id": session_info.patient_id,
                "verified_by": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
                "rci_number": current_user.rci_number or "N/A",
                "validation_notes": notes
            }
        )

        db.commit()
        return {"status": "success", "message": "Report verified successfully"}
    except Exception as e:
        db.rollback()
        import traceback
        import logging
        logging.getLogger(__name__).error(f"Verification failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{request_id}/reject")
def reject_verification_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject an assigned verification request. It will be sent to the next available psychologist."""
    if current_user.role != UserRole.individual_psychologist:
        raise HTTPException(status_code=403, detail="Only psychologists can reject verifications.")
        
    v_req = db.query(VerificationRequest).filter(
        VerificationRequest.id == request_id,
        VerificationRequest.assigned_psychologist_id == current_user.id
    ).first()
    
    if not v_req:
        raise HTTPException(status_code=404, detail="Verification request not found or not assigned to you.")
        
    if v_req.status != VerificationRequestStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="This request is no longer pending assignment.")
        
    # Set status to EXPIRED so the algorithm picks a new psychologist
    v_req.status = VerificationRequestStatus.EXPIRED
    db.commit()
    
    # Re-run assignment algorithm
    from app.services.verification_service import assign_verification_request
    assign_verification_request(db, request_id=v_req.id)
    
    return {"status": "success", "message": "Report rejected and sent to the next psychologist."}

@router.get("/admin/monitor", response_model=List[Dict[str, Any]])
def admin_monitor_verifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Super Admin view of all verification requests and their live status."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can monitor verifications.")
        
    requests = db.query(VerificationRequest).order_by(desc(VerificationRequest.created_at)).all()
    
    result = []
    for req in requests:
        psychologist = None
        if req.assigned_psychologist_id:
            psychologist = db.query(User).filter(User.id == req.assigned_psychologist_id).first()
            
        result.append({
            "request_id": req.id,
            "session_id": req.session_id,
            "status": req.status.value,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
            "completed_at": req.completed_at.isoformat() if req.completed_at else None,
            "assignment_attempts": req.assignment_attempts,
            "psychologist_name": f"{psychologist.first_name} {psychologist.last_name or ''}".strip() if psychologist else None,
            "psychologist_email": psychologist.email if psychologist else None
        })
        
    return result

@router.get("/admin/request/{request_id}", response_model=Dict[str, Any])
def admin_get_single_verification(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a single verification request."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can view request details.")
        
    req = db.query(VerificationRequest).filter(VerificationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    psychologist = None
    if req.assigned_psychologist_id:
        psychologist = db.query(User).filter(User.id == req.assigned_psychologist_id).first()
        
    session_info = db.query(AssessmentSession).filter(AssessmentSession.id == req.session_id).first()
    
    requesting_user = None
    if session_info:
        requesting_user = db.query(User).filter(User.id == session_info.user_id).first()
        
    return {
        "request_id": req.id,
        "session_id": req.session_id,
        "patient_name": session_info.patient_name if session_info else None,
        "status": req.status.value,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
        "completed_at": req.completed_at.isoformat() if req.completed_at else None,
        "assignment_attempts": req.assignment_attempts,
        "psychologist_name": f"{psychologist.first_name} {psychologist.last_name or ''}".strip() if psychologist else None,
        "psychologist_email": psychologist.email if psychologist else None,
        "report_pdf_path": session_info.pdf_filename if session_info else None,
        "requesting_user_name": f"{requesting_user.first_name} {requesting_user.last_name or ''}".strip() if requesting_user else None,
        "requesting_user_domain": requesting_user.professional_domain if requesting_user else None,
    }

@router.get("/admin/psychologists", response_model=List[Dict[str, Any]])
def admin_get_eligible_psychologists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of eligible RCI psychologists for manual assignment."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can view this.")
        
    from app.services.verification_service import _get_eligible_validators
    psychologists = _get_eligible_validators(db)
    
    result = []
    for p in psychologists:
        result.append({
            "id": p.id,
            "name": f"{p.first_name} {p.last_name or ''}".strip(),
            "email": p.email,
            "rci_number": p.rci_number,
        })
    return result

@router.get("/admin/all-psychologists", response_model=List[Dict[str, Any]])
def admin_get_all_psychologists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of ALL individual clinical psychologists, regardless of verification status."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can view this.")
        
    psychologists = db.query(User).filter(
        User.role == UserRole.individual_psychologist,
        User.professional_domain.ilike("%clinical%")
    ).all()
    
    result = []
    for p in psychologists:
        result.append({
            "id": p.id,
            "name": f"{p.first_name} {p.last_name or ''}".strip(),
            "email": p.email,
            "rci_number": p.rci_number,
            "verification_status": getattr(p, "verification_status", "unknown").value if hasattr(getattr(p, "verification_status", None), "value") else getattr(p, "verification_status", "unknown"),
        })
    return result

@router.post("/admin/request/{request_id}/reassign")
def admin_reassign_request(
    request_id: str,
    psychologist_id: str = None, # If None, runs algorithm
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually force a re-assignment, optionally to a specific psychologist."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can reassign.")
        
    v_req = db.query(VerificationRequest).filter(VerificationRequest.id == request_id).first()
    if not v_req:
        raise HTTPException(status_code=404, detail="Request not found.")
        
    if v_req.status in [VerificationRequestStatus.VERIFIED, VerificationRequestStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Cannot reassign a verified or rejected request.")
        
    from app.services.verification_service import assign_verification_request
    from datetime import datetime, timezone
    
    if psychologist_id:
        # Manual assignment
        psychologist = db.query(User).filter(User.id == psychologist_id).first()
        if not psychologist:
            raise HTTPException(status_code=404, detail="Psychologist not found.")
            
        v_req.assigned_psychologist_id = psychologist.id
        v_req.status = VerificationRequestStatus.ASSIGNED
        v_req.assigned_at = datetime.now(timezone.utc)
        v_req.assignment_attempts += 1

        # Sync with Session record
        session_info = db.query(AssessmentSession).filter(AssessmentSession.id == v_req.session_id).first()
        if session_info:
            session_info.assigned_psychologist_id = psychologist.id

        db.commit()
        
        # Send email (optional, assuming we have the function)
        from app.services.email_service import email_service
        try:
            email_service.send_verification_assignment_email(
                psychologist_email=psychologist.email,
                psychologist_name=f"{psychologist.first_name} {psychologist.last_name or ''}".strip(),
                assessment_name="Psychological Assessment Report",
                patient_name=v_req.patient_name or "Patient",
            )
        except Exception as e:
            pass
            
        return {"status": "success", "message": f"Manually assigned to {psychologist.first_name}"}
    else:
        # Algorithmic assignment
        # First reset the attempt counter or status so it picks someone new
        v_req.status = VerificationRequestStatus.EXPIRED
        db.commit()
        v_req = assign_verification_request(db, request_id=v_req.id)
        return {"status": "success", "message": "Triggered algorithmic reassignment"}

@router.post("/admin/request/{request_id}/cancel")
def admin_cancel_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a verification request and refund the ₹100."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can cancel requests.")
        
    v_req = db.query(VerificationRequest).filter(VerificationRequest.id == request_id).first()
    if not v_req:
        raise HTTPException(status_code=404, detail="Request not found.")
        
    if v_req.status in [VerificationRequestStatus.VERIFIED, VerificationRequestStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Cannot cancel a verified or already cancelled request.")
        
    v_req.status = VerificationRequestStatus.REJECTED
    
    # Process refund
    session_info = db.query(AssessmentSession).filter(AssessmentSession.id == v_req.session_id).first()
    if session_info:
        session_info.validation_status = "Cancelled"
        session_info.assigned_psychologist_id = None
        
        # Refund 100 Rs (10000 paise) to the user who created the session
        from app.wallet.router import _get_wallet, _record_transaction, _get_target_user_id
        session_creator = db.query(User).filter(User.id == session_info.user_id).first()
        if session_creator:
            target_user_id = _get_target_user_id(session_creator, db)
            wallet = _get_wallet(target_user_id, db, lock=True)
            
            wallet.balance_paise += 10000
            
            from app.models.wallet import TransactionType
            _record_transaction(
                wallet=wallet,
                tx_type=TransactionType.credit,
                amount_paise=10000,
                description=f"Refund: Verification Request Cancelled - {session_info.patient_name}",
                db=db,
                created_by_id=current_user.id
            )
            
    db.commit()
    return {"status": "success", "message": "Request cancelled and ₹100 refunded."}
