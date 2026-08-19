from sqlalchemy import Column, String, Numeric, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String, primary_key=True, default=lambda: generate_id("ASM"))
    slug = Column(String(100), unique=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(255), nullable=False)
    clinic_price = Column(Numeric(10, 2), nullable=True)
    psychologist_price = Column(Numeric(10, 2), nullable=True)
    org_price = Column(Numeric(10, 2), nullable=True)
    is_coming_soon = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
