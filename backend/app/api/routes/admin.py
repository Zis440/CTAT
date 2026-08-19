"""
Admin API router — /api/admin/*

Super-Admin-only endpoints for platform-wide user management.

Endpoints:
  GET    /api/admin/users            — List all platform users (paginated, filterable)
  GET    /api/admin/users/{user_id}  — Get a single user's full details
  PATCH  /api/admin/users/{user_id}  — Update a user's profile / role / status
  DELETE /api/admin/users/{user_id}  — Soft-delete (deactivate) a user
"""
from typing import Optional, List
from datetime import datetime, date, timedelta
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.user import User, UserRole, AccountType, VerificationStatus
from app.schemas.auth import UserOut
from app.auth.dependencies import require_super_admin
from app.auth.jwt_utils import hash_password
from app.models.wallet import Wallet, WalletTransaction, TransactionType
from app.models.patient import Patient
from app.models.audit_log import AuditLog
import uuid
import hashlib
import json

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class AdminCreateUserRequest(BaseModel):
    """Fields required to create a new user by super admin."""
    first_name: str
    last_name: Optional[str] = None
    email: EmailStr
    password: str
    phone: Optional[str] = None
    role: str
    clinic_name: Optional[str] = None
    clinic_id: Optional[str] = None
    role_type: Optional[str] = None

class AdminUpdateUserRequest(BaseModel):
    """Fields a super admin can update on any user."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    account_type: Optional[str] = None
    verification_status: Optional[str] = None
    is_active: Optional[bool] = None
    clinic_name: Optional[str] = None
    specialization: Optional[str] = None
    roc_number: Optional[str] = None
    can_assess: Optional[bool] = None


class PaginatedUsersResponse(BaseModel):
    users: List[UserOut]
    total: int
    page: int
    page_size: int


class AdminWalletTransactionOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    user_address: Optional[str] = None
    type: str
    amount_paise: int
    amount_rupees: float
    balance_after_paise: int
    balance_after_rupees: float
    description: str
    razorpay_payment_id: Optional[str] = None
    created_at: str


class PaginatedAdminTransactionsResponse(BaseModel):
    transactions: List[AdminWalletTransactionOut]
    total: int
    page: int
    page_size: int


class DailyIncomeOut(BaseModel):
    date: str
    amount_rupees: float


class AdminIncomeOverviewOut(BaseModel):
    total_revenue_rupees: float
    monthly_revenue_rupees: float
    weekly_revenue_rupees: float
    today_revenue_rupees: float
    daily_breakdown: List[DailyIncomeOut]
    recent_transactions: List[AdminWalletTransactionOut]


class AdminUpdatePatientRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    date_of_birth: Optional[date] = None
    email: Optional[str] = None
    background: Optional[str] = None
    environment: Optional[str] = None
    notes: Optional[str] = None


class AdminPatientOut(BaseModel):
    id: str
    user_id: str
    user_email: str
    provider_name: str
    clinic_id: Optional[str] = None
    patient_type: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    consent_given: bool
    background: Optional[str] = None
    environment: Optional[str] = None
    notes: Optional[str] = None
    total_sessions: int
    first_session_date: Optional[str] = None
    last_session_date: Optional[str] = None
    created_at: Optional[str] = None

class PaginatedAdminPatientsResponse(BaseModel):
    patients: List[AdminPatientOut]
    total: int
    page: int
    page_size: int

class AdminClinicOut(BaseModel):
    id: str
    admin_user_id: str
    clinic_name: str
    clinic_type: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    roc_number: Optional[str] = None
    verification_status: str
    is_active: bool
    created_at: str
    staff_count: int = 0
    patient_count: int = 0

class PaginatedAdminClinicsResponse(BaseModel):
    clinics: List[AdminClinicOut]
    total: int
    page: int
    page_size: int


class MonthlyGrowthOut(BaseModel):
    month: str
    users: int

class RecentUserOut(BaseModel):
    id: str
    name: str
    email: str
    account_type: str
    created_at: str

class AdminDashboardStatsOut(BaseModel):
    total_users: int
    active_users: int
    clinics: int
    individuals: int
    pending_verifications: int
    total_patients: int
    total_sessions: int
    monthly_growth: List[MonthlyGrowthOut]
    recent_users: List[RecentUserOut]

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/dashboard-stats", response_model=AdminDashboardStatsOut)
def get_dashboard_stats(
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    from app.models.user import User, AccountType, VerificationStatus, UserRole
    from app.models.patient import Patient, Session
    from sqlalchemy import extract, func
    import datetime
    
    base_user_query = db.query(User).filter(User.role != UserRole.super_admin)
    
    total_users = base_user_query.count()
    active_users = base_user_query.filter(User.is_active == True).count()
    
    clinics = base_user_query.filter(User.account_type == AccountType.clinic).count()
    individuals = base_user_query.filter(User.account_type == AccountType.individual).count()
    
    pending_verifications = base_user_query.filter(User.verification_status == VerificationStatus.pending).count()
    
    total_patients = db.query(Patient).count()
    total_sessions = db.query(Session).count()
    
    # Calculate monthly growth (new users per month for current year)
    current_year = datetime.datetime.now().year
    
    monthly_counts = (
        db.query(
            extract('month', User.created_at).label('month'),
            func.count(User.id).label('count')
        )
        .filter(User.role != UserRole.super_admin, extract('year', User.created_at) == current_year)
        .group_by(extract('month', User.created_at))
        .all()
    )
    
    month_names = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 
                   7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
                   
    growth_dict = {month_names[i]: 0 for i in range(1, 13)}
    
    for row in monthly_counts:
        month_idx = int(row.month) if row.month else None
        if month_idx and month_idx in month_names:
            growth_dict[month_names[month_idx]] = row.count
            
    monthly_growth = [{"month": k, "users": v} for k, v in growth_dict.items()]
    
    # Recent users
    recent_users_q = db.query(User).filter(User.role != UserRole.super_admin).order_by(User.created_at.desc()).limit(5).all()
    recent_users = [
        {
            "id": u.id,
            "name": f"{u.first_name} {u.last_name or ''}".strip() or "Unknown",
            "email": u.email,
            "account_type": str(u.account_type.value) if hasattr(u.account_type, 'value') else str(u.account_type),
            "created_at": u.created_at.isoformat() if u.created_at else ""
        } for u in recent_users_q
    ]
    
    return AdminDashboardStatsOut(
        total_users=total_users,
        active_users=active_users,
        clinics=clinics,
        individuals=individuals,
        pending_verifications=pending_verifications,
        total_patients=total_patients,
        total_sessions=total_sessions,
        monthly_growth=monthly_growth,
        recent_users=recent_users
    )


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    payload: AdminCreateUserRequest,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: Create a new user."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        user_role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")

    account_type = AccountType.individual if user_role == UserRole.individual_psychologist else AccountType.clinic

    clinic_id = payload.clinic_id
    if account_type == AccountType.clinic and not clinic_id:
        clinic_id = str(uuid.uuid4())

    can_assess = False
    if payload.role_type == "psychology_assessment" or user_role == UserRole.individual_psychologist:
        can_assess = True

    new_user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        role=user_role,
        account_type=account_type,
        clinic_id=clinic_id,
        clinic_name=payload.clinic_name if account_type == AccountType.clinic else None,
        verification_status=VerificationStatus.approved,
        can_assess=can_assess,
    )
    
    db.add(new_user)
    db.flush()
    
    wallet = Wallet(user_id=new_user.id)
    db.add(wallet)
    
    db.commit()
    db.refresh(new_user)
    
    return UserOut.model_validate(new_user)


@router.get("/users", response_model=PaginatedUsersResponse)
def list_all_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    clinic_id: Optional[str] = Query(None),
    account_type: Optional[str] = Query(None),
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """List all users with optional filters and pagination."""
    query = db.query(User).filter(User.id != admin.id)

    # ── Filters ──────────────────────────────────────────────────────────
    if search:
        like = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(like))
            | (User.last_name.ilike(like))
            | (User.email.ilike(like))
            | (User.clinic_name.ilike(like))
        )

    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            pass

    if verification_status:
        try:
            query = query.filter(
                User.verification_status == VerificationStatus(verification_status)
            )
        except ValueError:
            pass

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if clinic_id:
        query = query.filter(User.clinic_id == clinic_id)
        
    if account_type:
        try:
            from app.models.user import AccountType
            query = query.filter(User.account_type == AccountType(account_type))
        except ValueError:
            pass

    # ── Sorting & Pagination ─────────────────────────────────────────────
    total = query.count()
    users = (
        query
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedUsersResponse(
        users=[UserOut.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/users/{user_id}", response_model=UserOut)
def get_user_detail(
    user_id: str,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Get full details for a single user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: AdminUpdateUserRequest,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Update any editable fields on a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent de-activating yourself
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    updates = payload.model_dump(exclude_unset=True)

    if "role" in updates:
        try:
            updates["role"] = UserRole(updates["role"])
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {updates['role']}")

    if "account_type" in updates:
        try:
            updates["account_type"] = AccountType(updates["account_type"])
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid account_type: {updates['account_type']}",
            )

    if "verification_status" in updates:
        try:
            updates["verification_status"] = VerificationStatus(
                updates["verification_status"]
            )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid verification_status: {updates['verification_status']}",
            )

    for field, value in updates.items():
        if field == "can_assess":
            user.can_assess = value
            if user.module_permissions is None:
                user.module_permissions = {}
            user.module_permissions["assessments"] = value
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(user, "module_permissions")
        else:
            setattr(user, field, value)

    # If verification_status was updated, create an audit log
    if "verification_status" in updates:
        new_status = updates["verification_status"]
        if new_status in (VerificationStatus.approved, VerificationStatus.rejected):
            from datetime import datetime
            
            # When approved, enable can_assess for individual psychologists
            if new_status == VerificationStatus.approved and user.role == UserRole.individual_psychologist:
                user.can_assess = True

            action = f"verification_{new_status.value}"
            details = {
                "reason": "Super Admin action via dashboard",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Create a simple verifiable hash of the event
            hash_input = f"{admin.id}:{user.id}:{action}:{details['timestamp']}"
            signature_hash = hashlib.sha256(hash_input.encode()).hexdigest()
            
            audit_log = AuditLog(
                user_id=admin.id,
                target_user_id=user.id,
                action=action,
                details=details,
                signature_hash=signature_hash
            )
            db.add(audit_log)

    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    hard: bool = Query(False, description="If true, permanently delete user and all associated records from DB"),
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Soft-delete a user by deactivating their account, or hard-delete if requested."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    if hard:
        try:
            from sqlalchemy import text
            uid = user.id
            db.execute(text("DELETE FROM password_resets WHERE user_id = :uid"), {"uid": uid})
            db.execute(text("DELETE FROM anonymous_links WHERE org_id = :uid"), {"uid": uid})
            db.execute(text("DELETE FROM org_assessment_requests WHERE org_id = :uid OR assigned_psychologist_id = :uid"), {"uid": uid})
            db.execute(text("DELETE FROM verification_requests WHERE assigned_psychologist_id = :uid"), {"uid": uid})
            db.execute(text("DELETE FROM audit_logs WHERE user_id = :uid OR target_user_id = :uid"), {"uid": uid})
            db.execute(text("DELETE FROM appointments WHERE psychologist_id = :uid OR patient_id IN (SELECT id FROM patients WHERE user_id = :uid)"), {"uid": uid})
            db.execute(text("DELETE FROM support_messages WHERE sender_id = :uid OR ticket_id IN (SELECT id FROM support_tickets WHERE user_id = :uid)"), {"uid": uid})
            db.execute(text("DELETE FROM support_tickets WHERE user_id = :uid"), {"uid": uid})
            db.execute(text("DELETE FROM user_verification_documents WHERE user_id = :uid"), {"uid": uid})
            db.execute(text("UPDATE screening_reports SET verified_by_id = NULL WHERE verified_by_id = :uid"), {"uid": uid})
            # Patient cascade
            db.execute(text("UPDATE screening_reports SET patient_id = NULL WHERE patient_id IN (SELECT id FROM patients WHERE user_id = :uid)"), {"uid": uid})
            db.execute(text("UPDATE sessions SET assigned_psychologist_id = NULL WHERE assigned_psychologist_id = :uid"), {"uid": uid})
            db.execute(text("DELETE FROM sessions WHERE user_id = :uid OR patient_id IN (SELECT id FROM patients WHERE user_id = :uid)"), {"uid": uid})
            db.execute(text("DELETE FROM patients WHERE user_id = :uid"), {"uid": uid})
            
            # Wallet cascade
            db.execute(text("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = :uid) OR created_by_id = :uid"), {"uid": uid})
            db.execute(text("DELETE FROM wallets WHERE user_id = :uid"), {"uid": uid})
            
            # Profiles
            db.execute(text("DELETE FROM clinic_profiles WHERE clinic_id = :uid"), {"uid": uid})
            db.execute(text("DELETE FROM org_profiles WHERE org_id = :uid"), {"uid": uid})
            
            # Finally user
            db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})
            
            db.expunge(user)  # detach ORM object before committing the raw DELETE
            db.commit()
            return {"detail": f"User {user.email} and all associated data permanently deleted."}
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"DB error: {exc}")
    else:
        user.is_active = False
        db.commit()
        return {"detail": f"User {user.email} has been deactivated."}


@router.get("/income/overview", response_model=AdminIncomeOverviewOut)
def get_income_overview(
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: View platform-wide income overview."""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    start_of_month = datetime(now.year, now.month, 1)
    start_of_today = datetime(now.year, now.month, 1).replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Base query for credits (recharges)
    base_query = db.query(func.sum(WalletTransaction.amount_paise)).filter(
        WalletTransaction.type == TransactionType.credit
    )

    total_revenue_paise = base_query.scalar() or 0
    monthly_revenue_paise = base_query.filter(WalletTransaction.created_at >= start_of_month).scalar() or 0
    weekly_revenue_paise = base_query.filter(WalletTransaction.created_at >= seven_days_ago).scalar() or 0
    today_revenue_paise = base_query.filter(WalletTransaction.created_at >= start_of_today).scalar() or 0

    # Daily breakdown for charting
    daily_results = (
        db.query(
            func.date(WalletTransaction.created_at).label("date"),
            func.sum(WalletTransaction.amount_paise).label("total")
        )
        .filter(WalletTransaction.type == TransactionType.credit)
        .filter(WalletTransaction.created_at >= thirty_days_ago)
        .group_by(func.date(WalletTransaction.created_at))
        .order_by(func.date(WalletTransaction.created_at))
        .all()
    )

    daily_breakdown = [
        DailyIncomeOut(date=str(row.date), amount_rupees=(row.total or 0) / 100.0)
        for row in daily_results
    ]

    # Recent transactions
    recent_txs_raw = (
        db.query(WalletTransaction, User)
        .join(Wallet, Wallet.id == WalletTransaction.wallet_id)
        .join(User, User.id == Wallet.user_id)
        .filter(WalletTransaction.type == TransactionType.credit)
        .order_by(WalletTransaction.created_at.desc())
        .limit(5)
        .all()
    )
    
    recent_transactions = [
        AdminWalletTransactionOut(
            id=tx.id,
            user_id=user.id,
            user_name=f"{user.first_name} {user.last_name or ''}".strip(),
            user_email=user.email,
            user_address=user.address,
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

    return AdminIncomeOverviewOut(
        total_revenue_rupees=total_revenue_paise / 100.0,
        monthly_revenue_rupees=monthly_revenue_paise / 100.0,
        weekly_revenue_rupees=weekly_revenue_paise / 100.0,
        today_revenue_rupees=today_revenue_paise / 100.0,
        daily_breakdown=daily_breakdown,
        recent_transactions=recent_transactions,
    )


@router.get("/transactions", response_model=PaginatedAdminTransactionsResponse)
def list_all_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by user name or email"),
    type_filter: Optional[str] = Query(None, description="Filter by transaction type"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter"),
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: View all wallet transactions across the platform."""
    query = (
        db.query(WalletTransaction, User)
        .join(Wallet, Wallet.id == WalletTransaction.wallet_id)
        .join(User, User.id == Wallet.user_id)
    )

    if search:
        like = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(like))
            | (User.last_name.ilike(like))
            | (User.email.ilike(like))
        )
        
    if type_filter:
        query = query.filter(WalletTransaction.type == type_filter)
    if date_from:
        query = query.filter(WalletTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(WalletTransaction.created_at <= date_to)

    total = query.count()
    results = (
        query.order_by(WalletTransaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    transactions_out = []
    for tx, user in results:
        transactions_out.append(
            AdminWalletTransactionOut(
                id=tx.id,
                user_id=user.id,
                user_name=f"{user.first_name} {user.last_name or ''}".strip(),
                user_email=user.email,
                user_address=user.address,
                type=tx.type.value,
                amount_paise=tx.amount_paise,
                amount_rupees=tx.amount_paise / 100.0,
                balance_after_paise=tx.balance_after_paise,
                balance_after_rupees=tx.balance_after_paise / 100.0,
                description=tx.description,
                razorpay_payment_id=tx.razorpay_payment_id,
                created_at=tx.created_at.isoformat() if tx.created_at else "",
            )
        )

    return PaginatedAdminTransactionsResponse(
        transactions=transactions_out,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/patients", response_model=PaginatedAdminPatientsResponse)
def list_all_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name or email"),
    patient_type: Optional[str] = Query(None, description="Filter by patient_type (patient/candidate)"),
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: View all patients/candidates across the platform."""
    query = db.query(Patient, User).join(User, User.id == Patient.user_id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            (Patient.first_name.ilike(like))
            | (Patient.last_name.ilike(like))
            | (User.email.ilike(like))
        )
        
    if patient_type:
        from app.models.user import AccountType
        if patient_type == "candidate":
            query = query.filter(User.account_type == AccountType.organization)
        elif patient_type == "patient":
            query = query.filter(User.account_type != AccountType.organization)

    total = query.count()
    results = (
        query.order_by(Patient.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    patients_out = []
    for patient, user in results:
        patients_out.append(
            AdminPatientOut(
                id=patient.id,
                user_id=user.id,
                user_email=user.email,
                provider_name=user.clinic_name if user.clinic_name else f"{user.first_name} {user.last_name or ''}".strip(),
                clinic_id=patient.clinic_id,
                patient_type=patient.patient_type,
                first_name=patient.first_name,
                last_name=patient.last_name,
                email=patient.email,
                phone_number=patient.phone_number,
                date_of_birth=patient.date_of_birth,
                age=patient.computed_age,
                gender=patient.gender,
                consent_given=patient.consent_given,
                background=patient.background,
                environment=patient.environment,
                notes=patient.notes,
                total_sessions=patient.total_sessions,
                first_session_date=patient.first_session_date.isoformat() if patient.first_session_date else None,
                last_session_date=patient.last_session_date.isoformat() if patient.last_session_date else None,
                created_at=patient.created_at.isoformat() if patient.created_at else None,
            )
        )

    return PaginatedAdminPatientsResponse(
        patients=patients_out,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/clinics", response_model=PaginatedAdminClinicsResponse)
def list_all_clinics(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by clinic name or email"),
    verification_status: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    clinic_type: Optional[str] = Query(None),
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: View all clinics across the platform."""
    # A clinic is essentially a User with role=clinic_admin and account_type=clinic
    from app.models.user import UserRole, AccountType, VerificationStatus
    
    query = db.query(User).filter(User.role == UserRole.clinic_admin, User.account_type == AccountType.clinic)

    if search:
        like = f"%{search}%"
        query = query.filter(
            (User.clinic_name.ilike(like))
            | (User.email.ilike(like))
            | (User.first_name.ilike(like))
        )

    if verification_status:
        try:
            query = query.filter(User.verification_status == VerificationStatus(verification_status))
        except ValueError:
            pass

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if clinic_type:
        query = query.filter(User.clinic_type == clinic_type)

    total = query.count()
    results = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    clinics_out = []
    for user in results:
        # Calculate staff count for this clinic (excluding the clinic_admin themselves, or including them if we just count all with this clinic_id)
        staff_count = db.query(User).filter(User.clinic_id == user.clinic_id, User.id != user.id).count() if user.clinic_id else 0
        
        # Calculate patient count for this clinic
        patient_count = db.query(Patient).filter(Patient.clinic_id == user.clinic_id).count() if user.clinic_id else 0

        clinics_out.append(
            AdminClinicOut(
                id=user.clinic_id or user.id,
                admin_user_id=user.id,
                clinic_name=user.clinic_name or f"{user.first_name} {user.last_name or ''}".strip(),
                clinic_type=user.clinic_type,
                email=user.email,
                phone=user.phone,
                address=user.address,
                roc_number=user.roc_number,
                verification_status=user.verification_status.value if hasattr(user.verification_status, 'value') else str(user.verification_status),
                is_active=user.is_active,
                created_at=user.created_at.isoformat() if user.created_at else "",
                staff_count=staff_count,
                patient_count=patient_count
            )
        )

    return PaginatedAdminClinicsResponse(
        clinics=clinics_out,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/clinics/{clinic_id}", response_model=AdminClinicOut)
def get_admin_clinic(
    clinic_id: str,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: Get clinic overview."""
    from app.models.user import UserRole, AccountType

    # Find the clinic admin user to serve as the clinic's core info
    user = db.query(User).filter(
        (User.clinic_id == clinic_id) | (User.id == clinic_id),
        User.role == UserRole.clinic_admin,
        User.account_type == AccountType.clinic
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Clinic not found")

    staff_count = db.query(User).filter(User.clinic_id == user.clinic_id, User.id != user.id).count() if user.clinic_id else 0
    patient_count = db.query(Patient).filter(Patient.clinic_id == user.clinic_id).count() if user.clinic_id else 0

    return AdminClinicOut(
        id=user.clinic_id or user.id,
        admin_user_id=user.id,
        clinic_name=user.clinic_name or f"{user.first_name} {user.last_name or ''}".strip(),
        clinic_type=user.clinic_type,
        email=user.email,
        phone=user.phone,
        address=user.address,
        roc_number=user.roc_number,
        verification_status=user.verification_status.value if hasattr(user.verification_status, 'value') else str(user.verification_status),
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else "",
        staff_count=staff_count,
        patient_count=patient_count
    )

@router.get("/organizations/{org_id}", response_model=AdminClinicOut)
def get_admin_organization(
    org_id: str,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: Get organization overview."""
    from app.models.user import UserRole, AccountType

    user = db.query(User).filter(
        (User.clinic_id == org_id) | (User.id == org_id),
        User.role == UserRole.org_admin,
        User.account_type == AccountType.organization
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Organization not found")

    staff_count = db.query(User).filter(User.clinic_id == user.clinic_id, User.id != user.id).count() if user.clinic_id else 0
    patient_count = db.query(Patient).filter(Patient.clinic_id == user.clinic_id).count() if user.clinic_id else 0

    return AdminClinicOut(
        id=user.clinic_id or user.id,
        admin_user_id=user.id,
        clinic_name=user.clinic_name or f"{user.first_name} {user.last_name or ''}".strip(),
        clinic_type=user.clinic_type,
        email=user.email,
        phone=user.phone,
        address=user.address,
        roc_number=user.roc_number,
        verification_status=user.verification_status.value if hasattr(user.verification_status, 'value') else str(user.verification_status),
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else "",
        staff_count=staff_count,
        patient_count=patient_count
    )


@router.get("/patients/{patient_id}", response_model=AdminPatientOut)
def get_admin_patient(
    patient_id: str,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: Get full details for a single patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    user = db.query(User).filter(User.id == patient.user_id).first()
    
    return AdminPatientOut(
        id=patient.id,
        user_id=user.id if user else patient.user_id,
        user_email=user.email if user else "",
        provider_name=user.clinic_name if user and user.clinic_name else (f"{user.first_name} {user.last_name or ''}".strip() if user else "Unknown"),
        clinic_id=patient.clinic_id,
        patient_type=patient.patient_type,
        first_name=patient.first_name,
        last_name=patient.last_name,
        email=patient.email,
        phone_number=patient.phone_number,
        date_of_birth=patient.date_of_birth,
        age=patient.computed_age,
        gender=patient.gender,
        consent_given=patient.consent_given,
        background=patient.background,
        environment=patient.environment,
        notes=patient.notes,
        total_sessions=patient.total_sessions,
        first_session_date=patient.first_session_date.isoformat() if patient.first_session_date else None,
        last_session_date=patient.last_session_date.isoformat() if patient.last_session_date else None,
        created_at=patient.created_at.isoformat() if patient.created_at else None,
    )


@router.put("/patients/{patient_id}", response_model=AdminPatientOut)
def update_admin_patient(
    patient_id: str,
    req: AdminUpdatePatientRequest,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: Update a patient's details."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    if "date_of_birth" in update_data and patient.date_of_birth:
        today = date.today()
        patient.age = (
            today.year - patient.date_of_birth.year
            - ((today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day))
        )

    db.commit()
    db.refresh(patient)
    
    from app.services.audit_service import audit_service
    audit_service.log_activity(
        db=db,
        user_id=admin.id,
        org_id=None,
        target_user_id=patient.user_id,
        action="CANDIDATE_UPDATED",
        details={"patient_id": patient_id, "updated_fields": list(update_data.keys())}
    )
    
    user = db.query(User).filter(User.id == patient.user_id).first()

    return AdminPatientOut(
        id=patient.id,
        user_id=user.id if user else patient.user_id,
        user_email=user.email if user else "",
        provider_name=user.clinic_name if user and user.clinic_name else (f"{user.first_name} {user.last_name or ''}".strip() if user else "Unknown"),
        clinic_id=patient.clinic_id,
        patient_type=patient.patient_type,
        first_name=patient.first_name,
        last_name=patient.last_name,
        email=patient.email,
        phone_number=patient.phone_number,
        date_of_birth=patient.date_of_birth,
        age=patient.computed_age,
        gender=patient.gender,
        consent_given=patient.consent_given,
        background=patient.background,
        environment=patient.environment,
        notes=patient.notes,
        total_sessions=patient.total_sessions,
        first_session_date=patient.first_session_date.isoformat() if patient.first_session_date else None,
        last_session_date=patient.last_session_date.isoformat() if patient.last_session_date else None,
        created_at=patient.created_at.isoformat() if patient.created_at else None,
    )


@router.delete("/patients/{patient_id}")
def delete_admin_patient(
    patient_id: str,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: Delete a patient record."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    patient_user_id = patient.user_id
    db.delete(patient)
    db.commit()
    
    from app.services.audit_service import audit_service
    audit_service.log_activity(
        db=db,
        user_id=admin.id,
        org_id=None,
        target_user_id=patient_user_id,
        action="CANDIDATE_DELETED",
        details={"patient_id": patient_id}
    )
    
    return {"status": "deleted", "patient_id": patient_id}


# ── Password Resets ──────────────────────────────────────────────────────────

from app.models.password_reset import PasswordResetRequest

class AdminPasswordResetOut(BaseModel):
    id: str
    user_id: str
    email: str
    status: str
    created_at: str
    expires_at: Optional[str] = None

class PaginatedPasswordResetsResponse(BaseModel):
    requests: List[AdminPasswordResetOut]
    total: int
    page: int
    page_size: int

@router.get("/password-resets", response_model=PaginatedPasswordResetsResponse)
def list_password_resets(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: View all password reset requests."""
    query = db.query(PasswordResetRequest)

    if status:
        query = query.filter(PasswordResetRequest.status == status)

    total = query.count()
    results = (
        query.order_by(PasswordResetRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    requests_out = [
        AdminPasswordResetOut(
            id=r.id,
            user_id=r.user_id,
            email=r.email,
            status=r.status.value,
            created_at=r.created_at.isoformat() if r.created_at else "",
            expires_at=r.expires_at.isoformat() if r.expires_at else None,
        )
        for r in results
    ]

    return PaginatedPasswordResetsResponse(
        requests=requests_out,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/anonymous-links")
def list_all_anonymous_links(
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: View all anonymous links across the platform."""
    from app.models.anonymous_link import AnonymousLink
    from app.models.assessment import Assessment
    
    links = db.query(AnonymousLink, Assessment.name.label("assessment_name"), User)\
              .outerjoin(Assessment, AnonymousLink.assessment_id == Assessment.id)\
              .outerjoin(User, AnonymousLink.org_id == User.id)\
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
            "creator_clinic": link[2].clinic_name if link[2] and link[2].clinic_name else "Individual",
        }
        for link in links
    ]

@router.get("/organizations", response_model=PaginatedAdminClinicsResponse)
def list_all_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by org name or email"),
    verification_status: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super Admin: View all organizations across the platform."""
    from app.models.user import UserRole, AccountType, VerificationStatus
    
    query = db.query(User).filter(User.role == UserRole.org_admin, User.account_type == AccountType.organization)

    if search:
        like = f"%{search}%"
        query = query.filter(
            (User.clinic_name.ilike(like))
            | (User.email.ilike(like))
            | (User.first_name.ilike(like))
        )

    if verification_status:
        try:
            query = query.filter(User.verification_status == VerificationStatus(verification_status))
        except ValueError:
            pass

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    results = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    orgs_out = []
    for user in results:
        staff_count = db.query(User).filter(User.clinic_id == user.clinic_id, User.id != user.id).count() if user.clinic_id else 0
        patient_count = db.query(Patient).filter(Patient.clinic_id == user.clinic_id).count() if user.clinic_id else 0

        orgs_out.append(
            AdminClinicOut(
                id=user.clinic_id or user.id,
                admin_user_id=user.id,
                clinic_name=user.clinic_name or f"{user.first_name} {user.last_name or ''}".strip(),
                clinic_type=user.clinic_type,
                email=user.email,
                phone=user.phone,
                address=user.address,
                roc_number=user.roc_number,
                verification_status=user.verification_status.value if hasattr(user.verification_status, 'value') else str(user.verification_status),
                is_active=user.is_active,
                created_at=user.created_at.isoformat() if user.created_at else "",
                staff_count=staff_count,
                patient_count=patient_count
            )
        )

    return PaginatedAdminClinicsResponse(
        clinics=orgs_out,
        total=total,
        page=page,
        page_size=page_size,
    )
