"""initial_schema

Revision ID: 9fd7d2ecda69
Revises:
Create Date: 2026-05-15 03:33:08.299294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '9fd7d2ecda69'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.drop_table('test_pricing')
    op.add_column('users', sa.Column('first_name', sa.String(), nullable=False))
    op.add_column('users', sa.Column('last_name', sa.String(), nullable=True))
    op.drop_column('users', 'plain_password')
    op.drop_column('users', 'full_name')

def downgrade() -> None:

    op.add_column('users', sa.Column('full_name', sa.VARCHAR(), autoincrement=False, nullable=False))
    op.add_column('users', sa.Column('plain_password', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
    op.create_table('test_pricing',
    sa.Column('id', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('test_type', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('individual_price_paise', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('clinic_price_paise', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('is_active', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name='test_pricing_pkey'),
    sa.UniqueConstraint('test_type', name='test_pricing_test_type_key')
    )
