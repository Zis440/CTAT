
from app.assessments.base import BaseAssessment
from app.assessments.tat.pipeline import TATAssessment

REGISTRY: dict[str, type[BaseAssessment]] = {
    "tat": TATAssessment,

}

def get_assessment(slug: str) -> BaseAssessment:
    cls = REGISTRY.get(slug)
    if not cls:
        raise ValueError(f"No assessment registered for slug: '{slug}'")
    return cls()
