"""
Wallet API router — /api/wallet/*

Endpoints:
  GET  /api/wallet/balance          — Current balance for authenticated user
  GET  /api/wallet/transactions     — Transaction history (paginated)
  POST /api/wallet/recharge/create-order  — Create a Razorpay order
  POST /api/wallet/recharge/verify        — Verify payment + credit wallet
  POST /api/wallet/deduct           — Internal: deduct balance for a test (called server-side)
"""
import hmac
import hashlib
import os
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole, AccountType
from app.auth.dependencies import get_current_user, require_permission
from app.models.wallet import Wallet, WalletTransaction, TransactionType
from app.models.assessment import Assessment
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

class TransactionOut(BaseModel):
    id: str
    type: str
    amount_paise: int
    amount_rupees: float
    balance_after_paise: int
    balance_after_rupees: float
    description: str
    razorpay_payment_id: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}

class BalanceOut(BaseModel):
    balance_paise: int
    balance_rupees: float
    currency: str

class CreateOrderRequest(BaseModel):
    amount_rupees: float

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    amount_rupees: float

class DeductRequest(BaseModel):
    amount_paise: int
    description: str

def _get_target_user_id(current_user: User, db: Session) -> str:
    """Resolve the actual wallet owner. For clinic staff, this is the clinic admin. For org staff, this is the org admin."""
    if current_user.role in (UserRole.clinic_staff, UserRole.org_staff) and current_user.clinic_id:
        admin_role = UserRole.org_admin if current_user.role == UserRole.org_staff else UserRole.clinic_admin
        admin = db.query(User).filter(
            User.clinic_id == current_user.clinic_id,
            User.role == admin_role
        ).first()
        if admin:
            return admin.id
    return current_user.id

def _get_wallet(user_id: str, db: Session, *, lock: bool = False) -> Wallet:
    query = db.query(Wallet).filter(Wallet.user_id == user_id)
    if lock:
        query = query.with_for_update()
    wallet = query.first()
    if not wallet:

        wallet = Wallet(user_id=user_id)
        db.add(wallet)
        db.flush()
    return wallet

def _record_transaction(
    wallet: Wallet,
    tx_type: TransactionType,
    amount_paise: int,
    description: str,
    db: Session,
    razorpay_order_id: Optional[str] = None,
    razorpay_payment_id: Optional[str] = None,
    created_by_id: Optional[str] = None,
) -> WalletTransaction:
    tx = WalletTransaction(
        wallet_id=wallet.id,
        type=tx_type,
        amount_paise=amount_paise,
        balance_after_paise=wallet.balance_paise,
        description=description,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        created_by_id=created_by_id,
    )
    db.add(tx)
    return tx

def get_assessment_price(user: User, assessment_name: str, db: Session) -> int:
    """Returns the price in paise for the given assessment based on user account type."""
    assessment_row = db.query(Assessment).filter(Assessment.name == assessment_name).first()
    is_individual = user.account_type == AccountType.individual
    is_org = user.account_type == AccountType.organization
    if assessment_row:
        if is_individual:
            return int(assessment_row.psychologist_price * 100) if assessment_row.psychologist_price else 3000
        elif is_org:
            return int(assessment_row.org_price * 100) if assessment_row.org_price else 2000
        else:
            return int(assessment_row.clinic_price * 100) if assessment_row.clinic_price else 2000
    return 3000 if is_individual else 2000

@router.get("/balance", response_model=BalanceOut)
def get_balance(
    current_user: User = Depends(require_permission("can_view_wallet_history")),
    db: Session = Depends(get_db),
):
    target_user_id = _get_target_user_id(current_user, db)
    wallet = _get_wallet(target_user_id, db)
    return BalanceOut(
        balance_paise=wallet.balance_paise,
        balance_rupees=wallet.balance_paise / 100.0,
        currency=wallet.currency,
    )

from app.models.patient import Patient
import re

@router.get("/transactions")
def get_transactions(
    limit: int = 20,
    offset: int = 0,
    type_filter: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    created_by_me: Optional[bool] = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_user_id = _get_target_user_id(current_user, db)
    wallet = _get_wallet(target_user_id, db)

    query = db.query(WalletTransaction, User.first_name, User.last_name)\
        .outerjoin(User, WalletTransaction.created_by_id == User.id)\
        .filter(WalletTransaction.wallet_id == wallet.id)

    if current_user.role in (UserRole.clinic_staff, UserRole.org_staff):
        perms = current_user.module_permissions or {}
        if created_by_me or not perms.get("can_view_wallet_history", False):
            query = query.filter(WalletTransaction.created_by_id == current_user.id)

    if type_filter:
        query = query.filter(WalletTransaction.type == type_filter)
    if date_from:
        query = query.filter(WalletTransaction.created_at >= date_from)
    if date_to:
        query = query.filter(WalletTransaction.created_at <= date_to)

    total = query.count()

    txs = (
        query.order_by(WalletTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    pat_ids = set()
    pat_pattern = re.compile(r"PAT_[A-Z0-9]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
    for tx, _, _ in txs:
        if tx.description:
            pat_ids.update(pat_pattern.findall(tx.description))

    pat_name_map = {}
    if pat_ids:
        patients = db.query(Patient.id, Patient.first_name, Patient.last_name).filter(Patient.id.in_(pat_ids)).all()
        for p_id, p_first, p_last in patients:
            parts = [p_first, p_last]
            name = " ".join([p for p in parts if p]).strip()
            if name:
                pat_name_map[p_id] = name

    transactions_out = []
    for tx, first_name, last_name in txs:
        desc = tx.description
        if desc:
            for p_id in pat_pattern.findall(desc):
                if p_id in pat_name_map:
                    desc = desc.replace(p_id, pat_name_map[p_id])

        transactions_out.append({
            "id": tx.id,
            "type": tx.type.value,
            "amount_paise": tx.amount_paise,
            "amount_rupees": tx.amount_paise / 100.0,
            "balance_after_paise": tx.balance_after_paise,
            "balance_after_rupees": tx.balance_after_paise / 100.0,
            "description": desc,
            "razorpay_payment_id": tx.razorpay_payment_id,
            "created_by_name": f"{first_name or ''} {last_name or ''}".strip() if first_name else None,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        })

    return {
        "total": total,
        "transactions": transactions_out,
    }

@router.post("/recharge/create-order")
def create_recharge_order(
    req: CreateOrderRequest,
    current_user: User = Depends(require_permission("can_recharge")),
):
    """
    Create a Razorpay order for wallet recharge.

    Flow:
      1. Frontend calls this endpoint with the desired amount.
      2. This endpoint calls Razorpay to create an order and returns order_id + key_id.
      3. Frontend opens the Razorpay checkout modal with these details.
      4. User completes payment inside Razorpay modal.
      5. Frontend calls /recharge/verify with the payment IDs to credit the wallet.

    Razorpay setup:
      - Sign up at https://razorpay.com/
      - Get Key ID and Key Secret from the Razorpay Dashboard.
      - Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env
    """
    key_id = os.getenv("RAZORPAY_KEY_ID", "")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")

    if not key_id or not key_secret:
        raise HTTPException(
            status_code=503,
            detail=(
                "Razorpay is not configured. "
                "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env "
                "after creating a Razorpay account at https://razorpay.com/"
            ),
        )

    if req.amount_rupees < 200:
        raise HTTPException(
            status_code=400,
            detail="Minimum recharge amount is ₹200"
        )

    try:
        import razorpay
        client = razorpay.Client(auth=(key_id, key_secret))
        amount_paise = int(req.amount_rupees * 100)
        order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"wallet_{current_user.id[:8]}",
                "notes": {"user_id": current_user.id, "purpose": "wallet_recharge"},
            }
        )
        return {
            "order_id": order["id"],
            "amount_paise": amount_paise,
            "currency": "INR",
            "key_id": key_id,
        }
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Razorpay package not installed. Run: pip install razorpay",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {e}")

@router.post("/recharge/verify")
def verify_payment_and_credit(
    req: VerifyPaymentRequest,
    current_user: User = Depends(require_permission("can_recharge")),
    db: Session = Depends(get_db),
):
    """
    Verify Razorpay payment signature then credit the wallet.
    Signature verification prevents fraudulent credits.
    """
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    if not key_secret:
        raise HTTPException(status_code=503, detail="Razorpay not configured")

    expected_sig = hmac.new(
        key_secret.encode(),
        f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    amount_paise = int(req.amount_rupees * 100)
    target_user_id = _get_target_user_id(current_user, db)
    wallet = _get_wallet(target_user_id, db, lock=True)

    existing = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.razorpay_payment_id == req.razorpay_payment_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Payment already credited")

    wallet.balance_paise += amount_paise
    _record_transaction(
        wallet,
        TransactionType.credit,
        amount_paise,
        description=f"Razorpay recharge",
        db=db,
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
        created_by_id=current_user.id,
    )
    db.commit()

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        action="WALLET_RECHARGE",
        details={"amount_paise": amount_paise, "razorpay_payment_id": req.razorpay_payment_id}
    )

    return {
        "status": "credited",
        "amount_rupees": req.amount_rupees,
        "new_balance_rupees": wallet.balance_paise / 100.0,
    }

@router.post("/recharge/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Razorpay Webhook for payment.captured
    Handles background crediting if the frontend misses the /verify call.
    """
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    if not webhook_secret:

        return {"status": "ignored", "reason": "webhook secret not set"}

    if not x_razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    payload_body = await request.body()

    expected_sig = hmac.new(
        webhook_secret.encode(),
        payload_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, x_razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    try:
        payload = json.loads(payload_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event")
    if event == "payment.captured":
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

        payment_id = payment_entity.get("id")
        order_id = payment_entity.get("order_id")
        amount_paise = payment_entity.get("amount")
        notes = payment_entity.get("notes", {})
        user_id = notes.get("user_id")
        purpose = notes.get("purpose")

        if purpose == "wallet_recharge" and user_id and payment_id:

            existing = (
                db.query(WalletTransaction)
                .filter(WalletTransaction.razorpay_payment_id == payment_id)
                .first()
            )
            if not existing:
                try:
                    wallet = _get_wallet(user_id, db, lock=True)
                    wallet.balance_paise += amount_paise
                    _record_transaction(
                        wallet,
                        TransactionType.credit,
                        amount_paise,
                        description="Razorpay recharge (Webhook)",
                        db=db,
                        razorpay_order_id=order_id,
                        razorpay_payment_id=payment_id,
                        created_by_id=user_id,
                    )
                    db.commit()

                    audit_service.log_activity(
                        db=db,
                        user_id=user_id,
                        action="WALLET_RECHARGE_WEBHOOK",
                        details={"amount_paise": amount_paise, "razorpay_payment_id": payment_id}
                    )
                except HTTPException:

                    pass

    return {"status": "ok"}

@router.post("/deduct")
def deduct_balance(
    req: DeductRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deduct balance for a test. Called by the frontend after a session completes."""
    target_user_id = _get_target_user_id(current_user, db)
    wallet = _get_wallet(target_user_id, db, lock=True)

    if wallet.balance_paise < req.amount_paise:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient balance. Required ₹{req.amount_paise/100:.2f}, available ₹{wallet.balance_paise/100:.2f}",
        )

    wallet.balance_paise -= req.amount_paise
    _record_transaction(
        wallet, TransactionType.debit, req.amount_paise, req.description, db, created_by_id=current_user.id
    )
    db.commit()

    audit_service.log_activity(
        db=db,
        user_id=current_user.id,
        action="WALLET_DEDUCTION",
        details={"amount_paise": req.amount_paise, "description": req.description}
    )

    return {
        "status": "deducted",
        "amount_rupees": req.amount_paise / 100.0,
        "new_balance_rupees": wallet.balance_paise / 100.0,
    }
