"""add missing screening_level1_sessions columns

Revision ID: c3d4e5f6a8b9
Revises: b2c3d4e5f6a8
Create Date: 2026-06-18 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a8b9'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add columns if they are missing
    op.execute("ALTER TABLE screening_level1_sessions ADD COLUMN IF NOT EXISTS session_data_path VARCHAR")
    op.execute("ALTER TABLE screening_level1_sessions ADD COLUMN IF NOT EXISTS pdf_filename VARCHAR")
    op.execute("ALTER TABLE screening_level1_sessions ADD COLUMN IF NOT EXISTS patient_context JSON")


def downgrade() -> None:
    op.execute("ALTER TABLE screening_level1_sessions DROP COLUMN IF EXISTS patient_context")
    op.execute("ALTER TABLE screening_level1_sessions DROP COLUMN IF EXISTS pdf_filename")
    op.execute("ALTER TABLE screening_level1_sessions DROP COLUMN IF EXISTS session_data_path")
