"""
Razorpay Bank Account Verification Service
============================================
Uses Razorpay's Fund Account Validation API to verify bank accounts.
This performs a "penny drop" verification — deposits ₹1 to validate the
account exists and belongs to the stated entity.

In dev mode (no API keys): returns simulated success.

Setup:
    1. pip install razorpay
    2. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
    3. The Razorpay account must have Fund Account Validation enabled
"""
import os
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class BankVerificationResult:
    verified: bool
    account_holder_name: Optional[str] = None
    message: Optional[str] = None
    reference_id: Optional[str] = None

class BankVerificationService:
    """Razorpay-based bank account verification via Fund Account Validation."""

    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        self.enabled = bool(self.key_id and self.key_secret)
        self._client = None

        if self.enabled:
            try:
                import razorpay
                self._client = razorpay.Client(auth=(self.key_id, self.key_secret))
                logger.info("Razorpay bank verification service initialized.")
            except ImportError:
                logger.warning("razorpay package not installed. Run: pip install razorpay")
                self.enabled = False
            except Exception as e:
                logger.error(f"Razorpay client initialization failed: {e}")
                self.enabled = False
        else:
            logger.info("Razorpay disabled — RAZORPAY_KEY_ID/SECRET not set. Using dev mode.")

    def verify_bank_account(
        self,
        account_number: str,
        ifsc_code: str,
        beneficiary_name: str,
    ) -> BankVerificationResult:
        """
        Verify a bank account using Razorpay Fund Account Validation.

        Args:
            account_number: Bank account number
            ifsc_code: IFSC code of the bank branch
            beneficiary_name: Expected account holder name

        Returns:
            BankVerificationResult with verification status
        """
        if not self.enabled or not self._client:

            logger.info(
                f"🏦 BANK VERIFICATION (DEV MODE)\n"
                f"   Account: {account_number}\n"
                f"   IFSC:    {ifsc_code}\n"
                f"   Name:    {beneficiary_name}\n"
                f"   Result:  ✅ Simulated success"
            )
            return BankVerificationResult(
                verified=True,
                account_holder_name=beneficiary_name,
                message="Dev mode — bank verification simulated.",
                reference_id="dev_simulated",
            )

        try:

            payload = {
                "account_number": account_number,
                "ifsc": ifsc_code.upper(),
                "fund_account": {
                    "account_type": "bank_account",
                    "bank_account": {
                        "name": beneficiary_name,
                        "ifsc": ifsc_code.upper(),
                        "account_number": account_number,
                    },
                },
                "notes": {
                    "source": "Psyichub Signup Verification",
                },
            }

            response = self._client.utility.verify_bank_account(payload)

            status = response.get("status", "")
            registered_name = response.get("registered_name", "")
            ref_id = response.get("id", "")

            if status == "completed":

                name_matches = self._name_matches(beneficiary_name, registered_name)

                if name_matches:
                    return BankVerificationResult(
                        verified=True,
                        account_holder_name=registered_name,
                        message="Bank account verified successfully.",
                        reference_id=ref_id,
                    )
                else:
                    return BankVerificationResult(
                        verified=False,
                        account_holder_name=registered_name,
                        message=(
                            f"Account holder name mismatch. "
                            f"Expected: '{beneficiary_name}', "
                            f"Found: '{registered_name}'."
                        ),
                        reference_id=ref_id,
                    )
            elif status == "failed":
                return BankVerificationResult(
                    verified=False,
                    message="Bank account verification failed. Please check account details.",
                    reference_id=ref_id,
                )
            else:
                return BankVerificationResult(
                    verified=False,
                    message=f"Verification status: {status}. Try again later.",
                    reference_id=ref_id,
                )

        except Exception as e:
            logger.error(f"Razorpay bank verification error: {e}")
            return BankVerificationResult(
                verified=False,
                message=f"Bank verification service error: {str(e)}",
            )

    @staticmethod
    def _name_matches(expected: str, actual: str) -> bool:
        """Fuzzy name comparison — case-insensitive, ignores extra whitespace."""
        if not expected or not actual:
            return False
        e = " ".join(expected.strip().lower().split())
        a = " ".join(actual.strip().lower().split())

        return e == a or e in a or a in e

bank_service = BankVerificationService()
