# Re-export models from app.models for backwards compatibility
from app.models.patient import Patient  # noqa: F401
from app.models.patient import Session  # noqa: F401
