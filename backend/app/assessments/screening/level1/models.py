from sqlalchemy import Column, String, Float, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
from app.utils.id_generator import generate_id

class ScreeningUser(Base):
    __tablename__ = "screening_users"

    id = Column(String, primary_key=True, default=lambda: generate_id("SCU"))
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    age = Column(String, nullable=False)
    role = Column(String, default="employee")
    organization_id = Column(String, nullable=True)

    assessments = relationship("ScreeningLevel1Session", back_populates="user", cascade="all, delete-orphan")

class ScreeningLevel1Session(Base):
    __tablename__ = "screening_level1_sessions"

    id = Column(String, primary_key=True, default=lambda: generate_id("SCR"))
    user_id = Column(String, ForeignKey("screening_users.id"))

    core_patient_id = Column(String, nullable=True, index=True)
    core_user_id = Column(String, nullable=True, index=True)

    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)

    session_data_path = Column(String, nullable=True)
    pdf_filename = Column(String, nullable=True)

    user = relationship("ScreeningUser", back_populates="assessments")
    questionnaire_responses = relationship("ScreeningQuestionnaireResponse", back_populates="assessment", cascade="all, delete-orphan")
    game_metrics = relationship("ScreeningGameMetric", back_populates="assessment", cascade="all, delete-orphan")
    story_assessments = relationship("ScreeningStoryAssessment", back_populates="assessment", cascade="all, delete-orphan")
    patient_context = Column(JSON, nullable=True)
    report = relationship("ScreeningReport", back_populates="assessment", uselist=False, cascade="all, delete-orphan")

class ScreeningQuestionnaireResponse(Base):
    __tablename__ = "screening_questionnaire_responses"

    id = Column(String, primary_key=True, default=lambda: generate_id("SQR"))
    assessment_id = Column(String, ForeignKey("screening_level1_sessions.id"))
    question_id = Column(String, index=True)
    score = Column(String)

    assessment = relationship("ScreeningLevel1Session", back_populates="questionnaire_responses")

class ScreeningGameMetric(Base):
    __tablename__ = "screening_game_metrics"

    id = Column(String, primary_key=True, default=lambda: generate_id("SGM"))
    assessment_id = Column(String, ForeignKey("screening_level1_sessions.id"))
    game_type = Column(String)
    score = Column(Float)
    movement_count = Column(String)
    completion_time_seconds = Column(Float)
    advanced_metrics = Column(JSON, nullable=True)

    assessment = relationship("ScreeningLevel1Session", back_populates="game_metrics")

class ScreeningStoryAssessment(Base):
    __tablename__ = "screening_story_assessments"

    id = Column(String, primary_key=True, default=lambda: generate_id("SSA"))
    assessment_id = Column(String, ForeignKey("screening_level1_sessions.id"))
    card_id = Column(String)
    story_text = Column(Text)
    movement_count = Column(String)
    completion_time_seconds = Column(Float)

    assessment = relationship("ScreeningLevel1Session", back_populates="story_assessments")

class ScreeningReport(Base):
    __tablename__ = "screening_reports"

    id = Column(String, primary_key=True, default=lambda: generate_id("SRP"))
    assessment_id = Column(String, ForeignKey("screening_level1_sessions.id"), unique=True)
    json_data = Column(JSON)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=True)
    status = Column(String, default="Draft")
    verified_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)
    changes_history = Column(JSON, nullable=True)

    assessment = relationship("ScreeningLevel1Session", back_populates="report")
