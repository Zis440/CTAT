import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.wallet import Wallet, WalletTransaction, TransactionType

router = APIRouter(prefix="/api/cron", tags=["cron"])

@router.post("/refund-expired-verifications")
def refund_expired_verifications(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Cron endpoint to refund verification fees if a psychologist hasn't
    verified the report within 24 hours.
    
    This can be called via a secure scheduler or internal task runner.
    For security, you should add a CRON_SECRET check here in production.
    """
    import os
    cron_secret = os.getenv("CRON_SECRET", "default_secret")
    if authorization != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    cutoff_time = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=24)
    refunds_processed = 0

    # 1. Check Screening Level 1 Reports
    from app.assessments.screening.level1.models import ScreeningReport, ScreeningLevel1Session
    from app.models.user import User

    # Find pending reports that have been pending for > 24 hours. 
    # Since we don't have a specific `requested_at` timestamp other than checking changes_history,
    # we can use generated_at or a heuristic, but wait: `verified_at` is null.
    # The `changes_history` logs the verification request, but for simplicity we will check if
    # the session was created > 24 hours ago and status is still "Pending Verification".
    
    pending_screenings = db.query(ScreeningReport, ScreeningLevel1Session).join(
        ScreeningLevel1Session, ScreeningReport.assessment_id == ScreeningLevel1Session.id
    ).filter(
        ScreeningReport.status == "Pending Verification"
    ).all()

    for report, session in pending_screenings:
        # Check if the assessment ended > 24h ago
        if session.end_time:
            end_time = session.end_time
            if end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=dt.timezone.utc)
            
            if end_time < cutoff_time:
                # Need to refund the user who requested it.
                user = db.query(User).filter(User.id == session.core_user_id).first()
                if user:
                    from app.wallet.router import _get_target_user_id, _get_wallet, _record_transaction
                    target_id = _get_target_user_id(user, db)
                    wallet = _get_wallet(target_id, db, lock=True)
                    
                    wallet.balance_paise += 10000
                    _record_transaction(
                        wallet=wallet,
                        tx_type=TransactionType.credit,
                        amount_paise=10000,
                        description=f"Refund: Verification Timeout - Screening {session.id}",
                        db=db,
                        created_by_id=user.id
                    )
                
                report.status = "AI Generated"
                db.commit()
                refunds_processed += 1

    # 2. Check TAT Sessions
    from app.models.patient import Session as TATSession
    pending_tats = db.query(TATSession).filter(
        TATSession.validation_status == "Pending Verification"
    ).all()

    for session in pending_tats:
        if session.created_at:
            created_at = session.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=dt.timezone.utc)
                
            if created_at < cutoff_time:
                user = db.query(User).filter(User.id == session.user_id).first()
                if user:
                    from app.wallet.router import _get_target_user_id, _get_wallet, _record_transaction
                    target_id = _get_target_user_id(user, db)
                    wallet = _get_wallet(target_id, db, lock=True)
                    
                    wallet.balance_paise += 10000
                    _record_transaction(
                        wallet=wallet,
                        tx_type=TransactionType.credit,
                        amount_paise=10000,
                        description=f"Refund: Verification Timeout - Narrative {session.id}",
                        db=db,
                        created_by_id=user.id
                    )
                
                session.validation_status = "AI Generated"
                db.commit()
                refunds_processed += 1

    return {"status": "success", "refunds_processed": refunds_processed}
