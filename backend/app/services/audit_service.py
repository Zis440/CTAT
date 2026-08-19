import json
import logging
import hashlib
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

class AuditService:
    def log_activity(
        self,
        db: Session,
        user_id: str,
        action: str,
        target_user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Record a comprehensive audit log entry.
        Generates a basic signature hash to ensure integrity of the entry.
        """
        details_json = details if details else {}
        if org_id:
            details_json["org_id"] = org_id

        hash_payload = f"{user_id}:{action}:{target_user_id or ''}:{json.dumps(details_json, sort_keys=True)}"
        signature_hash = hashlib.sha256(hash_payload.encode('utf-8')).hexdigest()

        audit_log = AuditLog(
            user_id=user_id,
            target_user_id=target_user_id,
            action=action,
            details=details_json,
            signature_hash=signature_hash,
        )

        try:
            db.add(audit_log)
            db.commit()
            db.refresh(audit_log)
            logger.info(f"Audit Log: {action} by user {user_id}")
            return audit_log
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to record audit log '{action}' for user {user_id}: {e}")
            return None

audit_service = AuditService()
