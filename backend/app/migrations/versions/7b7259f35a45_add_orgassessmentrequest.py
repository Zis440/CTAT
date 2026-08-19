"""Add OrgAssessmentRequest

Revision ID: 7b7259f35a45
Revises: 33a30281b46b
Create Date: 2026-06-05 04:14:40.858837

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '7b7259f35a45'
down_revision: Union[str, None] = '33a30281b46b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.create_table('org_assessment_requests',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('org_id', sa.String(), nullable=False),
    sa.Column('patient_id', sa.String(), nullable=False),
    sa.Column('assessment_id', sa.Integer(), nullable=False),
    sa.Column('assigned_psychologist_id', sa.String(), nullable=True),
    sa.Column('status', sa.Enum('pending', 'assigned', 'completed', 'expired', name='orgrequeststatus'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('sla_deadline', sa.DateTime(timezone=True), nullable=False),
    sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['assigned_psychologist_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['org_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_org_assessment_requests_assigned_psychologist_id'), 'org_assessment_requests', ['assigned_psychologist_id'], unique=False)
    op.create_index(op.f('ix_org_assessment_requests_org_id'), 'org_assessment_requests', ['org_id'], unique=False)
    op.create_index(op.f('ix_org_assessment_requests_patient_id'), 'org_assessment_requests', ['patient_id'], unique=False)

def downgrade() -> None:

    op.drop_index(op.f('ix_org_assessment_requests_patient_id'), table_name='org_assessment_requests')
    op.drop_index(op.f('ix_org_assessment_requests_org_id'), table_name='org_assessment_requests')
    op.drop_index(op.f('ix_org_assessment_requests_assigned_psychologist_id'), table_name='org_assessment_requests')
    op.drop_table('org_assessment_requests')
