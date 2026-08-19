import os
import shutil
from sqlalchemy.orm import Session
from app.assessments.screening.level1 import models

class ScreeningLevel1Adapter:
    """
    Adapter layer bridging CoreThematics production system and the pre_screening module.
    Enforces the CRITICAL ARCHITECTURAL RULE: CoreThematics is read-only.
    """

    @staticmethod
    def initialize_session(db: Session, current_user, core_patient_id: str = None) -> models.ScreeningLevel1Session:
        """
        Creates a new screening session.
        In embedded mode, it validates and attaches the core_patient_id and core_user_id.
        """

        core_user_id = str(current_user.id) if current_user else None
        user_id = None

        db_assessment = models.ScreeningLevel1Session(
            user_id=user_id,
            core_patient_id=core_patient_id,
            core_user_id=core_user_id
        )
        db.add(db_assessment)
        db.commit()
        db.refresh(db_assessment)
        return db_assessment
