"""add bio to users

Revision ID: d4e5f6a8b9c0
Revises: c3d4e5f6a8b9
Create Date: 2026-07-08 17:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a8b9c0'
down_revision = '7f4165505966'
branch_labels = None
depends_on = None

def upgrade() -> None:

    op.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;')

def downgrade() -> None:
    op.drop_column('users', 'bio')
