"""Add password_resets table

Revision ID: 796d3f3947a2
Revises: 5f1ee7f317d8
Create Date: 2026-05-27 20:25:05.726273

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '796d3f3947a2'
down_revision: Union[str, None] = '5f1ee7f317d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.create_table('password_resets',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('token', sa.String(), nullable=True),
    sa.Column('status', sa.Enum('pending', 'sent', 'completed', name='resetrequeststatus'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_password_resets_email'), 'password_resets', ['email'], unique=False)
    op.create_index(op.f('ix_password_resets_token'), 'password_resets', ['token'], unique=True)
    op.create_index(op.f('ix_password_resets_user_id'), 'password_resets', ['user_id'], unique=False)
    op.drop_index('ix_appointments_date', table_name='appointments')
    op.create_index(op.f('ix_assessments_id'), 'assessments', ['id'], unique=False)

def downgrade() -> None:

    op.drop_index(op.f('ix_assessments_id'), table_name='assessments')
    op.create_index('ix_appointments_date', 'appointments', ['appointment_date'], unique=False)
    op.drop_index(op.f('ix_password_resets_user_id'), table_name='password_resets')
    op.drop_index(op.f('ix_password_resets_token'), table_name='password_resets')
    op.drop_index(op.f('ix_password_resets_email'), table_name='password_resets')
    op.drop_table('password_resets')
