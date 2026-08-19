from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import desc
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.patient import Session
from app.models.wallet import Wallet, WalletTransaction
from app.assessments.screening.level1.models import ScreeningReport, ScreeningLevel1Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class PendingCountsResponse(BaseModel):
    account_verifications: int
    report_verifications: int
    total: int

@router.get("/pending-counts", response_model=PendingCountsResponse)
def get_pending_counts(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch the count of pending tasks for notification badges.
    """
    account_verifications = 0
    report_verifications = 0

    role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role

    if role == "super_admin":
        account_verifications = db.query(User).filter(
            User.verification_status == "pending"
        ).count()

    if role in ("individual_psychologist", "super_admin", "clinic_admin", "org_admin"):
        from app.models.verification_request import VerificationRequest, VerificationRequestStatus
        if role == "individual_psychologist":
            tat_pending_count = db.query(VerificationRequest).filter(
                VerificationRequest.assigned_psychologist_id == current_user.id,
                VerificationRequest.status == VerificationRequestStatus.ASSIGNED
            ).count()
            screening_pending_count = db.query(ScreeningReport).join(
                ScreeningLevel1Session, ScreeningReport.assessment_id == ScreeningLevel1Session.id
            ).filter(
                ScreeningReport.status.in_(["pending", "Under Verification", "Assigned"]),
                ScreeningReport.verified_by_id == current_user.id
            ).count()
        else:
            tat_query = db.query(Session).filter(Session.validation_status.in_(["pending", "Under Verification", "Assigned"]))
            screening_query = db.query(ScreeningReport).join(
                ScreeningLevel1Session, ScreeningReport.assessment_id == ScreeningLevel1Session.id
            ).filter(ScreeningReport.status.in_(["pending", "Under Verification", "Assigned"]))
            tat_pending_count = tat_query.count()
            screening_pending_count = screening_query.count()

        report_verifications = tat_pending_count + screening_pending_count

    total = account_verifications + report_verifications

    return PendingCountsResponse(
        account_verifications=account_verifications,
        report_verifications=report_verifications,
        total=total
    )

class NotificationItem(BaseModel):
    id: str
    title: str
    description: str
    isRead: bool
    timestamp: str
    link: Optional[str] = None
    priority: Optional[str] = "normal"

@router.get("/list", response_model=List[NotificationItem])
def get_notifications_list(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = []

    role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role

    if role == "super_admin":
        latest_pending_user = db.query(User).filter(User.verification_status == "pending").order_by(desc(User.created_at)).first()
        if latest_pending_user:
            pending_accs = db.query(User).filter(User.verification_status == "pending").count()

            dt_str = datetime.now(timezone.utc).isoformat()
            if latest_pending_user.updated_at:
                dt_str = latest_pending_user.updated_at.isoformat()
            elif latest_pending_user.created_at:
                dt_str = latest_pending_user.created_at.isoformat()

            notifications.append(NotificationItem(
                id="acc_verif",
                title="Account Verifications Pending",
                description=f"You have {pending_accs} account verification(s) waiting.",
                isRead=False,
                timestamp=dt_str,
                link="/admin/verification-queue",
                priority="important"
            ))

    if role == "individual_psychologist":
        from app.models.verification_request import VerificationRequest, VerificationRequestStatus
        tat_pending = db.query(VerificationRequest).filter(
            VerificationRequest.assigned_psychologist_id == current_user.id,
            VerificationRequest.status == VerificationRequestStatus.ASSIGNED
        ).count()

        screening_pending = db.query(ScreeningReport).join(
            ScreeningLevel1Session, ScreeningReport.assessment_id == ScreeningLevel1Session.id
        ).filter(
            ScreeningReport.status.in_(["pending", "Under Verification", "Assigned"]),
            ScreeningReport.verified_by_id == current_user.id
        ).count()

        total_reports = tat_pending + screening_pending
        if total_reports > 0:
            latest_req = db.query(VerificationRequest).filter(
                VerificationRequest.assigned_psychologist_id == current_user.id,
                VerificationRequest.status == VerificationRequestStatus.ASSIGNED
            ).order_by(desc(VerificationRequest.created_at)).first()

            latest_scr = db.query(ScreeningReport).filter(
                ScreeningReport.verified_by_id == current_user.id,
                ScreeningReport.status.in_(["pending", "Under Verification", "Assigned"])
            ).order_by(desc(ScreeningReport.created_at)).first()

            timestamps = []
            if latest_req and hasattr(latest_req, 'created_at') and latest_req.created_at:
                timestamps.append(latest_req.created_at)
            if latest_scr and hasattr(latest_scr, 'created_at') and latest_scr.created_at:
                timestamps.append(latest_scr.created_at)

            dt_str = max(timestamps).isoformat() if timestamps else datetime.now(timezone.utc).isoformat()

            notifications.append(NotificationItem(
                id="rep_verif",
                title="Urgent: Verify Reports",
                description=f"You have {total_reports} patient reports pending your verification and signature.",
                isRead=False,
                timestamp=dt_str,
                link="/verification-queue",
                priority="urgent"
            ))

    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if wallet:
        recent_txs = db.query(WalletTransaction).filter(
            WalletTransaction.wallet_id == wallet.id
        ).order_by(desc(WalletTransaction.created_at)).limit(5).all()

        for tx in recent_txs:
            dt_str = tx.created_at.isoformat() if tx.created_at else datetime.now(timezone.utc).isoformat()
            if tx.type == "credit":
                notifications.append(NotificationItem(
                    id=f"tx_{tx.id}",
                    title="Wallet Credited",
                    description=f"₹{tx.amount_paise / 100:.2f} has been added to your wallet. ({tx.description})",
                    isRead=True,
                    timestamp=dt_str,
                    priority="important",
                    link="/wallet"
                ))
            else:
                notifications.append(NotificationItem(
                    id=f"tx_{tx.id}",
                    title="Wallet Deducted",
                    description=f"₹{tx.amount_paise / 100:.2f} has been deducted from your wallet for {tx.description}.",
                    isRead=True,
                    timestamp=dt_str,
                    priority="normal",
                    link="/wallet"
                ))

    recent_sessions = db.query(Session).filter(
        Session.user_id == current_user.id
    ).order_by(desc(Session.created_at)).limit(5).all()

    for sess in recent_sessions:
        dt_str = sess.created_at.isoformat() if sess.created_at else datetime.now(timezone.utc).isoformat()
        notifications.append(NotificationItem(
            id=f"sess_{sess.id}",
            title="Session Scheduled",
            description=f"A session has been scheduled for patient {sess.patient_name or 'Unknown'}.",
            isRead=True,
            timestamp=dt_str,
            priority="normal",
            link="/sessions"
        ))

    notifications.sort(key=lambda x: x.timestamp, reverse=True)

    if len(notifications) == 0:
        dt_str = current_user.created_at.isoformat() if current_user.created_at else datetime.now(timezone.utc).isoformat()
        notifications.append(NotificationItem(
            id="welcome",
            title="Welcome to PsyicHub",
            description="Your notifications will appear here.",
            isRead=True,
            timestamp=dt_str,
            priority="normal"
        ))

    return notifications
