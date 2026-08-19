"""Add title column to users table

Revision ID: 7f4165505966
Revises: 88a743539ab8
Create Date: 2026-06-30 15:44:39.130678

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7f4165505966'
down_revision: Union[str, Sequence[str], None] = '88a743539ab8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    No-op: title column already added by migrations a546ba41cc25 and
    88a743539ab8.  The original auto-generated body incorrectly dropped
    screening_* and verification_requests tables because those models
    were not imported in env.py during autogenerate.
    """
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

