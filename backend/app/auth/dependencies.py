"""
FastAPI dependency for extracting and validating the current authenticated user
from the Authorization: Bearer <token> header.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
import json

from app.database import get_db
from app.models.user import User, UserRole
from app.auth.jwt_utils import decode_token

bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate JWT; return the User ORM object."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(*roles: UserRole):
    """Return a dependency that enforces one of the given roles."""
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return current_user
    return _check


# Convenience role-specific dependencies
def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user


def require_admin_or_above(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.super_admin, UserRole.clinic_admin, UserRole.org_admin):
        raise HTTPException(status_code=403, detail="Clinic or Organization Admin required")
    return user


def _get_perms(current_user: User) -> dict:
    perms = current_user.module_permissions or {}
    if isinstance(perms, str):
        try:
            perms = json.loads(perms)
        except json.JSONDecodeError:
            perms = {}
    return perms


def require_permission(permission_key: str):
    """
    Return a dependency that strictly enforces a specific module permission.
    If the user is a staff member, they MUST have the permission explicitly enabled
    in their module_permissions object. Admins bypass this check.
    """
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role in (UserRole.clinic_staff, UserRole.org_staff):
            perms = _get_perms(current_user)
            
            # For backward compatibility, if the key is "assessments" and they have "can_assess" flag set, allow it.
            # Otherwise, it strictly requires the key to be true.
            has_perm = perms.get(permission_key, False)
            if permission_key == "assessments" and not has_perm and current_user.can_assess:
                has_perm = True
                
            if not has_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Missing module permission: {permission_key}",
                )
        return current_user
    return _check


def require_patients_or_assessments(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that allows access if the user has either 'candidates', 'patients', OR 'assessments' permission.
    This is useful for endpoints where staff need to select a patient to perform an assessment.
    """
    if current_user.role in (UserRole.clinic_staff, UserRole.org_staff):
        perms = _get_perms(current_user)
        has_patients = perms.get("candidates", False) or perms.get("patients", False)
        has_assessments = perms.get("assessments", False) or current_user.can_assess
        if not (has_patients or has_assessments):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Missing module permission: candidates, patients, or assessments",
            )
    return current_user

def require_any_permission(*permission_keys: str):
    """
    Dependency that allows access if the user has AT LEAST ONE of the specified permissions.
    """
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role in (UserRole.clinic_staff, UserRole.org_staff):
            perms = _get_perms(current_user)
            
            has_perm = False
            for key in permission_keys:
                if key == "assessments" and current_user.can_assess:
                    has_perm = True
                    break
                if perms.get(key, False):
                    has_perm = True
                    break
                    
            if not has_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Missing one of the required permissions: {', '.join(permission_keys)}",
                )
        return current_user
    return _check
