"""
OAuth 2.0 integration for Google and Microsoft sign-in.

Handles:
  - Authorization URL generation (with CSRF state)
  - Authorization code → access token exchange
  - Fetching user profile from provider APIs
  - Creating or linking user accounts in the database
"""
import os
import secrets
import urllib.parse
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
import requests
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole, AccountType, VerificationStatus
from app.auth.jwt_utils import create_access_token
from app.models.wallet import Wallet

router = APIRouter(prefix="/oauth", tags=["oauth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/api/auth/oauth/google/callback",
)

MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET", "")
MICROSOFT_REDIRECT_URI = os.getenv(
    "MICROSOFT_REDIRECT_URI",
    "http://localhost:8000/api/auth/oauth/microsoft/callback",
)
MICROSOFT_TENANT = os.getenv("MICROSOFT_TENANT", "common")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

MICROSOFT_AUTH_URL_TEMPLATE = (
    "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
)
MICROSOFT_TOKEN_URL_TEMPLATE = (
    "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
)
MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me"

def generate_state() -> str:
    """Generate a cryptographically random state string for CSRF protection."""
    return secrets.token_urlsafe(32)

def build_google_auth_url(state: str) -> str:
    """Build the Google OAuth 2.0 consent screen URL."""
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

def build_microsoft_auth_url(state: str) -> str:
    """Build the Microsoft OAuth 2.0 consent screen URL."""
    params = {
        "client_id": MICROSOFT_CLIENT_ID,
        "redirect_uri": MICROSOFT_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid profile email offline_access",
        "state": state,
        "response_mode": "query",
    }
    base = MICROSOFT_AUTH_URL_TEMPLATE.format(tenant=MICROSOFT_TENANT)
    return f"{base}?{urllib.parse.urlencode(params)}"

def exchange_code_for_google(code: str) -> dict:
    """
    Exchange a Google authorization code for user information.

    Returns dict with keys: id, email, name, picture
    """

    token_response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=15,
    )
    token_response.raise_for_status()
    access_token = token_response.json()["access_token"]

    user_response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    user_response.raise_for_status()
    return user_response.json()

def exchange_code_for_microsoft(code: str) -> dict:
    """
    Exchange a Microsoft authorization code for user information.

    Returns dict with keys: id, mail/userPrincipalName, displayName
    """
    token_url = MICROSOFT_TOKEN_URL_TEMPLATE.format(tenant=MICROSOFT_TENANT)

    token_response = requests.post(
        token_url,
        data={
            "code": code,
            "client_id": MICROSOFT_CLIENT_ID,
            "client_secret": MICROSOFT_CLIENT_SECRET,
            "redirect_uri": MICROSOFT_REDIRECT_URI,
            "grant_type": "authorization_code",
            "scope": "openid profile email offline_access",
        },
        timeout=15,
    )
    token_response.raise_for_status()
    access_token = token_response.json()["access_token"]

    user_response = requests.get(
        MICROSOFT_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    user_response.raise_for_status()
    return user_response.json()

def create_or_link_oauth_user(
    provider: str,
    provider_id: str,
    email: str,
    name: str,
    avatar_url: Optional[str],
    db: Session,
) -> User:
    """
    Find or create a user for an OAuth login.

    Account linking strategy (Option A — auto-link by email):
      1. If a user with this oauth_provider_id already exists → return them (returning user)
      2. If a user with this email exists → link the OAuth identity (account linking)
      3. Otherwise → create a new user (new OAuth sign-up)
    """

    existing = (
        db.query(User)
        .filter(
            User.oauth_provider == provider,
            User.oauth_provider_id == provider_id,
        )
        .first()
    )
    if existing:

        if name:
            parts = name.split(None, 1)
            existing.first_name = parts[0]
            existing.last_name = parts[1] if len(parts) > 1 else None
        if avatar_url:
            existing.oauth_avatar_url = avatar_url
        db.commit()
        db.refresh(existing)
        return existing

    by_email = db.query(User).filter(User.email == email).first()
    if by_email:
        by_email.oauth_provider = provider
        by_email.oauth_provider_id = provider_id
        if avatar_url:
            by_email.oauth_avatar_url = avatar_url
        db.commit()
        db.refresh(by_email)
        return by_email

    _name = name or email.split("@")[0]
    _parts = _name.split(None, 1)
    new_user = User(
        email=email,
        hashed_password=None,
        first_name=_parts[0],
        last_name=_parts[1] if len(_parts) > 1 else None,
        oauth_provider=provider,
        oauth_provider_id=provider_id,
        oauth_avatar_url=avatar_url,
        role=UserRole.individual_psychologist,
        account_type=AccountType.individual,
        verification_status=VerificationStatus.not_submitted,
    )
    db.add(new_user)
    db.flush()

    wallet = Wallet(user_id=new_user.id)
    db.add(wallet)

    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/google")
def login_google():
    """Redirect to Google's OAuth consent screen."""
    state = generate_state()
    url = build_google_auth_url(state)
    return RedirectResponse(url)

@router.get("/google/callback")
def callback_google(code: str = Query(None), error: str = Query(None), db: Session = Depends(get_db)):
    """Handle Google OAuth callback."""
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/login?error={urllib.parse.quote(error)}")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")

    try:
        user_info = exchange_code_for_google(code)
    except Exception as e:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Failed+to+exchange+token")

    email = user_info.get("email")
    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Google+did+not+provide+an+email")

    user = create_or_link_oauth_user(
        provider="google",
        provider_id=user_info["id"],
        email=email,
        name=user_info.get("name", ""),
        avatar_url=user_info.get("picture"),
        db=db,
    )

    if not user.is_active:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Account+disabled")

    token = create_access_token({"sub": user.id, "role": user.role.value if isinstance(user.role, UserRole) else user.role})
    return RedirectResponse(f"{FRONTEND_URL}/auth/oauth/callback?token={token}")

@router.get("/microsoft")
def login_microsoft():
    """Redirect to Microsoft's OAuth consent screen."""
    state = generate_state()
    url = build_microsoft_auth_url(state)
    return RedirectResponse(url)

@router.get("/microsoft/callback")
def callback_microsoft(code: str = Query(None), error: str = Query(None), db: Session = Depends(get_db)):
    """Handle Microsoft OAuth callback."""
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/login?error={urllib.parse.quote(error)}")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")

    try:
        user_info = exchange_code_for_microsoft(code)
    except Exception as e:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Failed+to+exchange+token")

    email = user_info.get("mail") or user_info.get("userPrincipalName")
    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Microsoft+did+not+provide+an+email")

    user = create_or_link_oauth_user(
        provider="microsoft",
        provider_id=user_info["id"],
        email=email,
        name=user_info.get("displayName", ""),
        avatar_url=None,
        db=db,
    )

    if not user.is_active:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=Account+disabled")

    token = create_access_token({"sub": user.id, "role": user.role.value if isinstance(user.role, UserRole) else user.role})
    return RedirectResponse(f"{FRONTEND_URL}/auth/oauth/callback?token={token}")
