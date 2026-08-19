"""Add AnonymousLink

Revision ID: fdbfa151f000
Revises: 7b7259f35a45
Create Date: 2026-06-05 04:23:03.352489

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'fdbfa151f000'
down_revision: Union[str, None] = '7b7259f35a45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.create_table('anonymous_links',
    sa.Column('token', sa.String(), nullable=False),
    sa.Column('org_id', sa.String(), nullable=False),
    sa.Column('assessment_id', sa.Integer(), nullable=False),
    sa.Column('used', sa.Boolean(), nullable=False),
    sa.Column('resulting_patient_id', sa.String(), nullable=True),
    sa.Column('resulting_session_id', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['org_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['resulting_patient_id'], ['patients.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['resulting_session_id'], ['sessions.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('token')
    )
    op.create_index(op.f('ix_anonymous_links_org_id'), 'anonymous_links', ['org_id'], unique=False)

def downgrade() -> None:

    op.drop_index(op.f('ix_anonymous_links_org_id'), table_name='anonymous_links')
    op.drop_table('anonymous_links')
