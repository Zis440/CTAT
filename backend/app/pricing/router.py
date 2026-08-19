"""
Pricing API router — /api/pricing/*

Endpoints:
  GET   /api/pricing        — All active test prices (any authenticated user)
  POST  /api/pricing        — Create new pricing entry (Super Admin only)
  PATCH /api/pricing/{id}   — Update prices (Super Admin only)
  DELETE /api/pricing/{id}  — Soft-delete (Super Admin only)
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator

from app.database import get_db
from app.models.user import User
from app.auth.dependencies import get_current_user, require_super_admin
from app.models.pricing import TestPricing

router = APIRouter(prefix="/api/pricing", tags=["pricing"])

class PricingOut(BaseModel):
    id: str
    test_type: str
    individual_price_paise: int
    individual_price_rupees: float
    clinic_price_paise: int
    clinic_price_rupees: float
    org_price_paise: int
    org_price_rupees: float
    is_active: bool

    model_config = {"from_attributes": True}

class CreatePricingRequest(BaseModel):
    test_type: str
    individual_price_paise: int
    clinic_price_paise: int
    org_price_paise: int

    @field_validator("individual_price_paise", "clinic_price_paise", "org_price_paise")
    @classmethod
    def positive(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Price cannot be negative")
        return v

class UpdatePricingRequest(BaseModel):
    individual_price_paise: int | None = None
    clinic_price_paise: int | None = None
    org_price_paise: int | None = None
    is_active: bool | None = None

@router.get("/", response_model=List[PricingOut])
def get_pricing(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(TestPricing).filter(TestPricing.is_active == True).all()
    return [
        PricingOut(
            id=r.id,
            test_type=r.test_type,
            individual_price_paise=r.individual_price_paise,
            individual_price_rupees=r.individual_price_paise / 100.0,
            clinic_price_paise=r.clinic_price_paise,
            clinic_price_rupees=r.clinic_price_paise / 100.0,
            org_price_paise=r.org_price_paise,
            org_price_rupees=r.org_price_paise / 100.0,
            is_active=r.is_active,
        )
        for r in rows
    ]

@router.post("/", response_model=PricingOut, status_code=201)
def create_pricing(
    req: CreatePricingRequest,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    if db.query(TestPricing).filter(TestPricing.test_type == req.test_type).first():
        raise HTTPException(status_code=409, detail="Test type already exists")
    row = TestPricing(
        test_type=req.test_type,
        individual_price_paise=req.individual_price_paise,
        clinic_price_paise=req.clinic_price_paise,
        org_price_paise=req.org_price_paise,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return PricingOut(
        id=row.id,
        test_type=row.test_type,
        individual_price_paise=row.individual_price_paise,
        individual_price_rupees=row.individual_price_paise / 100.0,
        clinic_price_paise=row.clinic_price_paise,
        clinic_price_rupees=row.clinic_price_paise / 100.0,
        org_price_paise=row.org_price_paise,
        org_price_rupees=row.org_price_paise / 100.0,
        is_active=row.is_active,
    )

@router.patch("/{pricing_id}", response_model=PricingOut)
def update_pricing(
    pricing_id: str,
    req: UpdatePricingRequest,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    row = db.query(TestPricing).filter(TestPricing.id == pricing_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Pricing entry not found")
    if req.individual_price_paise is not None:
        row.individual_price_paise = req.individual_price_paise
    if req.clinic_price_paise is not None:
        row.clinic_price_paise = req.clinic_price_paise
    if req.org_price_paise is not None:
        row.org_price_paise = req.org_price_paise
    if req.is_active is not None:
        row.is_active = req.is_active
    db.commit()
    db.refresh(row)
    return PricingOut(
        id=row.id,
        test_type=row.test_type,
        individual_price_paise=row.individual_price_paise,
        individual_price_rupees=row.individual_price_paise / 100.0,
        clinic_price_paise=row.clinic_price_paise,
        clinic_price_rupees=row.clinic_price_paise / 100.0,
        org_price_paise=row.org_price_paise,
        org_price_rupees=row.org_price_paise / 100.0,
        is_active=row.is_active,
    )
