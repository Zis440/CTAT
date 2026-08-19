"""
ORM models — explicit imports ensure all tables are registered with
Base.metadata before create_all() is called.
"""
from app.models.user import User
from app.models.patient import Patient, Session
from app.models.wallet import Wallet, WalletTransaction
from app.models.pricing import TestPricing
from app.models.support import SupportTicket
from app.models.appointment import Appointment
from app.models.verification import (
    UserVerificationDocument,
    VerificationDocumentRequirement,
)
from app.models.assessment import Assessment
from app.models.password_reset import PasswordResetRequest
from app.models.clinic import ClinicProfile
from app.models.org import OrgProfile
from app.models.org_request import OrgAssessmentRequest
from app.models.anonymous_link import AnonymousLink
from app.models.audit_log import AuditLog
