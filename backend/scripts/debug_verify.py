import sys
import os
from pathlib import Path

# Add backend dir to pythonpath
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.verification_request import VerificationRequest, VerificationRequestStatus
from app.models.user import User

db = SessionLocal()
# Get first pending verification request
req = db.query(VerificationRequest).filter(VerificationRequest.status == VerificationRequestStatus.ASSIGNED).first()
if not req:
    print("No assigned requests found.")
    sys.exit(0)

# Get the assigned psychologist
user = db.query(User).filter(User.id == req.assigned_psychologist_id).first()
if not user:
    print("User not found.")
    sys.exit(0)

from app.api.routes.psychologist_verification import approve_verification

print(f"Approving request {req.id} for user {user.id}")
try:
    res = approve_verification(request_id=req.id, notes="Debug test", current_user=user, db=db)
    print("Success:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
