"""
Organization profile model.
"""
from sqlalchemy import Column, String
from app.database import Base

class OrgProfile(Base):
    __tablename__ = "org_profiles"

    org_id        = Column(String, primary_key=True)  # References User.clinic_id
    org_name      = Column(String, nullable=True)
    tagline       = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    support_phone = Column(String, nullable=True)
    logo_path     = Column(String, nullable=True)
    cover_path    = Column(String, nullable=True)
