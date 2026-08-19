"""Add title to users

Revision ID: a546ba41cc25
Revises: 1dae21e58313
Create Date: 2026-06-30 14:07:25.857296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a546ba41cc25'
down_revision: Union[str, Sequence[str], None] = '1dae21e58313'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [col['name'] for col in insp.get_columns('users')]
    if 'title' not in columns:
        op.add_column('users', sa.Column('title', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'title')
