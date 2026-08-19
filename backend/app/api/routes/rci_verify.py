"""
RCI Registration Number Verification API — /api/verify-rci

Scrapes the official RCI public registry to verify practitioner registration.
No authentication required (can be called during signup).

Endpoint:
  POST /api/verify-rci  — Verify an RCI registration number (format: A######)
"""
import re
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["verification"])

def _normalize_phone(phone: str) -> str:
    """Strip a phone number to just digits, last 10."""
    digits = "".join(c for c in phone if c.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits

def _fuzzy_address_match(user_addr: str | None, rci_addr: str | None) -> bool:
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

class RCIVerifyRequest(BaseModel):
    rci_number: str
    user_name: str | None = None
    user_phone: str | None = None
    user_address: str | None = None

    @field_validator("rci_number")
    @classmethod
    def validate_rci_format(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r"^A\d{5,6}$", v):
            raise ValueError("RCI number must be in format A followed by 5 to 6 digits (e.g. A123456)")
        return v

class RCIVerifyResponse(BaseModel):
    verified: bool
    practitioner_name: str | None = None
    address: str | None = None
    phone: str | None = None

    name_match: bool | None = None
    phone_match: bool | None = None
    address_match: bool | None = None

    message: str | None = None

RCI_SEARCH_URL = "https://rciregistration.nic.in/rehabcouncil/Newsearchlist_c.jsp"
REQUEST_TIMEOUT = 10

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

@router.post("/verify-rci", response_model=RCIVerifyResponse)
def verify_rci_number(req: RCIVerifyRequest):
    """Verify an RCI registration number by scraping the official NIC registry.

    Submits the CRR number to the RCI website and parses the HTML response
    to extract the practitioner's name and cross-check against user details.
    """
    try:
        form_data = {
            "id": req.rci_number,
        }

        response = requests.post(
            RCI_SEARCH_URL,
            data=form_data,
            headers=HEADERS,
            timeout=REQUEST_TIMEOUT,
            verify=True,
        )
        response.raise_for_status()

    except requests.exceptions.Timeout:
        logger.warning("RCI verification timed out for %s", req.rci_number)
        return RCIVerifyResponse(
            verified=False,
            message="RCI website is not responding. Please try again later.",
        )
    except requests.exceptions.RequestException as e:
        logger.error("RCI verification request failed: %s", e)
        return RCIVerifyResponse(
            verified=False,
            message="Unable to connect to the RCI verification service. Please try again later.",
        )

    try:
        soup = BeautifulSoup(response.text, "html.parser")

        tables = soup.find_all("table")

        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all("td")
                if len(cells) >= 2:
                    row_text_raw = " ".join(cell.get_text(separator=" ", strip=True) for cell in cells)
                    row_text = re.sub(r'\s+', ' ', row_text_raw)

                    if req.rci_number in row_text:
                        practitioner_name = None

                        name_match = None
                        phone_match = None
                        address_match = None

                        if req.user_name:
                            name_words = set(req.user_name.lower().split())
                            row_words = set(row_text.lower().split())
                            overlap = name_words & row_words

                            name_match = len(overlap) / len(name_words) >= 0.5 if name_words else False

                        if req.user_phone:
                            norm_phone = _normalize_phone(req.user_phone)
                            phone_match = norm_phone in row_text if norm_phone else False

                        if req.user_address:
                            address_match = _fuzzy_address_match(req.user_address, row_text)

                        for cell in cells:
                            header = cell.get("data-table-header", "")
                            text = cell.get_text(strip=True)

                            if "name" in header.lower() or (
                                text
                                and text != req.rci_number
                                and not text.isdigit()
                                and len(text) > 2
                                and not text.startswith("A")
                            ):
                                parts = list(cell.stripped_strings)
                                if len(parts) >= 2:
                                    name = parts[0].title()
                                    father = parts[1].title()
                                    practitioner_name = f"Name: {name}\nFather/Husband Name: {father}"
                                elif len(parts) == 1:
                                    practitioner_name = f"Name: {parts[0].title()}"
                                else:
                                    practitioner_name = text.title()

                                return RCIVerifyResponse(
                                    verified=True,
                                    practitioner_name=practitioner_name,
                                    name_match=name_match,
                                    phone_match=phone_match,
                                    address_match=address_match,
                                    message="Verification successful."
                                )

        page_text = soup.get_text(separator=" ", strip=True).lower()
        if "no record" in page_text or "not found" in page_text:
            return RCIVerifyResponse(
                verified=False,
                message=f"RCI number {req.rci_number} was not found in the registry.",
            )

        if tables and len(response.text) > 1000:
            return RCIVerifyResponse(
                verified=True,
                practitioner_name=None,
                message=f"RCI number {req.rci_number} appears to be registered, but the name could not be extracted automatically.",
            )

        return RCIVerifyResponse(
            verified=False,
            message=f"RCI number {req.rci_number} was not found in the registry.",
        )

    except Exception as e:
        logger.error("RCI HTML parsing failed: %s", e)
        return RCIVerifyResponse(
            verified=False,
            message="Failed to parse the RCI verification response. Please try again later.",
        )
