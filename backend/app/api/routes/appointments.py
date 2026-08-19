"""
Appointment API routes.

Endpoints:
  POST   /api/appointments            — Create a new appointment (psychologist)
  GET    /api/appointments            — List own appointments (psychologist)
  GET    /api/appointments/admin-all  — List ALL appointments (super_admin)
  GET    /api/appointments/clinic-all — List clinic appointments (clinic_admin)
  GET    /api/appointments/{id}       — Get appointment by ID
  PATCH  /api/appointments/{id}       — Update an appointment (owner / admin)
  DELETE /api/appointments/{id}       — Delete an appointment (owner / admin)
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentOut,
    AppointmentAdminOut,
)
from app.auth.dependencies import (
    get_current_user,
    require_super_admin,
    require_admin_or_above,
    require_permission,
)

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


# ── Helper ────────────────────────────────────────────────────────────────────
def _build_admin_out(apt: Appointment, psych: User, patient: Patient, db: DBSession = None) -> AppointmentAdminOut:
    """Build an AppointmentAdminOut from joined ORM objects."""
    clinic_name = None
    if apt.clinic_id and db:
        clinic_user = db.query(User).filter(User.id == apt.clinic_id).first()
        if clinic_user:
            clinic_name = clinic_user.clinic_name or f"{clinic_user.first_name} {clinic_user.last_name or ''}".strip()

    return AppointmentAdminOut(
        id=apt.id,
        psychologist_id=apt.psychologist_id,
        patient_id=apt.patient_id,
        clinic_id=apt.clinic_id,
        clinic_name=clinic_name,
        appointment_date=apt.appointment_date,
        start_time=apt.start_time,
        duration_minutes=apt.duration_minutes,
        status=apt.status.value if isinstance(apt.status, AppointmentStatus) else apt.status,
        purpose=apt.purpose,
        notes=apt.notes,
        created_at=apt.created_at,
        updated_at=apt.updated_at,
        psychologist_name=f"{psych.first_name} {psych.last_name or ''}".strip(),
        psychologist_email=psych.email,
        patient_name=f"{patient.first_name} {patient.last_name or ''}".strip() if patient else None,
    )


# ── Create ────────────────────────────────────────────────────────────────────
@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(
    req: AppointmentCreate,
    current_user: User = Depends(require_permission("appointments")),
    db: DBSession = Depends(get_db),
):
    """Create a new appointment. The current user becomes the psychologist unless specified."""
    # Validate patient exists and belongs to the user (or the user's clinic)
    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Authorization: patient must belong to the user or the same clinic (Super Admins bypass this)
    if current_user.role != "super_admin" and patient.user_id != current_user.id:
        if not (current_user.clinic_id and patient.clinic_id == current_user.clinic_id):
            raise HTTPException(
                status_code=403,
                detail="You can only create appointments for your own patients",
            )

    # Determine psychologist: If Clinic Admin provides one, use it. Otherwise, default to current_user
    psychologist_id = current_user.id
    if req.psychologist_id and current_user.role in ["clinic_admin", "super_admin"]:
        psychologist_id = req.psychologist_id

    # Determine clinic from patient or psychologist
    actual_clinic_id = patient.clinic_id
    if not actual_clinic_id:
        psych = db.query(User).filter(User.id == psychologist_id).first()
        if psych:
            actual_clinic_id = psych.id if psych.role == "clinic_admin" else psych.clinic_id
    if not actual_clinic_id:
        actual_clinic_id = current_user.clinic_id if current_user.role != "super_admin" else None

    apt = Appointment(
        psychologist_id=psychologist_id,
        patient_id=req.patient_id,
        clinic_id=actual_clinic_id,
        appointment_date=req.appointment_date,
        start_time=req.start_time,
        duration_minutes=req.duration_minutes,
        purpose=req.purpose,
        notes=req.notes,
    )
    db.add(apt)
    db.commit()
    db.refresh(apt)
    return apt


# ── List own ──────────────────────────────────────────────────────────────────
@router.get("", response_model=List[AppointmentOut])
def list_appointments(
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(require_permission("appointments")),
    db: DBSession = Depends(get_db),
):
    """List appointments for the current psychologist."""
    q = db.query(Appointment).filter(Appointment.psychologist_id == current_user.id)
    if status:
        q = q.filter(Appointment.status == status)
    return q.order_by(Appointment.appointment_date.desc()).all()


# ──────────────────────────────────────────────────────────────────────────────
# IMPORTANT: Fixed-path routes MUST be defined BEFORE dynamic /{appointment_id}
# routes, otherwise FastAPI will match "admin-all" as an appointment_id.
# ──────────────────────────────────────────────────────────────────────────────

# ── Admin: All appointments (Super Admin) ─────────────────────────────────────
@router.get("/admin-all", response_model=List[AppointmentAdminOut])
def list_all_appointments_admin(
    current_user: User = Depends(require_super_admin),
    db: DBSession = Depends(get_db),
):
    """List ALL appointments platform-wide (super admin only)."""
    results = (
        db.query(Appointment, User, Patient)
        .join(User, Appointment.psychologist_id == User.id)
        .join(Patient, Appointment.patient_id == Patient.id)
        .order_by(Appointment.appointment_date.desc())
        .all()
    )
    return [_build_admin_out(apt, psych, patient, db) for apt, psych, patient in results]


@router.get("/admin/{appointment_id}", response_model=AppointmentAdminOut)
def get_appointment_admin(
    appointment_id: str,
    current_user: User = Depends(require_super_admin),
    db: DBSession = Depends(get_db),
):
    """Get a single appointment for Super Admin with detailed names."""
    result = (
        db.query(Appointment, User, Patient)
        .join(User, Appointment.psychologist_id == User.id)
        .join(Patient, Appointment.patient_id == Patient.id)
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    apt, psych, patient = result
    return _build_admin_out(apt, psych, patient, db)


# ── Admin: Clinic appointments (Clinic Admin) ────────────────────────────────
@router.get("/clinic-all", response_model=List[AppointmentAdminOut])
def list_clinic_appointments(
    current_user: User = Depends(require_admin_or_above),
    db: DBSession = Depends(get_db),
):
    """List appointments for the admin's clinic."""
    if current_user.role == UserRole.super_admin:
        # Super admin sees everything
        results = (
            db.query(Appointment, User, Patient)
            .join(User, Appointment.psychologist_id == User.id)
            .join(Patient, Appointment.patient_id == Patient.id)
            .order_by(Appointment.appointment_date.desc())
            .all()
        )
    else:
        actual_clinic_id = current_user.clinic_id or current_user.id
        if not actual_clinic_id:
            raise HTTPException(status_code=400, detail="No clinic associated with your account")
        results = (
            db.query(Appointment, User, Patient)
            .join(User, Appointment.psychologist_id == User.id)
            .join(Patient, Appointment.patient_id == Patient.id)
            .filter(Appointment.clinic_id == actual_clinic_id)
            .order_by(Appointment.appointment_date.desc())
            .all()
        )
    return [_build_admin_out(apt, psych, patient, db) for apt, psych, patient in results]


@router.get("/clinic/{appointment_id}", response_model=AppointmentAdminOut)
def get_appointment_clinic(
    appointment_id: str,
    current_user: User = Depends(require_admin_or_above),
    db: DBSession = Depends(get_db),
):
    """Get a single appointment for Clinic Admin with detailed names."""
    actual_clinic_id = current_user.clinic_id or current_user.id
    
    q = (
        db.query(Appointment, User, Patient)
        .join(User, Appointment.psychologist_id == User.id)
        .join(Patient, Appointment.patient_id == Patient.id)
        .filter(Appointment.id == appointment_id)
    )
    
    if current_user.role != UserRole.super_admin:
        if not actual_clinic_id:
            raise HTTPException(status_code=400, detail="No clinic associated with your account")
        q = q.filter(Appointment.clinic_id == actual_clinic_id)

    result = q.first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Appointment not found or not in your clinic")
    
    apt, psych, patient = result
    return _build_admin_out(apt, psych, patient, db)


# ── Get by ID ─────────────────────────────────────────────────────────────────
@router.get("/{appointment_id}", response_model=AppointmentAdminOut)
def get_appointment(
    appointment_id: str,
    current_user: User = Depends(require_permission("appointments")),
    db: DBSession = Depends(get_db),
):
    """Get a single appointment by ID."""
    result = (
        db.query(Appointment, User, Patient)
        .join(User, Appointment.psychologist_id == User.id)
        .outerjoin(Patient, Appointment.patient_id == Patient.id)
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Appointment not found")

    apt, psych, patient = result

    # Authorization check
    if apt.psychologist_id != current_user.id:
        if current_user.role == UserRole.super_admin:
            pass
        elif current_user.role == UserRole.clinic_admin and apt.clinic_id == current_user.clinic_id:
            pass
        else:
            raise HTTPException(status_code=403, detail="Not authorized to view this appointment")

    return _build_admin_out(apt, psych, patient, db)


# ── Update ────────────────────────────────────────────────────────────────────
@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: str,
    req: AppointmentUpdate,
    current_user: User = Depends(require_permission("appointments")),
    db: DBSession = Depends(get_db),
):
    """Update an appointment. Owners, clinic admins, and super admins can edit."""
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Authorization: owner, clinic admin of same clinic, or super admin
    is_owner = apt.psychologist_id == current_user.id
    is_clinic_admin = (
        current_user.role == UserRole.clinic_admin
        and apt.clinic_id
        and apt.clinic_id == current_user.clinic_id
    )
    is_super_admin = current_user.role == UserRole.super_admin

    if not (is_owner or is_clinic_admin or is_super_admin):
        raise HTTPException(status_code=403, detail="Not authorized to edit this appointment")

    # Apply partial update
    update_data = req.model_dump(exclude_unset=True)
    if "status" in update_data:
        status_val = update_data["status"]
        if status_val not in [s.value for s in AppointmentStatus]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {[s.value for s in AppointmentStatus]}",
            )
        update_data["status"] = AppointmentStatus(status_val)

    for field, value in update_data.items():
        setattr(apt, field, value)

    db.commit()
    db.refresh(apt)
    return apt


# ── Delete ────────────────────────────────────────────────────────────────────
@router.delete("/{appointment_id}", status_code=204)
def delete_appointment(
    appointment_id: str,
    current_user: User = Depends(require_permission("appointments")),
    db: DBSession = Depends(get_db),
):
    """Delete an appointment. Owners, clinic admins, and super admins can delete."""
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    is_owner = apt.psychologist_id == current_user.id
    is_clinic_admin = (
        current_user.role == UserRole.clinic_admin
        and apt.clinic_id
        and apt.clinic_id == current_user.clinic_id
    )
    is_super_admin = current_user.role == UserRole.super_admin

    if not (is_owner or is_clinic_admin or is_super_admin):
        raise HTTPException(status_code=403, detail="Not authorized to delete this appointment")

    db.delete(apt)
    db.commit()
