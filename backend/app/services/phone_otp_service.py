"""
Phone OTP Verification Service — Firebase Auth
================================================
Uses Firebase Auth for phone number OTP verification during signup.

Architecture:
  1. Frontend uses Firebase Client SDK to send OTP (signInWithPhoneNumber)
  2. User enters OTP on frontend → Firebase verifies → gets Firebase ID token
  3. Frontend sends Firebase ID token to backend
  4. Backend verifies the ID token using Firebase Admin SDK
  5. Backend extracts the verified phone number
  6. Registration proceeds only if phone is verified

Setup Required:
  - Create a Firebase project at https://console.firebase.google.com
  - Enable Phone authentication in Firebase Console → Authentication → Sign-in method
  - Download service account JSON and set FIREBASE_SERVICE_ACCOUNT_PATH in .env
  - Set FIREBASE_PROJECT_ID in .env
  - Add your domain to Firebase Console → Authentication → Settings → Authorized domains

Usage:
    from app.services.phone_otp_service import phone_otp_service
    result = phone_otp_service.verify_firebase_token(id_token)
"""
import os
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class PhoneVerificationResult:
    verified: bool
    phone_number: Optional[str] = None
    firebase_uid: Optional[str] = None
    error: Optional[str] = None

class PhoneOTPService:
    """Verifies Firebase phone auth ID tokens on the backend."""

    def __init__(self):
        self._firebase_app = None
        self._auth = None
        self.enabled = False
        self.project_id = os.getenv("FIREBASE_PROJECT_ID", "")

        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "")

        if service_account_path and os.path.exists(service_account_path):
            try:
                import firebase_admin
                from firebase_admin import credentials, auth

                cred = credentials.Certificate(service_account_path)
                self._firebase_app = firebase_admin.initialize_app(cred)
                self._auth = auth
                self.enabled = True
                logger.info("Firebase Admin SDK initialized successfully.")
            except ImportError:
                logger.warning("'firebase-admin' package not installed. Phone OTP will use dev mode.")
            except Exception as e:
                logger.error(f"Firebase Admin SDK initialization failed: {e}")
        elif self.project_id:

            try:
                import firebase_admin
                from firebase_admin import auth

                self._firebase_app = firebase_admin.initialize_app()
                self._auth = auth
                self.enabled = True
                logger.info("Firebase Admin SDK initialized with default credentials.")
            except Exception as e:
                logger.warning(f"Firebase default credentials failed: {e}. Using dev mode.")
        else:
            logger.info(
                "Firebase not configured (FIREBASE_SERVICE_ACCOUNT_PATH not set). "
                "Phone OTP running in DEV MODE — any token will be accepted."
            )

    def verify_firebase_token(self, id_token: str) -> PhoneVerificationResult:
        """
        Verify a Firebase ID token and extract the phone number.

        Args:
            id_token: Firebase ID token from frontend after successful phone verification

        Returns:
            PhoneVerificationResult with verified phone number
        """
        if not id_token:
            return PhoneVerificationResult(
                verified=False,
                error="No ID token provided.",
            )

        if self.enabled and self._auth:
            try:
                decoded_token = self._auth.verify_id_token(id_token)
                phone_number = decoded_token.get("phone_number")
                firebase_uid = decoded_token.get("uid")

                if not phone_number:
                    return PhoneVerificationResult(
                        verified=False,
                        error="Token does not contain a verified phone number.",
                    )

                return PhoneVerificationResult(
                    verified=True,
                    phone_number=phone_number,
                    firebase_uid=firebase_uid,
                )

            except self._auth.InvalidIdTokenError:
                return PhoneVerificationResult(
                    verified=False,
                    error="Invalid Firebase ID token.",
                )
            except self._auth.ExpiredIdTokenError:
                return PhoneVerificationResult(
                    verified=False,
                    error="Firebase ID token has expired. Please verify again.",
                )
            except self._auth.RevokedIdTokenError:
                return PhoneVerificationResult(
                    verified=False,
                    error="Firebase ID token has been revoked.",
                )
            except Exception as e:
                logger.error(f"Firebase token verification error: {e}")
                return PhoneVerificationResult(
                    verified=False,
                    error=f"Token verification failed: {str(e)}",
                )
        else:

            logger.warning("Phone OTP DEV MODE — accepting token without Firebase verification.")
            if id_token.startswith("dev_verified:"):
                phone = id_token.replace("dev_verified:", "").strip()
                return PhoneVerificationResult(
                    verified=True,
                    phone_number=phone,
                    firebase_uid=f"dev_{phone}",
                )
            else:

                return PhoneVerificationResult(
                    verified=True,
                    phone_number=id_token if id_token.startswith("+") else f"+91{id_token}",
                    firebase_uid=f"dev_{id_token}",
                )

    def cleanup_firebase_user(self, firebase_uid: str) -> None:
        """
        Optionally delete the temporary Firebase user created during phone verification.
        This keeps Firebase clean since we don't use Firebase for primary auth.
        """
        if not self.enabled or not self._auth or not firebase_uid:
            return
        if firebase_uid.startswith("dev_"):
            return

        try:
            self._auth.delete_user(firebase_uid)
            logger.info(f"Cleaned up Firebase user: {firebase_uid}")
        except Exception as e:

            logger.warning(f"Failed to cleanup Firebase user {firebase_uid}: {e}")

phone_otp_service = PhoneOTPService()
