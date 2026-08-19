"""Add verification_requests table

Revision ID: 543976e5bb68
Revises: a835167e1b74
Create Date: 2026-06-12 22:37:34.750562

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '543976e5bb68'
down_revision: Union[str, None] = 'a835167e1b74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.create_table(
        'verification_requests',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('assigned_psychologist_id', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'ASSIGNED', 'VERIFIED', 'REJECTED', 'EXPIRED', name='verificationrequeststatus'), nullable=False),
        sa.Column('assignment_attempts', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_psychologist_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_verification_requests_assigned_psychologist_id'), 'verification_requests', ['assigned_psychologist_id'], unique=False)
    op.create_index(op.f('ix_verification_requests_session_id'), 'verification_requests', ['session_id'], unique=False)
    op.create_index(op.f('ix_verification_requests_status'), 'verification_requests', ['status'], unique=False)

def downgrade() -> None:

    op.drop_index(op.f('ix_verification_requests_status'), table_name='verification_requests')
    op.drop_index(op.f('ix_verification_requests_session_id'), table_name='verification_requests')
    op.drop_index(op.f('ix_verification_requests_assigned_psychologist_id'), table_name='verification_requests')
    op.drop_table('verification_requests')
    op.execute('DROP TYPE verificationrequeststatus')
