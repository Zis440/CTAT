from pydantic import BaseModel
from typing import Optional


class AssessmentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    isComingSoon: Optional[bool] = None
    clinicPrice: Optional[float] = None
    psychologistPrice: Optional[float] = None
    orgPrice: Optional[float] = None


class AssessmentResponse(BaseModel):
    id: str
    slug: Optional[str] = None
    name: str
    category: str
    clinicPrice: Optional[float] = None
    psychologistPrice: Optional[float] = None
    orgPrice: Optional[float] = None
    isComingSoon: Optional[bool] = False
