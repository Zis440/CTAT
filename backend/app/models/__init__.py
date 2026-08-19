"""
ORM models — explicit imports ensure all tables are registered with
Base.metadata before create_all() is called.
"""
from app.models.user import User  # noqa: F401
from app.models.patient import Patient, Session  # noqa: F401
from app.models.wallet import Wallet, WalletTransaction  # noqa: F401
from app.models.pricing import TestPricing  # noqa: F401
from app.models.support import SupportTicket  # noqa: F401
from app.models.appointment import Appointment  # noqa: F401
from app.models.verification import (  # noqa: F401
    UserVerificationDocument,
    VerificationDocumentRequirement,
)
from app.models.assessment import Assessment  # noqa: F401
from app.models.password_reset import PasswordResetRequest  # noqa: F401
from app.models.clinic import ClinicProfile  # noqa: F401
from app.models.org import OrgProfile  # noqa: F401
from app.models.org_request import OrgAssessmentRequest  # noqa: F401
from app.models.anonymous_link import AnonymousLink  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
