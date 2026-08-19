"""
Clinician feedback API routes for active learning calibration.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.api.dependencies import engines
from app.schemas.analysis import FeedbackRequest

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("")
async def submit_feedback(req: FeedbackRequest):
    """Record a clinician correction for active learning."""
    try:
        _feedback_store = engines['feedback_store']
        filename = _feedback_store.record_feedback(
            session_id=req.session_id,
            card_id=req.card_id,
            feedback_type=req.feedback_type,
            payload=req.payload,
        )
        return {"status": "recorded", "file": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_feedback(
    feedback_type: Optional[str] = None,
    session_id: Optional[str] = None,
    limit: int = 50,
):
    """Retrieve accumulated feedback records."""
    try:
        _feedback_store = engines['feedback_store']
        records = _feedback_store.get_feedback(
            feedback_type=feedback_type,
            session_id=session_id,
            limit=limit,
        )
        return {"count": len(records), "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def feedback_stats():
    """Get feedback statistics for monitoring."""
    try:
        _feedback_store = engines['feedback_store']
        total = _feedback_store.count()
        by_type = {}
        from app.learning.feedback_store import FeedbackStore
        for ft in FeedbackStore.VALID_TYPES:
            by_type[ft] = _feedback_store.count(feedback_type=ft)
        return {"total": total, "by_type": by_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
