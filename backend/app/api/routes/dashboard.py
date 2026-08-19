from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.user import User
from app.models.patient import Patient, Session
from app.models.wallet import Wallet
from app.models.appointment import Appointment
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Individual Psychologist Dashboard Stats."""
    
    target_clinic_id = current_user.clinic_id
    first_of_month = date.today().replace(day=1)

    if target_clinic_id:
        from app.models.org_request import OrgAssessmentRequest
        org_patient_ids_query = db.query(OrgAssessmentRequest.patient_id).filter(OrgAssessmentRequest.org_id == target_clinic_id)
        
        total_patients = db.query(Patient).filter(
            (Patient.clinic_id == target_clinic_id) | (Patient.id.in_(org_patient_ids_query))
        ).count()
        
        total_sessions = db.query(Session).join(Patient, Session.patient_id == Patient.id).filter(
            (Patient.clinic_id == target_clinic_id) | (Patient.id.in_(org_patient_ids_query))
        ).count()
        
        patients_this_month = db.query(Patient).filter(
            (Patient.clinic_id == target_clinic_id) | (Patient.id.in_(org_patient_ids_query)),
            Patient.created_at >= first_of_month
        ).count()
        
        sessions_this_month = db.query(Session).join(Patient, Session.patient_id == Patient.id).filter(
            (Patient.clinic_id == target_clinic_id) | (Patient.id.in_(org_patient_ids_query)),
            Session.created_at >= first_of_month
        ).count()
        
        wallet = db.query(Wallet).filter(Wallet.user_id == target_clinic_id).first()
        wallet_balance_paise = wallet.balance_paise if wallet else 0
        
        upcoming_appointments = db.query(Appointment).filter(
            Appointment.psychologist_id == current_user.id,
            Appointment.appointment_date >= date.today(),
            Appointment.status == "scheduled"
        ).count()
    else:
        total_patients = db.query(Patient).filter(Patient.user_id == current_user.id).count()
        total_sessions = db.query(Session).filter(Session.user_id == current_user.id).count()
        
        patients_this_month = db.query(Patient).filter(
            Patient.user_id == current_user.id,
            Patient.created_at >= first_of_month
        ).count()
        
        sessions_this_month = db.query(Session).filter(
            Session.user_id == current_user.id,
            Session.created_at >= first_of_month
        ).count()
        
        wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
        wallet_balance_paise = wallet.balance_paise if wallet else 0
        
        upcoming_appointments = db.query(Appointment).filter(
            Appointment.psychologist_id == current_user.id,
            Appointment.appointment_date >= date.today(),
            Appointment.status == "scheduled"
        ).count()

    return {
        "total_patients": total_patients,
        "total_sessions": total_sessions,
        "patients_this_month": patients_this_month,
        "sessions_this_month": sessions_this_month,
        "wallet_balance_paise": wallet_balance_paise,
        "upcoming_appointments": upcoming_appointments
    }
