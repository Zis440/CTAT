from sqlalchemy import Column, String
from app.database import Base

class ClinicProfile(Base):
    __tablename__ = "clinic_profiles"

    clinic_id = Column(String, primary_key=True, index=True)
    clinic_name = Column(String, nullable=True)
    tagline = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    support_phone = Column(String, nullable=True)
    logo_path = Column(String, nullable=True)
    cover_path = Column(String, nullable=True)

    def __repr__(self) -> str:
        return f"<ClinicProfile {self.clinic_id}>"
