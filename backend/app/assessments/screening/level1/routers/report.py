from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile, Query
from fastapi.responses import FileResponse
import os
import datetime as dt
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app import models, auth
from app.assessments.screening.level1.services.scoring import generate_report_data
from app.assessments.screening.level1.engines.report_generator import generate_report
from app.assessments.screening.level1.services.screening_level1_adapter import ScreeningLevel1Adapter
from app.utils.file_paths import build_report_path
import json

router = APIRouter()

_generating_reports = set()

def background_generate_and_save_report(assessment_id: str):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        assessment = db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()
        if not assessment:
            return

        user_info = {
            "name": assessment.user.name,
            "email": assessment.user.email,
            "age": assessment.user.age,
            "role": assessment.user.role,
            "organization": assessment.user.organization_id
        }

        q_responses = db.query(models.ScreeningQuestionnaireResponse).filter(
            models.ScreeningQuestionnaireResponse.assessment_id == assessment_id
        ).all()
        g_metrics = db.query(models.ScreeningGameMetric).filter(
            models.ScreeningGameMetric.assessment_id == assessment_id
        ).all()
        story_assessments_db = db.query(models.ScreeningStoryAssessment).filter(
            models.ScreeningStoryAssessment.assessment_id == assessment_id
        ).all()

        story_assessments_data = [{"card_id": t.card_id, "story_text": t.story_text} for t in story_assessments_db if t.story_text]
        patient_context = assessment.patient_context if hasattr(assessment, 'patient_context') else None

        report_data = generate_report_data(user_info, q_responses, g_metrics, story_assessments_data, patient_context)

        try:
            db_report = models.ScreeningReport(assessment_id=assessment_id, json_data=report_data)
            db.add(db_report)
            db.commit()
        except IntegrityError:
            db.rollback()
    except Exception as e:
        print(f"Background report generation failed: {e}")
    finally:
        _generating_reports.discard(assessment_id)
        db.close()

@router.get("/{assessment_id}")
def get_report(assessment_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.ScreeningUser = Depends(auth.get_current_active_user)):

    existing_report = db.query(models.ScreeningReport).filter(models.ScreeningReport.assessment_id == assessment_id).first()
    if existing_report:
        data = existing_report.json_data
        if isinstance(data, str):
            data = json.loads(data)

        return data

    assessment = db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if assessment_id not in _generating_reports:
        _generating_reports.add(assessment_id)
        background_tasks.add_task(background_generate_and_save_report, assessment_id)

    return {"status": "processing"}

@router.post("/{assessment_id}/save-pdf")
async def save_pdf(
    assessment_id: str,
    file: UploadFile = File(...),
    core_patient_id: str = Query(None),
    current_user: models.ScreeningUser = Depends(auth.get_current_active_user)
):

    from app.database import SessionLocal
    temp_db = SessionLocal()
    assessment = temp_db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()
    patient_name = assessment.user.name if assessment and assessment.user else "Anonymous"
    temp_db.close()

    safe_name = "".join([c for c in patient_name if c.isalpha() or c.isdigit() or c==' ']).rstrip().replace(" ", "_")
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{safe_name}_Screening_Report_{timestamp}.pdf"

    file_path, _ = build_report_path(
        user_id=str(current_user.id),
        assessment_slug="screening_level1",
        filename=filename
    )

    with open(file_path, "wb") as buffer:
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="PDF exceeds the 10MB size limit.")
        buffer.write(contents)

    final_path = ScreeningLevel1Adapter.save_report_pdf(
        assessment_id=assessment_id,
        file_path=str(file_path),
        core_patient_id=core_patient_id,
        core_user_id=getattr(current_user, 'core_user_id', None)
    )

    return {"status": "success", "file_path": final_path}

@router.post("/{assessment_id}/download-pdf")
def download_pdf(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: models.ScreeningUser = Depends(auth.get_current_active_user)
):
    existing_report = db.query(models.ScreeningReport).filter(models.ScreeningReport.assessment_id == assessment_id).first()
    if not existing_report:
        raise HTTPException(status_code=404, detail="Report data not found")

    assessment = db.query(models.ScreeningLevel1Session).filter(models.ScreeningLevel1Session.id == assessment_id).first()

    report_data = existing_report.json_data
    if isinstance(report_data, str):
        report_data = json.loads(report_data)

    user_info = {
        "name": getattr(current_user, 'name', 'Staff'),
        "designation": getattr(current_user, 'role', 'Org Staff'),
    }

    patient_info = {
        "name": assessment.user.name if assessment and assessment.user else "Anonymous",
        "patient_id": str(assessment.user.id) if assessment and assessment.user else "Unknown"
    }

    safe_name = "".join([c for c in patient_info["name"] if c.isalpha() or c.isdigit() or c==' ']).rstrip().replace(" ", "_")
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{safe_name}_Screening_Report_{timestamp}.pdf"

    file_path, _ = build_report_path(
        user_id=str(current_user.id),
        assessment_slug="screening_level1",
        filename=filename
    )

    generate_report(
        report=report_data,
        patient_info=patient_info,
        output_path=file_path,
        user_info=user_info
    )

    return FileResponse(file_path, media_type="application/pdf", filename=filename)
