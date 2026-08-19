"""Add patient context fields

Revision ID: e4151322f12a
Revises: f4234953e59d
Create Date: 2026-06-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e4151322f12a'
down_revision: Union[str, None] = 'f4234953e59d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.add_column('patients', sa.Column('gender_confidence', sa.Float(), nullable=True))
    op.add_column('patients', sa.Column('living_condition', sa.String(), nullable=True))
    op.add_column('patients', sa.Column('family_structure', sa.String(), nullable=True))
    op.add_column('patients', sa.Column('residence_type', sa.String(), nullable=True))
    op.add_column('patients', sa.Column('environment_type', sa.String(), nullable=True))
    op.add_column('patients', sa.Column('education_level', sa.String(), nullable=True))
    op.add_column('patients', sa.Column('occupation', sa.String(), nullable=True))
    op.add_column('patients', sa.Column('socioeconomic_status', sa.String(), nullable=True))

def downgrade() -> None:

    op.drop_column('patients', 'socioeconomic_status')
    op.drop_column('patients', 'occupation')
    op.drop_column('patients', 'education_level')
    op.drop_column('patients', 'environment_type')
    op.drop_column('patients', 'residence_type')
    op.drop_column('patients', 'family_structure')
    op.drop_column('patients', 'living_condition')
    op.drop_column('patients', 'gender_confidence')
