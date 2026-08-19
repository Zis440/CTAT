"""initial migration

Revision ID: cbd64bdc05ee
Revises:
Create Date: 2026-06-12 22:57:27.692764

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'cbd64bdc05ee'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [col['name'] for col in insp.get_columns('users')]

    if 'rating' not in columns:
        op.add_column('users', sa.Column('rating', sa.Float(), nullable=True))
    if 'experience_years' not in columns:
        op.add_column('users', sa.Column('experience_years', sa.Integer(), nullable=True))
    if 'total_verifications_done' not in columns:
        op.add_column('users', sa.Column('total_verifications_done', sa.Integer(), server_default='0', nullable=False))

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'total_verifications_done')
    op.drop_column('users', 'experience_years')
    op.drop_column('users', 'rating')
