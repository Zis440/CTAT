"""Add can_assess to users

Revision ID: 6e6d2451d082
Revises: 796d3f3947a2
Create Date: 2026-05-30 11:39:00.852007

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '6e6d2451d082'
down_revision: Union[str, None] = '796d3f3947a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.add_column('users', sa.Column('can_assess', sa.Boolean(), nullable=False, server_default=sa.text('false')))

def downgrade() -> None:

    op.drop_column('users', 'can_assess')
