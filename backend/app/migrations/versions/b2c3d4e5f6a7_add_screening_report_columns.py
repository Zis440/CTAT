"""Add missing columns to screening_reports

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-12 21:28:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = ('a1b2c3d4e5f6', 'dc256f8ea96e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS patient_id VARCHAR REFERENCES patients(id) ON DELETE SET NULL")
    op.execute("ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Generated'")
    op.execute("ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS verified_by_id VARCHAR REFERENCES users(id) ON DELETE SET NULL")
    op.execute("ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP")
    op.execute("ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS verification_notes TEXT")
    op.execute("ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS changes_history JSONB")

def downgrade() -> None:
    op.drop_column('screening_reports', 'changes_history')
    op.drop_column('screening_reports', 'verification_notes')
    op.drop_column('screening_reports', 'verified_at')
    op.drop_column('screening_reports', 'verified_by_id')
    op.drop_column('screening_reports', 'status')
    op.drop_column('screening_reports', 'patient_id')
