"""
Fix stuck verification requests that were marked VERIFIED
but never had the PDF regenerated (due to the old code bug).
Resets them back to ASSIGNED so they can be re-verified.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models.verification_request import VerificationRequest, VerificationRequestStatus

db = SessionLocal()
try:
    # Find all VERIFIED requests
    verified = db.query(VerificationRequest).filter(
        VerificationRequest.status == VerificationRequestStatus.VERIFIED
    ).all()
    
    print(f"Found {len(verified)} verified requests")
    
    for req in verified:
        print(f"  - Request {req.id}: session={req.session_id}, assigned_to={req.assigned_psychologist_id}")
        # Reset to ASSIGNED so the psychologist can re-verify
        req.status = VerificationRequestStatus.ASSIGNED
        req.completed_at = None
        print(f"    → Reset to ASSIGNED")
    
    db.commit()
    print("\nDone! The psychologist can now re-verify from the Verification Queue.")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
