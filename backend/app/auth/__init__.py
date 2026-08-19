# Auth module — JWT-based authentication for Psyichub

# Re-export models from app.models for backwards compatibility
from app.models.user import User, UserRole, AccountType, VerificationStatus  # noqa: F401
