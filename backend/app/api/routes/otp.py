"""
OTP Verification API — /api/otp/*

Endpoints:
  POST /api/otp/verify-phone  — Verify a Firebase phone auth ID token
"""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.phone_otp_service import phone_otp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/otp", tags=["otp"])

class VerifyPhoneRequest(BaseModel):
    """Frontend sends the Firebase ID token after successful phone OTP verification."""
    firebase_id_token: str
    phone_number: Optional[str] = None

class VerifyPhoneResponse(BaseModel):
    verified: bool
    phone_number: Optional[str] = None
    message: Optional[str] = None

@router.post("/verify-phone", response_model=VerifyPhoneResponse)
def verify_phone_otp(req: VerifyPhoneRequest):
    """
    Verify a Firebase phone auth ID token.

    The frontend performs the OTP flow using Firebase Client SDK:
      1. signInWithPhoneNumber(phone, recaptchaVerifier)
      2. User enters OTP → confirmationResult.confirm(otpCode)
      3. Get the Firebase ID token → send it here

    This endpoint verifies the token and returns the verified phone number.
    The frontend should store this response and include the verified phone
    in the registration request.
    """
    result = phone_otp_service.verify_firebase_token(req.firebase_id_token)

    if not result.verified:
        raise HTTPException(
            status_code=400,
            detail=result.error or "Phone verification failed.",
        )

    if req.phone_number and result.phone_number:

        req_phone = req.phone_number.replace(" ", "").replace("-", "")
        result_phone = result.phone_number.replace(" ", "").replace("-", "")

        if not req_phone.startswith("+"):
            req_phone = f"+91{req_phone}"

        if req_phone != result_phone:
            raise HTTPException(
                status_code=400,
                detail="Phone number mismatch. The verified phone doesn't match the provided number.",
            )

    return VerifyPhoneResponse(
        verified=True,
        phone_number=result.phone_number,
        message="Phone number verified successfully.",
    )

@router.get("/firebase-config")
def get_firebase_config():
    """
    Return Firebase configuration for the frontend.
    This avoids hardcoding Firebase config in the frontend bundle.
    """
    import os

    config = {
        "apiKey": os.getenv("FIREBASE_WEB_API_KEY", ""),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.getenv("FIREBASE_PROJECT_ID", ""),
        "appId": os.getenv("FIREBASE_APP_ID", ""),
    }

    if not config["apiKey"]:
        return {
            "configured": False,
            "message": "Firebase not configured. Running in dev mode.",
            "config": None,
        }

    return {
        "configured": True,
        "config": config,
    }
