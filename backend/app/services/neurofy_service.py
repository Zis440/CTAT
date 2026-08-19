"""
Nerotix (eKYC) Document Verification Service
=============================================
Integrates with Nerotix's API (api.nerofy.in) for automated KYC verification.

Services available:
  - PAN Card Verification
  - PAN 360 (detailed PAN info)
  - Aadhaar OTP Generation
  - Aadhaar Masking (image-based)
  - DigiLocker Verification (consent flow)
  - DigiLocker Get Data (fetch verified docs)

The service is designed as a pluggable integration:
  - When API token is set, it calls the Nerotix API
  - When unavailable, it falls back to manual_review / disabled status

Usage:
    from app.services.neurofy_service import neurofy_service
    result = neurofy_service.verify_pan("ABCDE1234F")
"""
import os
import logging
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass, field
from enum import Enum

import requests

logger = logging.getLogger(__name__)

class NerotixStatusCode(int, Enum):
    """API-level status codes returned in response JSON."""
    FAILED = 0
    SUCCESS = 1
    VALIDATION_ERROR = 2
    DUPLICATE = 3
    NOT_FOUND = 4
    VERIFICATION_PENDING = 5

class NeurofyStatus(str, Enum):
    """Internal statuses used by the application."""
    VERIFIED = "verified"
    REJECTED = "rejected"
    PENDING = "pending"
    UNAVAILABLE = "unavailable"
    MANUAL_REVIEW = "manual_review_required"

@dataclass
class NeurofyVerificationResult:
    """Generic verification result used across all service methods."""
    status: NeurofyStatus
    confidence: Optional[float] = None
    message: Optional[str] = None
    details: Optional[dict] = None

@dataclass
class NerotixResponse:
    """Raw parsed response from the Nerotix API."""
    success: bool = False
    status_code: int = 0
    message: str = ""
    data: dict = field(default_factory=dict)
    http_status: int = 0
    raw_body: str = ""

class NeurofyService:
    """Handles KYC verification via Nerotix (api.nerofy.in) API."""

    PAN_VERIFY_PATH = "/api/v1/service/pancard/verify"
    PAN_360_PATH = "/api/v1/service/pan/360"
    AADHAAR_OTP_GENERATE_PATH = "/api/v1/service/aadhaar/otp/generate"
    AADHAAR_MASKING_PATH = "/api/v1/service/aadhaar/masking"
    DIGILOCKER_VERIFY_PATH = "/api/v1/service/digilocker/verify"
    DIGILOCKER_GET_DATA_PATH = "/api/v1/service/digilocker/get-data"

    def __init__(self):
        self.api_token = os.getenv("NEROTIX_API_TOKEN", "") or os.getenv("NEUROFY_API_KEY", "")
        self.api_url = (
            os.getenv("NEROTIX_API_URL", "")
            or os.getenv("NEUROFY_API_URL", "")
            or "https://api.nerofy.in"
        )

        if "neurofy.app" in self.api_url:
            self.api_url = "https://api.nerofy.in"
            logger.info("Corrected API URL from neurofy.app to api.nerofy.in")

        self.timeout = int(os.getenv("NEROTIX_TIMEOUT", "") or os.getenv("NEUROFY_TIMEOUT", "30"))
        self.enabled = bool(self.api_token)

        if self.enabled:
            logger.info(f"Nerotix (eKYC) service initialized. API URL: {self.api_url}")
        else:
            logger.info("Nerotix (eKYC) service disabled — no API token set.")

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _build_url(self, path: str) -> str:
        """Build full API URL from base + path."""
        base = self.api_url.rstrip("/")
        return f"{base}{path}"

    def _parse_response(self, response: requests.Response) -> NerotixResponse:
        """Safely parse a Nerotix API response."""
        result = NerotixResponse(
            http_status=response.status_code,
            raw_body=response.text[:500],
        )

        content_type = response.headers.get("Content-Type", "")
        if "application/json" not in content_type:
            logger.error(
                f"Nerotix returned non-JSON content-type: {content_type}. "
                f"Body preview: {response.text[:300]!r}"
            )
            result.message = f"API returned non-JSON response (content-type: {content_type})"
            return result

        try:
            data = response.json()
            result.success = data.get("success", False)
            result.status_code = data.get("statusCode", 0)
            result.message = data.get("message", "")
            result.data = data.get("data", {}) or {}
        except (ValueError, Exception) as e:
            logger.error(f"Nerotix JSON parse error: {e}. Body: {response.text[:300]!r}")
            result.message = f"Invalid JSON response: {e}"

        return result

    def _post_json(self, path: str, payload: dict) -> NerotixResponse:
        """Make a POST request with JSON body to the Nerotix API."""
        url = self._build_url(path)
        logger.info(f"Nerotix POST {url} — payload keys: {list(payload.keys())}")

        try:
            response = requests.post(
                url, json=payload, headers=self._headers, timeout=self.timeout,
            )
            parsed = self._parse_response(response)
            logger.info(
                f"Nerotix response: http={response.status_code}, "
                f"success={parsed.success}, statusCode={parsed.status_code}, "
                f"message={parsed.message!r}"
            )
            return parsed

        except requests.exceptions.Timeout:
            logger.warning(f"Nerotix API timed out: {url}")
            return NerotixResponse(message="API request timed out")
        except requests.exceptions.ConnectionError:
            logger.warning(f"Cannot connect to Nerotix API: {url}")
            return NerotixResponse(message="Cannot connect to Nerotix API")
        except Exception as e:
            logger.error(f"Nerotix request error: {e}")
            return NerotixResponse(message=f"Request error: {e}")

    def _post_multipart(self, path: str, files: dict, data: dict = None) -> NerotixResponse:
        """Make a POST request with multipart form-data to the Nerotix API."""
        url = self._build_url(path)
        logger.info(f"Nerotix POST (multipart) {url}")

        headers = {
            "Authorization": f"Bearer {self.api_token}",

        }

        try:
            response = requests.post(
                url, files=files, data=data or {}, headers=headers, timeout=self.timeout,
            )
            parsed = self._parse_response(response)
            logger.info(
                f"Nerotix multipart response: http={response.status_code}, "
                f"success={parsed.success}, message={parsed.message!r}"
            )
            return parsed

        except requests.exceptions.Timeout:
            logger.warning(f"Nerotix API timed out: {url}")
            return NerotixResponse(message="API request timed out")
        except requests.exceptions.ConnectionError:
            logger.warning(f"Cannot connect to Nerotix API: {url}")
            return NerotixResponse(message="Cannot connect to Nerotix API")
        except Exception as e:
            logger.error(f"Nerotix multipart request error: {e}")
            return NerotixResponse(message=f"Request error: {e}")

    def verify_pan(self, pan_number: str, expected_name: str = "") -> dict:
        """
        Verify a PAN card number via Nerotix API.

        Args:
            pan_number: PAN number (e.g. "ABCDE1234F")
            expected_name: Expected name to cross-check (optional)

        Returns:
            dict with 'verified', 'name_match', 'registered_name', 'reason', etc.
        """
        if not self.enabled:
            return {"verified": False, "reason": "Nerotix service disabled"}

        resp = self._post_json(self.PAN_VERIFY_PATH, {"panNumber": pan_number})

        if resp.success and resp.status_code == NerotixStatusCode.SUCCESS:
            data = resp.data
            registered_name = data.get("registered_name", "")
            pan_status = data.get("pan_status", "")
            is_valid = "VALID" in pan_status.upper() and "INVALID" not in pan_status.upper()

            name_match = False
            if expected_name and registered_name:
                name_match = (
                    expected_name.strip().lower() in registered_name.strip().lower()
                    or registered_name.strip().lower() in expected_name.strip().lower()
                )

            return {
                "verified": is_valid,
                "name_match": name_match,
                "registered_name": registered_name,
                "pan_status": pan_status,
                "pan_type": data.get("pan_type"),
                "txn_id": data.get("txn_id"),
                "reason": resp.message,
            }

        return {
            "verified": False,
            "reason": resp.message or "PAN verification failed",
        }

    def verify_pan_360(self, pan_number: str) -> dict:
        """
        Fetch detailed PAN 360 information via Nerotix API.

        Returns detailed info including gender, email, phone, Aadhaar link status.
        """
        if not self.enabled:
            return {"verified": False, "reason": "Nerotix service disabled"}

        resp = self._post_json(self.PAN_360_PATH, {"panNumber": pan_number})

        if resp.success and resp.status_code == NerotixStatusCode.SUCCESS:
            return {
                "verified": True,
                "data": resp.data,
                "reason": resp.message,
            }

        return {
            "verified": False,
            "reason": resp.message or "PAN 360 verification failed",
        }

    def generate_aadhaar_otp(self, aadhaar_number: str) -> dict:
        """
        Send OTP to the mobile number linked with the Aadhaar card.

        Returns:
            dict with 'success', 'ref_id' (if available), 'message'
        """
        if not self.enabled:
            return {"success": False, "reason": "Nerotix service disabled"}

        resp = self._post_json(
            self.AADHAAR_OTP_GENERATE_PATH,
            {"aadhaarNumber": aadhaar_number},
        )

        if resp.success and resp.status_code == NerotixStatusCode.SUCCESS:
            return {
                "success": True,
                "ref_id": resp.data.get("ref_id"),
                "message": resp.message,
            }

        return {
            "success": False,
            "reason": resp.message or "Aadhaar OTP generation failed",
        }

    def mask_aadhaar(self, image_path: str) -> dict:
        """
        DEPRECATED: Aadhaar Masking is a privacy feature, not an Identity Verification (eKYC) feature.
        This endpoint should no longer be used for verifying users.
        Additionally, the Nerotix masking endpoint is currently returning 404 Not Found.

        Args:
            image_path: Path to the Aadhaar card image file
        """
        import warnings
        warnings.warn("mask_aadhaar is deprecated. Use DigiLocker or OTP for Aadhaar KYC.", DeprecationWarning)

        return {
            "success": False,
            "reason": "DEPRECATED: Masking API is disabled. Use proper eKYC verification routes.",
            "status": "API_DEPRECATED"
        }

    def verify_digilocker(
        self,
        documents: List[str] = None,
        user_flow: str = "signup",
        redirect_url: str = None,
    ) -> dict:
        """
        Initiate DigiLocker verification — returns a redirect URL for user consent.

        Args:
            documents: List of document types to request (e.g. ["AADHAAR"])
            user_flow: Flow context ("signup", "kyc_update")
            redirect_url: URL where DigiLocker redirects after consent

        Returns:
            dict with 'success', 'url' (redirect), 'txn_id', 'reference_id', 'status'
        """
        if not self.enabled:
            return {"success": False, "reason": "Nerotix service disabled"}

        if documents is None:
            documents = ["AADHAAR"]

        if not redirect_url:
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            redirect_url = f"{frontend_url.rstrip('/')}/digilocker-redirect"

        resp = self._post_json(self.DIGILOCKER_VERIFY_PATH, {
            "document_requested": documents,
            "user_flow": user_flow,
            "redirect_url": redirect_url,
        })

        if resp.success and resp.status_code == NerotixStatusCode.SUCCESS:
            return {
                "success": True,
                "url": resp.data.get("url"),
                "txn_id": resp.data.get("txn_id"),
                "reference_id": str(resp.data.get("ref_id") or resp.data.get("reference_id") or ""),
                "status": resp.data.get("status"),
                "message": resp.message,
            }

        return {
            "success": False,
            "reason": resp.message or "DigiLocker verification failed",
        }

    def get_digilocker_data(
        self,
        ref_id: str,
        txn_id: str,
        document_type: str = "AADHAAR",
    ) -> dict:
        """
        Fetch verified document data from DigiLocker after user consent.

        Args:
            ref_id: Reference ID from verify_digilocker response
            txn_id: Transaction ID from verify_digilocker response
            document_type: Document type (e.g. "AADHAAR")

        Returns:
            dict with full Aadhaar details (name, dob, gender, address, photo, etc.)
        """
        if not self.enabled:
            return {"success": False, "reason": "Nerotix service disabled"}

        resp = self._post_json(self.DIGILOCKER_GET_DATA_PATH, {
            "ref_id": ref_id,
            "txn_id": txn_id,
            "document_type": document_type,
        })

        if resp.success and resp.status_code == NerotixStatusCode.SUCCESS:
            return {
                "success": True,
                "data": resp.data,
                "message": resp.message,
            }

        return {
            "success": False,
            "reason": resp.message or "DigiLocker data fetch failed",
        }

    def verify_aadhaar(self, aadhaar_number: str, expected_address: str) -> dict:
        """
        Legacy-compatible Aadhaar verification.
        Uses Aadhaar OTP generation to check if the number is valid.
        Full KYC data requires the DigiLocker flow.
        """
        if not self.enabled:
            return {"verified": False, "reason": "Nerotix service disabled"}

        result = self.generate_aadhaar_otp(aadhaar_number)

        if result.get("success"):
            return {
                "verified": True,
                "address_match": False,
                "message": result.get("message", "Aadhaar OTP sent successfully"),
                "ref_id": result.get("ref_id"),
            }

        return {
            "verified": False,
            "reason": result.get("reason", "Aadhaar verification failed"),
        }

    def fetch_rci_details(self, rci_number: str) -> dict:
        """
        Fetch RCI practitioner details.
        NOTE: The Nerotix API does NOT have an RCI endpoint — this returns empty
        to trigger the Aadhaar fallback flow.
        """
        logger.info(
            f"fetch_rci_details called for {rci_number}. "
            "Nerotix API does not have an RCI endpoint — returning empty."
        )
        return {}

    def verify_document(
        self,
        file_path: str,
        document_type: str,
        user_name: Optional[str] = None,
        rci_number: Optional[str] = None,
    ) -> NeurofyVerificationResult:
        """
        Document verification via Nerotix API.
        Maps document types to specific API calls where possible:
          - PAN documents → needs PAN number (can't verify from file alone)
          - Aadhaar / government ID docs → Aadhaar masking (image validation)
          - Other docs → manual review (no Nerotix endpoint available)
        """
        if not self.enabled:
            return NeurofyVerificationResult(
                status=NeurofyStatus.MANUAL_REVIEW,
                message="Nerotix service not configured. Manual review required.",
            )

        doc_type_lower = document_type.lower().replace("-", "_")

        if "pan" in doc_type_lower:
            logger.info(f"Document type '{document_type}' -> PAN verification not possible from file alone.")
            return NeurofyVerificationResult(
                status=NeurofyStatus.MANUAL_REVIEW,
                message="PAN verification requires PAN number input, not file upload.",
            )

        identity_keywords = ("aadhaar", "government_id", "govt_id", "identity")
        is_identity_doc = any(kw in doc_type_lower for kw in identity_keywords)

        if is_identity_doc:
            return self._verify_identity_document(file_path, document_type)

        return NeurofyVerificationResult(
            status=NeurofyStatus.MANUAL_REVIEW,
            message=f"Automated verification not available for '{document_type}'. Manual review required.",
        )

    def _verify_identity_document(
        self,
        file_path: str,
        document_type: str,
    ) -> NeurofyVerificationResult:
        """
        Verify an identity/government-ID document using Aadhaar masking.
        The masking service validates whether the image contains a real Aadhaar card.
        If the document is a passport or DL (not Aadhaar), the masking service
        will return INVALID DOCUMENT — we treat that as "needs manual review"
        rather than "rejected", since the document itself may still be valid.
        """
        try:
            logger.info(
                f"Attempting Aadhaar masking validation for '{document_type}' "
                f"(file: {file_path})"
            )
            mask_result = self.mask_aadhaar(file_path)

            if mask_result.get("success"):
                aadhaar_status = mask_result.get("status", "")
                if "VALID" in aadhaar_status.upper() and "INVALID" not in aadhaar_status.upper():
                    logger.info(
                        f"[OK] Document '{document_type}' validated as Aadhaar via masking."
                    )
                    return NeurofyVerificationResult(
                        status=NeurofyStatus.VERIFIED,
                        confidence=0.95,
                        message="Document validated as a genuine Aadhaar card via Nerotix masking.",
                        details=mask_result,
                    )
                else:

                    logger.info(
                        f"Document '{document_type}' is not an Aadhaar card "
                        f"(masking result: {aadhaar_status}). Sending to manual review."
                    )
                    return NeurofyVerificationResult(
                        status=NeurofyStatus.MANUAL_REVIEW,
                        message=(
                            f"Document does not appear to be an Aadhaar card "
                            f"(detected: {aadhaar_status}). "
                            f"If this is a Passport or DL, manual review is required."
                        ),
                        details=mask_result,
                    )
            else:
                reason = mask_result.get("reason", "Automated identity masking service returned failure.")
                logger.warning(f"Automated identity masking failed for '{document_type}': {reason}")
                return NeurofyVerificationResult(
                    status=NeurofyStatus.MANUAL_REVIEW,
                    message=reason,
                )

        except Exception as e:
            logger.error(f"Aadhaar masking error during '{document_type}' verification: {e}")
            return NeurofyVerificationResult(
                status=NeurofyStatus.MANUAL_REVIEW,
                message=f"Automated verification encountered an error: {e}. Manual review required.",
            )

    def verify_practitioner(
        self,
        rci_number: str,
        practitioner_name: str,
    ) -> NeurofyVerificationResult:
        """
        Legacy-compatible practitioner verification.
        Nerotix API does not have an RCI endpoint — returns MANUAL_REVIEW.
        """
        logger.info(
            f"verify_practitioner called for RCI {rci_number}. "
            "Nerotix API does not support RCI verification."
        )
        return NeurofyVerificationResult(
            status=NeurofyStatus.MANUAL_REVIEW,
            message="RCI verification is not available via Nerotix API. Manual review required.",
        )

    def check_health(self) -> bool:
        """Check if Nerotix API is reachable by calling PAN verify with a dummy."""
        if not self.enabled:
            return False
        try:
            url = self._build_url(self.PAN_VERIFY_PATH)
            response = requests.post(
                url,
                json={"panNumber": "XXXXX0000X"},
                headers=self._headers,
                timeout=5,
            )

            return response.status_code in (200, 400, 401)
        except Exception:
            return False

    def check_health_detailed(self) -> dict:
        """
        Detailed health check — returns full diagnostic information.
        Useful for admin dashboards and debugging API key issues.
        """
        result = {
            "enabled": self.enabled,
            "api_url": self.api_url,
            "token_set": bool(self.api_token),
            "token_preview": f"{self.api_token[:8]}...{self.api_token[-4:]}" if len(self.api_token) > 12 else "(too short)",
            "reachable": False,
            "authenticated": False,
            "http_status": None,
            "api_message": None,
            "api_status_code": None,
            "error": None,
        }

        if not self.enabled:
            result["error"] = "Service disabled — no API token configured"
            return result

        try:
            url = self._build_url(self.PAN_VERIFY_PATH)
            response = requests.post(
                url,
                json={"panNumber": "XXXXX0000X"},
                headers=self._headers,
                timeout=10,
            )
            result["http_status"] = response.status_code
            result["reachable"] = True

            content_type = response.headers.get("Content-Type", "")
            if "application/json" not in content_type:
                result["error"] = f"Non-JSON response (content-type: {content_type})"
                result["api_message"] = response.text[:300]
                return result

            data = response.json()
            result["api_message"] = data.get("message", "")
            result["api_status_code"] = data.get("statusCode")

            if response.status_code == 401:
                result["error"] = f"Authentication failed: {data.get('message', 'Unauthorized')}"
                return result

            msg = data.get("message", "").lower()
            if "token" in msg and ("mismatch" in msg or "invalid" in msg or "expired" in msg):
                result["error"] = f"Token issue: {data.get('message')}"
                return result

            if "user not found" in msg:
                result["error"] = f"API key user not found: {data.get('message')}"
                return result

            result["authenticated"] = True

            if "insufficient balance" in msg:
                result["error"] = "API key valid but account has insufficient balance"
            elif "pricing not set" in msg:
                result["error"] = "API key valid but product pricing not configured"
            elif "service not found" in msg or "active service" in msg.lower():
                result["error"] = "API key valid but service not activated on account"

        except requests.exceptions.Timeout:
            result["error"] = "Connection timed out"
        except requests.exceptions.ConnectionError as e:
            result["error"] = f"Cannot connect to API: {e}"
        except Exception as e:
            result["error"] = f"Unexpected error: {e}"

        return result

    @staticmethod
    def _guess_mime(file_path: Path) -> str:
        """Guess MIME type from file extension."""
        ext = file_path.suffix.lower()
        mime_map = {
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
        }
        return mime_map.get(ext, "application/octet-stream")

neurofy_service = NeurofyService()
