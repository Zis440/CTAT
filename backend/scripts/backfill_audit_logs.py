import os
import sys
from pathlib import Path

# Add backend directory to python path
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.patient import Patient
from app.assessments.screening.level1.models import ScreeningLevel1Session

def backfill():
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).filter(AuditLog.target_user_id.is_(None)).all()
        print(f"Found {len(logs)} logs with missing target_user_id")
        updated_count = 0
        skipped_count = 0
        
        # Cache patient_id → user_id lookups to avoid repeated queries
        patient_user_cache: dict[str, str | None] = {}
        
        for log in logs:
            patient_id = None
            details = log.details or {}
            
            # Check for patient_id directly in details
            if "patient_id" in details:
                patient_id = details["patient_id"]
            # Check for assessment_id in details (screening level 1)
            elif "assessment_id" in details:
                assess_id = details["assessment_id"]
                session = db.query(ScreeningLevel1Session).filter(ScreeningLevel1Session.id == str(assess_id)).first()
                if session:
                    patient_id = session.core_patient_id
            
            if patient_id:
                # Resolve patient_id to the owning user_id
                if patient_id not in patient_user_cache:
                    patient = db.query(Patient).filter(Patient.id == patient_id).first()
                    patient_user_cache[patient_id] = patient.user_id if patient else None
                
                user_id = patient_user_cache[patient_id]
                if user_id:
                    log.target_user_id = user_id
                    updated_count += 1
                else:
                    skipped_count += 1
            
        db.commit()
        print(f"Successfully backfilled {updated_count} audit log entries. Skipped {skipped_count} (no matching user).")
    except Exception as e:
        db.rollback()
        print(f"Error occurred during backfill: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    backfill()

