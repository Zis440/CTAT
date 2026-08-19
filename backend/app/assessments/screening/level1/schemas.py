from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenRefresh(BaseModel):
    refresh_token: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserBase(BaseModel):
    email: EmailStr
    name: str
    age: int = Field(..., ge=19, le=64, description="Age must be between 19 and 64")
    role: str = "employee"
    organization_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    class Config:
        from_attributes = True

class QuestionnaireResponseInput(BaseModel):
    question_id: str
    score: int

class GameMetricInput(BaseModel):
    game_type: str
    score: float
    movement_count: int
    completion_time_seconds: float
    advanced_metrics: Optional[Dict[str, Any]] = None

class PatientContextInput(BaseModel):
    age: int
    gender: str
    living_condition: str
    family_structure: str
    residence_type: str
    environment_type: str
    education_level: str
    occupation: str
    socioeconomic_status: str

class StoryAssessmentInput(BaseModel):
    card_id: str
    story_text: str
    movement_count: int
    completion_time_seconds: float

class AssessmentComplete(BaseModel):
    patient_context: Optional[PatientContextInput] = None
    questionnaire_responses: List[QuestionnaireResponseInput]
    game_metrics: List[GameMetricInput]
    story_assessments: Optional[List[StoryAssessmentInput]] = []
    request_validation: Optional[bool] = False

class AssessmentResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    core_patient_id: Optional[str] = None
    core_user_id: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    class Config:
        from_attributes = True

class ReportResponse(BaseModel):
    id: str
    assessment_id: str
    json_data: Dict[str, Any]
    generated_at: datetime
    class Config:
        from_attributes = True
