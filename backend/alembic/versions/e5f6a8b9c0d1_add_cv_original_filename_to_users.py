"""add cv_original_filename to users

Revision ID: e5f6a8b9c0d1
Revises: d4e5f6a8b9c0
Create Date: 2026-07-08 19:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e5f6a8b9c0d1'
down_revision = 'd4e5f6a8b9c0'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS cv_original_filename VARCHAR;')

def downgrade() -> None:
    op.drop_column('users', 'cv_original_filename')
