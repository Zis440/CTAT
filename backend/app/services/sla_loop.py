import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.org_request import OrgAssessmentRequest, OrgRequestStatus
from app.models.user import User, UserRole, VerificationStatus
from app.services.verification_service import process_expired_requests

logger = logging.getLogger(__name__)

async def sla_assignment_loop(interval_seconds: int = 600):
    """
    Background loop that:
    1. Finds pending assessment requests.
    2. Assigns them to the verified individual psychologist with the fewest active cases.
    3. Flags expired SLAs (where deadline has passed and it's not completed).
    """
    logger.info("Starting SLA Assignment Loop in background...")
    while True:
        try:
            db: Session = SessionLocal()
            try:
                def _process_slas():
                    # 1. Process SLA breaches
                    now = datetime.now(timezone.utc)
                    breached = db.query(OrgAssessmentRequest).filter(
                        OrgAssessmentRequest.status.in_([OrgRequestStatus.pending, OrgRequestStatus.assigned]),
                        OrgAssessmentRequest.sla_deadline < now
                    ).all()

                    for req in breached:
                        logger.warning(f"SLA Breached for Request {req.id}")
                        req.status = OrgRequestStatus.expired
                    
                    db.commit()

                    # 2. Assign pending requests
                    pending_requests = db.query(OrgAssessmentRequest).filter(
                        OrgAssessmentRequest.status == OrgRequestStatus.pending
                    ).all()

                    if pending_requests:
                        # Find eligible psychologists (strict: Clinical Psychologist + RCI + Approved)
                        psychs = db.query(User).filter(
                            User.role == UserRole.individual_psychologist,
                            User.professional_domain == "Clinical Psychologist",
                            User.rci_number.isnot(None),
                            User.rci_number != "",
                            User.verification_status == VerificationStatus.approved,
                            User.can_assess == True
                        ).all()

                        if not psychs:
                            logger.warning("No verified psychologists available for assignment!")
                        else:
                            import random
                            
                            for req in pending_requests:
                                chosen_psych = random.choice(psychs)
                                req.assigned_psychologist_id = chosen_psych.id
                                req.status = OrgRequestStatus.assigned
                                req.assigned_at = datetime.now(timezone.utc)
                                logger.info(f"Assigned request {req.id} to psychologist {chosen_psych.id}")

                            db.commit()

                    # 3. Process Psychological Verification SLA breaches
                    try:
                        expired_count = process_expired_requests(db)
                        if expired_count > 0:
                            logger.info(f"Re-assigned {expired_count} expired verification requests.")
                    except Exception as ve:
                        logger.error(f"Error processing expired verification requests: {ve}")

                    # Also process any unassigned pending verification requests
                    try:
                        from app.services.verification_service import process_pending_requests
                        pending_count = process_pending_requests(db)
                        if pending_count > 0:
                            logger.info(f"Assigned {pending_count} pending verification requests.")
                    except Exception as pe:
                        logger.error(f"Error processing pending verification requests: {pe}")

                await asyncio.to_thread(_process_slas)
            except Exception as e:
                logger.error(f"Error inside SLA loop DB logic: {e}")
                db.rollback()
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in SLA loop: {e}")
        
        # Wait for the next tick
        await asyncio.sleep(interval_seconds)
