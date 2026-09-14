from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, models, auth
from app.assessments.screening.level1.utils.question_bank import get_all_questions
from app.assessments.screening.level1.services.ollama_client import get_llm_insight
from app.assessments.screening.level1.services.screening_level1_adapter import ScreeningLevel1Adapter
from datetime import datetime

router = APIRouter()

@router.get("/questions")
def get_questions(current_user: models.ScreeningUser = Depends(auth.get_current_active_user)):
    return get_all_questions()

@router.get("/insight")
async def get_insight(
    context: str = Query("general", description="Current assessment phase hint"),
    current_user: models.ScreeningUser = Depends(auth.get_current_active_user)
):
    """Return an LLM-generated or curated insight message for the current phase."""
    insight = await get_llm_insight(context)
    return insight

@router.post("/start", response_model=schemas.AssessmentResponse)
def start_assessment(
    core_patient_id: str = Query(None, description="Required in embedded mode to link to CoreTAT patient"),
    db: Session = Depends(get_db),
    current_user: models.ScreeningUser = Depends(auth.get_current_active_user)
):
    try:
        db_assessment = ScreeningLevel1Adapter.initialize_session(db, current_user, core_patient_id)
        return db_assessment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

from fastapi import BackgroundTasks
from app.assessments.screening.level1.routers.report import background_generate_and_save_report

@router.post("/{assessment_id}/complete")
def complete_assessment(assessment_id: str, data: schemas.AssessmentComplete, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.ScreeningUser = Depends(auth.get_current_active_user)):
    assessment = db.query(models.ScreeningLevel1Session).filter(
        models.ScreeningLevel1Session.id == assessment_id,
        models.ScreeningLevel1Session.user_id == current_user.id
    ).first()
    if not assessment:
        return {"error": "Assessment not found"}

    if data.questionnaire_responses:
        db.add_all([
            models.ScreeningQuestionnaireResponse(
                assessment_id=assessment_id,
                question_id=q.question_id,
                score=q.score
            ) for q in data.questionnaire_responses
        ])

    if data.game_metrics:
        db.add_all([
            models.ScreeningGameMetric(
                assessment_id=assessment_id,
                game_type=g.game_type,
                score=g.score,
                movement_count=g.movement_count,
                completion_time_seconds=g.completion_time_seconds,
                advanced_metrics=g.advanced_metrics
            ) for g in data.game_metrics
        ])

    if data.patient_context:
        assessment.patient_context = data.patient_context.model_dump()

    if data.story_assessments:
        db.add_all([
            models.ScreeningStoryAssessment(
                assessment_id=assessment_id,
                card_id=story.card_id,
                story_text=story.story_text,
                movement_count=story.movement_count,
                completion_time_seconds=story.completion_time_seconds
            ) for story in data.story_assessments
        ])

    assessment.end_time = datetime.utcnow()
    db.commit()

    background_tasks.add_task(background_generate_and_save_report, assessment_id)

    return {"message": "Assessment completed successfully"}
