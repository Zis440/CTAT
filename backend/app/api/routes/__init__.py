"""
API Routes Package
==================
Registers all route modules as FastAPI APIRouters.
Each module handles a specific domain of the Psyichub API.
"""
from app.api.routes.patients import router as patients_router
from app.api.routes.cards import router as cards_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.sessions import router as sessions_router
from app.api.routes.feedback import router as feedback_router
from app.api.routes.audio import router as audio_router
from app.api.routes.reports import router as reports_router
from app.api.routes.admin import router as admin_router

from app.api.routes.verification import router as verification_router
from app.api.routes.support import router as support_router
from app.api.routes.rci_verify import router as rci_verify_router
from app.api.routes.clinic import router as clinic_router
from app.api.routes.appointments import router as appointments_router
from app.api.routes.assessments import router as assessments_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.otp import router as otp_router
from app.api.routes.signup_verify import router as signup_verify_router
from app.api.routes.individual import router as individual_router
from app.api.routes.org_requests import router as org_requests_router
from app.api.routes.psychologist_verification import router as psychologist_verification_router
from app.api.routes.anonymous_links import router as anonymous_links_router
from app.api.routes.anonymous_links import org_router as org_anonymous_links_router
from app.api.routes.anonymous_links import clinic_router as clinic_anonymous_links_router

__all__ = [
    "patients_router",
    "cards_router",
    "analysis_router",
    "sessions_router",
    "feedback_router",
    "audio_router",
    "reports_router",
    "admin_router",
    "verification_router",
    "support_router",
    "rci_verify_router",
    "clinic_router",
    "appointments_router",
    "assessments_router",
    "dashboard_router",
    "otp_router",
    "signup_verify_router",
    "individual_router",
    "org_requests_router",
    "psychologist_verification_router",
    "anonymous_links_router",
    "org_anonymous_links_router",
    "clinic_anonymous_links_router",
]
