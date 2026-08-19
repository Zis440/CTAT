"""Add title column to users table

Revision ID: 88a743539ab8
Revises: a546ba41cc25
Create Date: 2026-06-30 14:32:15.857394

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '88a743539ab8'
down_revision: Union[str, Sequence[str], None] = 'a546ba41cc25'
branch_labels: Union[str, Sequence[str], None] = None
def upgrade() -> None:
    # Check if column exists first
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [col['name'] for col in insp.get_columns('users')]
    if 'title' not in columns:
        op.add_column('users', sa.Column('title', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'title')
