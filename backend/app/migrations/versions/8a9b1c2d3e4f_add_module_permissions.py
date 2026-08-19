"""Add module_permissions to users

Revision ID: 8a9b1c2d3e4f
Revises: 6e6d2451d082
Create Date: 2026-06-01 12:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '8a9b1c2d3e4f'
down_revision: Union[str, None] = '6e6d2451d082'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('users', sa.Column('module_permissions', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'module_permissions')
