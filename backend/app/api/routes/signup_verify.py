"""
Signup Verification API — /api/signup-verify/*

Multi-step verification endpoints used DURING signup (before account creation).
These are public endpoints (no auth required) that validate:
  1. RCI number → fetches contact details from Neurofy → cross-checks user input
  2. Aadhaar KYC → document verification (used on the post-signup verification page)
  3. Bank Account → Razorpay penny drop for clinic accounts

Endpoints:
  POST /api/signup-verify/rci-details       — Fetch RCI practitioner details
  POST /api/signup-verify/rci-crosscheck    — Cross-check user details vs RCI record
  POST /api/signup-verify/aadhaar           — Aadhaar document verification
  POST /api/signup-verify/bank              — Bank account verification (clinics)
"""
import re
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from app.services.neurofy_service import neurofy_service
from app.services.bank_service import bank_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/signup-verify", tags=["signup-verification"])

class RCIDetailsRequest(BaseModel):
    rci_number: str

    @field_validator("rci_number")
    @classmethod
    def validate_format(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r"^A\d{4,6}$", v):
            raise ValueError("RCI number must be 'A' followed by 4-6 digits")
        return v

class RCIDetailsResponse(BaseModel):
    found: bool
    practitioner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    qualification: Optional[str] = None
    message: Optional[str] = None

class RCICrossCheckRequest(BaseModel):
    """Cross-check user-entered details against RCI record."""
    rci_number: str
    user_phone: str
    user_email: str
    user_address: Optional[str] = None

class RCICrossCheckResponse(BaseModel):
    matches_found: bool
    phone_match: bool = False
    email_match: bool = False
    address_match: bool = False
    rci_phone: Optional[str] = None
    message: Optional[str] = None

class AadhaarVerifyRequest(BaseModel):
    aadhaar_number: str
    address: str

    @field_validator("aadhaar_number")
    @classmethod
    def validate_aadhaar(cls, v: str) -> str:
        v = v.strip().replace(" ", "")
        if not re.match(r"^\d{12}$", v):
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return v

class AadhaarVerifyResponse(BaseModel):
    verified: bool
    address_match: bool = False
    message: Optional[str] = None

class BankVerifyRequest(BaseModel):
    account_number: str
    ifsc_code: str
    beneficiary_name: str

    @field_validator("ifsc_code")
    @classmethod
    def validate_ifsc(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", v):
            raise ValueError("Invalid IFSC code format")
        return v

class BankVerifyResponse(BaseModel):
    verified: bool
    account_holder_name: Optional[str] = None
    message: Optional[str] = None

class PANVerifyRequest(BaseModel):
    pan_number: str
    expected_name: str

    @field_validator("pan_number")
    @classmethod
    def validate_pan(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", v):
            raise ValueError("Invalid PAN format")
        return v

class PANVerifyResponse(BaseModel):
    verified: bool
    name_match: bool = False
    message: Optional[str] = None

@router.post("/rci-details", response_model=RCIDetailsResponse)
def fetch_rci_details(req: RCIDetailsRequest):
    """
    Fetch full practitioner details for an RCI number via Neurofy.
    Returns contact info (phone, email, address) for cross-checking.
    """
    details = neurofy_service.fetch_rci_details(req.rci_number)

    if not details:

        return RCIDetailsResponse(
            found=False,
            message=(
                "Could not fetch detailed RCI records. "
                "Manual verification may be required."
            ),
        )

    return RCIDetailsResponse(
        found=True,
        practitioner_name=details.get("name"),
        phone=_mask_phone(details.get("phone")),
        email=_mask_email(details.get("email")),
        address=details.get("address"),
        state=details.get("state"),
        qualification=details.get("qualification"),
    )

@router.post("/rci-crosscheck", response_model=RCICrossCheckResponse)
def crosscheck_rci(req: RCICrossCheckRequest):
    """
    Cross-check the user's entered Phone/Email/Address against the RCI record.
    If at least one matches, pass. Otherwise, manual verification is required.
    """
    details = neurofy_service.fetch_rci_details(req.rci_number)

    if not details:
        return RCICrossCheckResponse(
            matches_found=False,
            message="RCI details unavailable. Manual verification required.",
        )

    rci_phone = details.get("phone", "")
    rci_email = details.get("email", "")
    rci_address = details.get("address", "")

    phone_match = _normalize_phone(req.user_phone) == _normalize_phone(rci_phone) if rci_phone else False
    email_match = req.user_email.strip().lower() == rci_email.strip().lower() if rci_email else False
    address_match = _fuzzy_address_match(req.user_address, rci_address) if rci_address and req.user_address else False

    any_match = phone_match or email_match or address_match

    return RCICrossCheckResponse(
        matches_found=any_match,
        phone_match=phone_match,
        email_match=email_match,
        address_match=address_match,
        rci_phone=_mask_phone(rci_phone) if rci_phone else None,
        message=(
            "Verification successful — your details match the RCI record."
            if any_match
            else "Your details don't match the RCI record. Manual verification required."
        ),
    )

@router.post("/aadhaar", response_model=AadhaarVerifyResponse)
def verify_aadhaar(req: AadhaarVerifyRequest):
    """
    Verify Aadhaar number and check if the address matches the user's input.
    Uses Neurofy's Aadhaar KYC API.
    """
    result = neurofy_service.verify_aadhaar(req.aadhaar_number, req.address)

    if result.get("verified"):
        return AadhaarVerifyResponse(
            verified=True,
            address_match=result.get("address_match", True),
            message="Aadhaar verified successfully.",
        )

    return AadhaarVerifyResponse(
        verified=False,
        address_match=False,
        message=result.get("reason", "Aadhaar verification failed."),
    )

@router.post("/bank", response_model=BankVerifyResponse)
def verify_bank_account(req: BankVerifyRequest):
    """
    Verify a clinic's bank account via Razorpay Fund Account Validation.
    Performs a penny drop and validates the account holder name.
    """
    result = bank_service.verify_bank_account(
        account_number=req.account_number,
        ifsc_code=req.ifsc_code,
        beneficiary_name=req.beneficiary_name,
    )

    return BankVerifyResponse(
        verified=result.verified,
        account_holder_name=result.account_holder_name,
        message=result.message,
    )

@router.post("/pan", response_model=PANVerifyResponse)
def verify_pan(req: PANVerifyRequest):
    """
    Verify PAN details via Nerotix (eKYC) API.
    Provides a fallback if Bank verification fails.
    """
    result = neurofy_service.verify_pan(
        pan_number=req.pan_number,
        expected_name=req.expected_name,
    )

    if result.get("verified"):
        return PANVerifyResponse(
            verified=True,
            name_match=result.get("name_match", False),
            message=result.get("reason") or f"PAN verified. Registered name: {result.get('registered_name', 'N/A')}",
        )

    return PANVerifyResponse(
        verified=False,
        name_match=False,
        message=result.get("reason", "PAN verification failed."),
    )

def _mask_phone(phone: Optional[str]) -> Optional[str]:
    """Mask a phone number for display: +91XXXXX4321 → +91XXXXX4321"""
    if not phone or len(phone) < 6:
        return phone
    return phone[:3] + "X" * (len(phone) - 7) + phone[-4:]

def _mask_email(email: Optional[str]) -> Optional[str]:
    """Mask an email for display: john.doe@gmail.com → j***e@gmail.com"""
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked = local[0] + "***"
    else:
        masked = local[0] + "***" + local[-1]
    return f"{masked}@{domain}"

def _normalize_phone(phone: str) -> str:
    """Strip a phone number to just digits, last 10."""
    digits = "".join(c for c in phone if c.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits

def _fuzzy_address_match(user_addr: Optional[str], rci_addr: Optional[str]) -> bool:
    """Simple fuzzy address comparison — check if key words overlap."""
    if not user_addr or not rci_addr:
        return False
    user_words = set(user_addr.lower().split())
    rci_words = set(rci_addr.lower().split())

    fillers = {"and", "the", "of", "at", "in", "to", "no", "nr", ",", ".", "-"}
    user_words -= fillers
    rci_words -= fillers
    if not user_words or not rci_words:
        return False
    overlap = user_words & rci_words

    min_len = min(len(user_words), len(rci_words))
    return len(overlap) / min_len >= 0.4
