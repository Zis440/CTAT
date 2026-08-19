"""Add assigned_psychologist_id to sessions

Revision ID: a1b2c3d4e5f6
Revises: 33a30281b46b
Create Date: 2026-06-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e4151322f12a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sessions', sa.Column('assigned_psychologist_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_sessions_assigned_psychologist_id',
        'sessions', 'users',
        ['assigned_psychologist_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_sessions_assigned_psychologist_id', 'sessions', type_='foreignkey')
    op.drop_column('sessions', 'assigned_psychologist_id')
