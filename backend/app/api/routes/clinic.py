from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from datetime import datetime, timedelta
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db, DATA_STORE_DIR
from app.models.user import User
from app.models.patient import Patient, Session as app_models_session
from app.models.wallet import Wallet, WalletTransaction, TransactionType
from app.models.clinic import ClinicProfile
from app.auth.dependencies import require_admin_or_above
from app.schemas.clinic import ClinicProfileOut, ClinicProfileUpdate
import shutil
from pathlib import Path
from fastapi import UploadFile, File
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/clinic", tags=["clinic"])

class MonthlyGrowthOut(BaseModel):
    month: str
    patients: int

class AssessmentUseOut(BaseModel):
    name: str
    value: int
    color: str

class UpcomingAppointmentOut(BaseModel):
    id: str
    patient_name: str
    psychologist_name: str
    date: str
    time: str

class RecentTransactionOut(BaseModel):
    id: str
    user_name: str
    type: str
    amount_rupees: float
    created_at: str

class ClinicDashboardStatsOut(BaseModel):
    total_staff: int
    total_sessions: int
    total_patients: int
    wallet_balance_paise: int
    monthly_growth: List[MonthlyGrowthOut]
    assessment_uses: List[AssessmentUseOut]
    upcoming_appointments: List[UpcomingAppointmentOut]
    recent_transactions: List[RecentTransactionOut]

@router.get("/stats", response_model=ClinicDashboardStatsOut)
def get_clinic_stats(
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    """Clinic Admin Dashboard Stats."""
    actual_clinic_id = current_user.clinic_id or current_user.id
    if not actual_clinic_id:
        raise HTTPException(status_code=400, detail="No clinic associated with this account")

    from app.models.user import UserRole
    from app.models.appointment import Appointment
    from app.models.org_request import OrgAssessmentRequest
    from sqlalchemy import extract

    total_staff = db.query(User).filter(User.clinic_id == actual_clinic_id, User.role.in_([UserRole.clinic_staff, UserRole.org_staff])).count()

    org_patient_ids = db.query(OrgAssessmentRequest.patient_id).filter(OrgAssessmentRequest.org_id == actual_clinic_id)
    total_patients = db.query(Patient).filter(
        (Patient.clinic_id == actual_clinic_id) | (Patient.id.in_(org_patient_ids))
    ).count()

    clinic_user_ids = [
        uid for (uid,) in
        db.query(User.id).filter(User.clinic_id == actual_clinic_id).all()
    ]

    wallet = db.query(Wallet).filter(Wallet.user_id == actual_clinic_id).first()
    wallet_balance_paise = wallet.balance_paise if wallet else 0

    total_sessions = db.query(app_models_session).filter(
        (app_models_session.user_id.in_(clinic_user_ids)) | (app_models_session.patient_id.in_(org_patient_ids))
    ).count()

    current_year = datetime.now().year
    monthly_counts = (
        db.query(
            extract('month', Patient.created_at).label('month'),
            func.count(Patient.id).label('count')
        )
        .filter(
            (Patient.clinic_id == actual_clinic_id) | (Patient.id.in_(org_patient_ids)),
            extract('year', Patient.created_at) == current_year
        )
        .group_by(extract('month', Patient.created_at))
        .all()
    )
    month_names = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
                   7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
    growth_dict = {month_names[i]: 0 for i in range(1, 13)}
    for row in monthly_counts:
        month_idx = int(row.month) if row.month else None
        if month_idx and month_idx in month_names:
            growth_dict[month_names[month_idx]] = row.count
    monthly_growth = [{"month": k, "patients": v} for k, v in growth_dict.items()]

    assessment_uses = []
    if total_sessions > 0:

        assessment_uses = [
            {"name": "Narrative Intelligence", "value": total_sessions, "color": "#d3e392"}
        ]

    now = datetime.now()
    appointments = (
        db.query(Appointment, Patient, User)
        .join(Patient, Patient.id == Appointment.patient_id)
        .join(User, User.id == Appointment.psychologist_id)
        .filter(
            Appointment.psychologist_id.in_(clinic_user_ids),
            Appointment.appointment_date >= now.date(),
            Appointment.status == "scheduled"
        )
        .order_by(Appointment.appointment_date.asc(), Appointment.start_time.asc())
        .limit(5)
        .all()
    )
    upcoming_appointments = [
        UpcomingAppointmentOut(
            id=appt.id,
            patient_name=f"{pat.first_name} {pat.last_name or ''}".strip(),
            psychologist_name=f"Dr. {usr.first_name} {usr.last_name or ''}".strip(),
            date=appt.appointment_date.isoformat() if appt.appointment_date else "",
            time=str(appt.start_time)
        )
        for appt, pat, usr in appointments
    ]

    clinic_wallet_ids = [
        wid for (wid,) in
        db.query(Wallet.id).filter(Wallet.user_id.in_(clinic_user_ids)).all()
    ]
    recent_txs = []
    if clinic_wallet_ids:
        txs = (
            db.query(WalletTransaction, User)
            .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
            .join(User, Wallet.user_id == User.id)
            .filter(WalletTransaction.wallet_id.in_(clinic_wallet_ids))
            .order_by(WalletTransaction.created_at.desc())
            .limit(5)
            .all()
        )
        recent_txs = [
            RecentTransactionOut(
                id=tx.id,
                user_name=f"{usr.first_name} {usr.last_name or ''}".strip(),
                type=tx.type.value,
                amount_rupees=tx.amount_paise / 100.0,
                created_at=tx.created_at.isoformat() if tx.created_at else ""
            )
            for tx, usr in txs
        ]

    return ClinicDashboardStatsOut(
        total_staff=total_staff,
        total_sessions=total_sessions,
        total_patients=total_patients,
        wallet_balance_paise=wallet_balance_paise,
        monthly_growth=monthly_growth,
        assessment_uses=assessment_uses,
        upcoming_appointments=upcoming_appointments,
        recent_transactions=recent_txs
    )

class ClinicWalletTransactionOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    type: str
    amount_paise: int
    amount_rupees: float
    balance_after_paise: int
    balance_after_rupees: float
    description: str
    razorpay_payment_id: Optional[str] = None
    created_at: str

class ClinicDailyIncomeOut(BaseModel):
    date: str
    amount_rupees: float

class ClinicIncomeOverviewOut(BaseModel):
    total_revenue_rupees: float
    monthly_revenue_rupees: float
    weekly_revenue_rupees: float
    today_revenue_rupees: float
    daily_breakdown: List[ClinicDailyIncomeOut]
    recent_transactions: List[ClinicWalletTransactionOut]

@router.get("/income/overview", response_model=ClinicIncomeOverviewOut)
def get_clinic_income_overview(
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    """Clinic Admin: View clinic-specific income (recharge) overview."""
    clinic_user_ids = [
        uid for (uid,) in
        db.query(User.id).filter(User.clinic_id == current_user.clinic_id).all()
    ]

    clinic_wallet_ids = [
        wid for (wid,) in
        db.query(Wallet.id).filter(Wallet.user_id.in_(clinic_user_ids)).all()
    ]

    if not clinic_wallet_ids:
        return ClinicIncomeOverviewOut(
            total_revenue_rupees=0,
            monthly_revenue_rupees=0,
            weekly_revenue_rupees=0,
            today_revenue_rupees=0,
            daily_breakdown=[],
            recent_transactions=[]
        )

    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    start_of_month = datetime(now.year, now.month, 1)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    base_query = db.query(func.sum(WalletTransaction.amount_paise)).filter(
        WalletTransaction.wallet_id.in_(clinic_wallet_ids),
        WalletTransaction.type == TransactionType.credit
    )

    total_revenue_paise = base_query.scalar() or 0
    monthly_revenue_paise = base_query.filter(WalletTransaction.created_at >= start_of_month).scalar() or 0
    weekly_revenue_paise = base_query.filter(WalletTransaction.created_at >= seven_days_ago).scalar() or 0
    today_revenue_paise = base_query.filter(WalletTransaction.created_at >= start_of_today).scalar() or 0

    daily_results = (
        db.query(
            func.date(WalletTransaction.created_at).label("date"),
            func.sum(WalletTransaction.amount_paise).label("total")
        )
        .filter(
            WalletTransaction.wallet_id.in_(clinic_wallet_ids),
            WalletTransaction.type == TransactionType.credit,
            WalletTransaction.created_at >= thirty_days_ago
        )
        .group_by(func.date(WalletTransaction.created_at))
        .order_by(func.date(WalletTransaction.created_at))
        .all()
    )

    daily_breakdown = [
        ClinicDailyIncomeOut(date=str(row.date), amount_rupees=(row.total or 0) / 100.0)
        for row in daily_results
    ]

    recent_txs_raw = (
        db.query(WalletTransaction, User)
        .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
        .join(User, Wallet.user_id == User.id)
        .filter(
            WalletTransaction.wallet_id.in_(clinic_wallet_ids),
            WalletTransaction.type == TransactionType.credit
        )
        .order_by(WalletTransaction.created_at.desc())
        .limit(5)
        .all()
    )

    recent_transactions = [
        ClinicWalletTransactionOut(
            id=tx.id,
            user_id=user.id,
            user_name=f"{user.first_name} {user.last_name or ''}".strip(),
            user_email=user.email,
            type=tx.type.value,
            amount_paise=tx.amount_paise,
            amount_rupees=tx.amount_paise / 100.0,
            balance_after_paise=tx.balance_after_paise,
            balance_after_rupees=tx.balance_after_paise / 100.0,
            description=tx.description,
            razorpay_payment_id=tx.razorpay_payment_id,
            created_at=tx.created_at.isoformat() if tx.created_at else "",
        )
        for tx, user in recent_txs_raw
    ]

    return ClinicIncomeOverviewOut(
        total_revenue_rupees=total_revenue_paise / 100.0,
        monthly_revenue_rupees=monthly_revenue_paise / 100.0,
        weekly_revenue_rupees=weekly_revenue_paise / 100.0,
        today_revenue_rupees=today_revenue_paise / 100.0,
        daily_breakdown=daily_breakdown,
        recent_transactions=recent_transactions,
    )

CLINIC_LOGOS_DIR = DATA_STORE_DIR / "uploads" / "clinic_logos"
CLINIC_COVERS_DIR = DATA_STORE_DIR / "uploads" / "clinic_covers"
CLINIC_LOGOS_DIR.mkdir(parents=True, exist_ok=True)
CLINIC_COVERS_DIR.mkdir(parents=True, exist_ok=True)

def _get_or_create_profile(db: Session, actual_clinic_id: str, current_user: User) -> ClinicProfile:
    profile = db.query(ClinicProfile).filter(ClinicProfile.clinic_id == actual_clinic_id).first()
    if not profile:
        profile = ClinicProfile(
            clinic_id=actual_clinic_id,
            clinic_name=current_user.clinic_name,
            contact_email=current_user.email
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

def _profile_to_out(profile: ClinicProfile) -> ClinicProfileOut:
    out = ClinicProfileOut.model_validate(profile)
    if out.logo_path:
        out.logo_url = f"/api/clinic/profile/logo/{profile.clinic_id}"
    if out.cover_path:
        out.cover_url = f"/api/clinic/profile/cover/{profile.clinic_id}"
    return out

@router.get("/profile", response_model=ClinicProfileOut)
def get_clinic_profile(
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    actual_clinic_id = current_user.clinic_id or current_user.id
    profile = _get_or_create_profile(db, actual_clinic_id, current_user)

    needs_update = False
    if not profile.clinic_name and current_user.clinic_name:
        profile.clinic_name = current_user.clinic_name
        needs_update = True
    if not profile.contact_email and current_user.email:
        profile.contact_email = current_user.email
        needs_update = True

    if needs_update:
        db.commit()
        db.refresh(profile)

    return _profile_to_out(profile)

@router.put("/profile", response_model=ClinicProfileOut)
def update_clinic_profile(
    req: ClinicProfileUpdate,
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    actual_clinic_id = current_user.clinic_id or current_user.id
    profile = _get_or_create_profile(db, actual_clinic_id, current_user)

    if req.clinic_name is not None:
        profile.clinic_name = req.clinic_name
    if req.tagline is not None:
        profile.tagline = req.tagline
    if req.contact_email is not None:
        profile.contact_email = req.contact_email
    if req.support_phone is not None:
        profile.support_phone = req.support_phone

    db.commit()
    db.refresh(profile)

    if req.clinic_name is not None:
        db.query(User).filter(User.clinic_id == actual_clinic_id).update({"clinic_name": req.clinic_name})
        db.commit()

    return _profile_to_out(profile)

@router.post("/profile/logo", response_model=ClinicProfileOut)
def upload_clinic_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    actual_clinic_id = current_user.clinic_id or current_user.id
    profile = _get_or_create_profile(db, actual_clinic_id, current_user)

    allowed_types = {"image/jpeg", "image/png", "image/jpg", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Invalid image type")

    ext_map = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/svg+xml": ".svg"}
    ext = ext_map.get(file.content_type, ".jpg")
    filename = f"{actual_clinic_id}{ext}"
    dest = CLINIC_LOGOS_DIR / filename

    for old in CLINIC_LOGOS_DIR.glob(f"{actual_clinic_id}.*"):
        old.unlink(missing_ok=True)

    contents = file.file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds the 5MB size limit.")

    with dest.open("wb") as f:
        f.write(contents)

    profile.logo_path = f"uploads/clinic_logos/{filename}"
    db.commit()
    db.refresh(profile)
    return _profile_to_out(profile)

@router.post("/profile/cover", response_model=ClinicProfileOut)
def upload_clinic_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    actual_clinic_id = current_user.clinic_id or current_user.id
    profile = _get_or_create_profile(db, actual_clinic_id, current_user)

    allowed_types = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Invalid image type")

    ext_map = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    ext = ext_map.get(file.content_type, ".jpg")
    filename = f"{actual_clinic_id}{ext}"
    dest = CLINIC_COVERS_DIR / filename

    for old in CLINIC_COVERS_DIR.glob(f"{actual_clinic_id}.*"):
        old.unlink(missing_ok=True)

    contents = file.file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds the 5MB size limit.")

    with dest.open("wb") as f:
        f.write(contents)

    profile.cover_path = f"uploads/clinic_covers/{filename}"
    db.commit()
    db.refresh(profile)
    return _profile_to_out(profile)

@router.get("/profile/logo/{clinic_id}")
def serve_clinic_logo(clinic_id: str):
    safe_id = Path(clinic_id).name
    for ext in (".jpg", ".png", ".webp", ".svg"):
        path = CLINIC_LOGOS_DIR / f"{safe_id}{ext}"
        if path.exists():
            media_types = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml"}
            return FileResponse(path, media_type=media_types[ext])
    raise HTTPException(status_code=404, detail="Logo not found")

@router.get("/profile/cover/{clinic_id}")
def serve_clinic_cover(clinic_id: str):
    safe_id = Path(clinic_id).name
    for ext in (".jpg", ".png", ".webp"):
        path = CLINIC_COVERS_DIR / f"{safe_id}{ext}"
        if path.exists():
            media_types = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
            return FileResponse(path, media_type=media_types[ext])
    raise HTTPException(status_code=404, detail="Cover not found")
