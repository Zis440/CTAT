# app/assessments/registry.py

from app.assessments.base import BaseAssessment
from app.assessments.tat.pipeline import TATAssessment

# ─────────────────────────────────────────────────────────────────
# TO ADD A NEW TEST:
#  1. Build your module in app/assessments/<test_name>/
#  2. Import it here and add it to REGISTRY
#  3. That's it — the generic API routes handle the rest
# ─────────────────────────────────────────────────────────────────

REGISTRY: dict[str, type[BaseAssessment]] = {
    "tat": TATAssessment,

    # Uncomment when the module is ready:
    # "empathy_mpaci": EmpathyMPACIAssessment,
    # "conners":       ConnersAssessment,
    # "scl90":         SCL90Assessment,
    # "caars":         CAARSAssessment,
    # "dsmd_adolescent": DSMDAdolescentAssessment,
    # "dsmd_child":    DSMDChildAssessment,
}


def get_assessment(slug: str) -> BaseAssessment:
    cls = REGISTRY.get(slug)
    if not cls:
        raise ValueError(f"No assessment registered for slug: '{slug}'")
    return cls()