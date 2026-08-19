import sys
import os
import secrets
import string
import time
from datetime import datetime, timedelta, timezone

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.password_reset import PasswordResetRequest, ResetRequestStatus

def generate_token(length=32) -> str:
    """Generate a secure random token."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(length))

def process_pending_resets():
    db: Session = SessionLocal()
    try:
        pending_requests = db.query(PasswordResetRequest).filter(
            PasswordResetRequest.status == ResetRequestStatus.pending
        ).all()

        if not pending_requests:
            print(f"[{datetime.now().isoformat()}] No pending password reset requests.")
            return

        print(f"[{datetime.now().isoformat()}] Found {len(pending_requests)} pending request(s). Processing...")

        for req in pending_requests:

            req.token = generate_token()

            req.expires_at = datetime.now(timezone.utc) + timedelta(hours=2)

            reset_link = f"http://localhost:5173/reset-password/{req.token}"

            print("-" * 40)
            print(f"EMAIL NOTIFICATION SIMULATION")
            print(f"To: {req.email}")
            print(f"Subject: Password Reset Request")
            print(f"Body:\nHello,\n\nWe received a request to reset your password.")
            print(f"Click the link below to reset it (valid for 2 hours):\n{reset_link}")
            print("-" * 40)

            req.status = ResetRequestStatus.sent

        db.commit()
        print(f"[{datetime.now().isoformat()}] Finished processing requests.")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting Password Reset Processor...")
    process_pending_resets()
