from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])

class AuditLogOut(BaseModel):
    id: str
    user_id: str
    target_user_id: Optional[str]
    action: str
    details: Optional[dict]
    timestamp: datetime
    
    # We might want to resolve the user's name for the frontend
    user_name: Optional[str] = None
    user_role: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[AuditLogOut])
def get_audit_logs(
    user_id: Optional[str] = Query(None, description="Filter logs by the user who performed the action"),
    target_user_id: Optional[str] = Query(None, description="Filter logs by the target user/patient ID"),
    assessment_id: Optional[str] = Query(None, description="Filter logs by assessment ID"),
    action: Optional[str] = Query(None, description="Filter logs by a specific action"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch audit logs with strict permission checks.
    """
    query = db.query(AuditLog)
    
    # ── Permission Filtering ──
    if current_user.role == UserRole.super_admin:
        # Super admin sees all
        pass
    elif current_user.role == UserRole.clinic_admin:
        # Clinic admin sees logs for their clinic org_id (stored in JSON details) OR their own logs
        query = query.filter(
            or_(
                AuditLog.details['org_id'].as_string() == current_user.clinic_id,
                AuditLog.user_id == current_user.id
            )
        )
    elif current_user.role == UserRole.clinic_staff:
        # Staff see logs for their clinic (only if they have access to the target_user, but we filter loosely by clinic for now, 
        # and enforce target_user_id if requested)
        query = query.filter(
            or_(
                AuditLog.details['org_id'].as_string() == current_user.clinic_id,
                AuditLog.user_id == current_user.id
            )
        )
    else:
        # Individual psychologists or others only see their own generated logs
        query = query.filter(AuditLog.user_id == current_user.id)
        
    # ── Query Filtering ──
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
        
    if target_user_id:
        query = query.filter(AuditLog.target_user_id == target_user_id)
        
    if assessment_id:
        query = query.filter(
            or_(
                AuditLog.details['assessment_id'].as_string() == assessment_id,
                AuditLog.details['assessment_id'].as_string() == f"SCR_{assessment_id}"
            )
        )
        
    if action:
        query = query.filter(AuditLog.action == action)
        
    logs = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()
    
    # Resolve usernames efficiently
    user_ids = {log.user_id for log in logs}
    users = db.query(User.id, User.first_name, User.last_name, User.role).filter(User.id.in_(user_ids)).all()
    user_map = {
        u.id: {
            "name": f"{u.first_name} {u.last_name or ''}".strip(),
            "role": u.role.value if hasattr(u.role, 'value') else u.role
        } 
        for u in users
    }
    
    # Format response
    results = []
    for log in logs:
        u_info = user_map.get(log.user_id, {})
        results.append(
            AuditLogOut(
                id=log.id,
                user_id=log.user_id,
                target_user_id=log.target_user_id,
                action=log.action,
                details=log.details,
                timestamp=log.timestamp,
                user_name=u_info.get("name", "Unknown User"),
                user_role=u_info.get("role", "Unknown Role")
            )
        )
        
    return results
