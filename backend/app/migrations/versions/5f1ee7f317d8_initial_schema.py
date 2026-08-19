"""Initial schema

Revision ID: 5f1ee7f317d8
Revises: 9fd7d2ecda69
Create Date: 2026-05-26 03:03:26.449954

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '5f1ee7f317d8'
down_revision: Union[str, None] = '9fd7d2ecda69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    op.alter_column('patients', 'date_of_birth',
               existing_type=sa.TEXT(),
               type_=sa.Date(),
               existing_nullable=True,
               postgresql_using='date_of_birth::date')
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

def downgrade() -> None:

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
    op.alter_column('patients', 'date_of_birth',
               existing_type=sa.Date(),
               type_=sa.TEXT(),
               existing_nullable=True)
