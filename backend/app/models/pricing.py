"""
TestPricing model — stores per-test costs for individual vs. clinic accounts.
Only Super Admin can write. All authenticated users can read.
All amounts in paise (₹1 = 100 paise).
"""
import uuid
from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base
from app.utils.id_generator import generate_id

class TestPricing(Base):
    __tablename__ = "test_pricing"

    id = Column(String, primary_key=True, default=lambda: generate_id("PRC"))
    test_type = Column(String, nullable=False, unique=True)
    individual_price_paise = Column(Integer, nullable=False)
    clinic_price_paise = Column(Integer, nullable=False)
    org_price_paise = Column(Integer, nullable=False, default=2000)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def individual_price_rupees(self) -> float:
        return self.individual_price_paise / 100.0

    def clinic_price_rupees(self) -> float:
        return self.clinic_price_paise / 100.0

    def org_price_rupees(self) -> float:
        return self.org_price_paise / 100.0
