"""Add e_signature_path

Revision ID: 33a30281b46b
Revises: f225654e1267
Create Date: 2026-06-05 04:07:56.068600

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '33a30281b46b'
down_revision: Union[str, None] = 'f225654e1267'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.drop_index(op.f('ix_appointments_date'), table_name='appointments')
    op.create_index(op.f('ix_assessments_id'), 'assessments', ['id'], unique=False)
    op.create_index(op.f('ix_clinic_profiles_clinic_id'), 'clinic_profiles', ['clinic_id'], unique=False)
    op.drop_constraint(op.f('clinic_profiles_clinic_id_fkey'), 'clinic_profiles', type_='foreignkey')
    op.drop_index(op.f('ix_password_resets_token'), table_name='password_resets')
    op.create_index(op.f('ix_password_resets_token'), 'password_resets', ['token'], unique=True)
    op.alter_column('user_verification_documents', 'id',
               existing_type=sa.UUID(),
               type_=sa.String(),
               existing_nullable=False,
               existing_server_default=sa.text('gen_random_uuid()'))
    op.alter_column('user_verification_documents', 'status',
               existing_type=sa.VARCHAR(length=20),
               nullable=False,
               existing_server_default=sa.text("'pending'::character varying"))
    op.drop_constraint(op.f('user_verification_documents_user_id_document_type_key'), 'user_verification_documents', type_='unique')
    op.create_unique_constraint('uq_user_document_type', 'user_verification_documents', ['user_id', 'document_type'])
    op.add_column('users', sa.Column('e_signature_path', sa.String(), nullable=True))

def downgrade() -> None:

    op.drop_column('users', 'e_signature_path')
    op.drop_constraint('uq_user_document_type', 'user_verification_documents', type_='unique')
    op.create_unique_constraint(op.f('user_verification_documents_user_id_document_type_key'), 'user_verification_documents', ['user_id', 'document_type'], postgresql_nulls_not_distinct=False)
    op.alter_column('user_verification_documents', 'status',
               existing_type=sa.VARCHAR(length=20),
               nullable=True,
               existing_server_default=sa.text("'pending'::character varying"))
    op.alter_column('user_verification_documents', 'id',
               existing_type=sa.String(),
               type_=sa.UUID(),
               existing_nullable=False,
               existing_server_default=sa.text('gen_random_uuid()'))
    op.drop_index(op.f('ix_password_resets_token'), table_name='password_resets')
    op.create_index(op.f('ix_password_resets_token'), 'password_resets', ['token'], unique=False)
    op.create_foreign_key(op.f('clinic_profiles_clinic_id_fkey'), 'clinic_profiles', 'users', ['clinic_id'], ['id'])
    op.drop_index(op.f('ix_clinic_profiles_clinic_id'), table_name='clinic_profiles')
    op.drop_index(op.f('ix_assessments_id'), table_name='assessments')
    op.create_index(op.f('ix_appointments_date'), 'appointments', ['appointment_date'], unique=False)
