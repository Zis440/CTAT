"""Add new consent checkboxes

Revision ID: 588d685f7614
Revises: a1b2c3d4e5f6
Create Date: 2026-06-12 12:44:58.932877

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '588d685f7614'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('ai_disclaimer_accepted', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('refund_policy_accepted', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('professional_responsibility_accepted', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'professional_responsibility_accepted')
    op.drop_column('users', 'refund_policy_accepted')
    op.drop_column('users', 'ai_disclaimer_accepted')