"""Add OCR and Validation fields to UserVerificationDocument

Revision ID: 1dae21e58313
Revises: c3d4e5f6a8b9
Create Date: 2026-06-30 01:57:24.301550

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1dae21e58313'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [col['name'] for col in insp.get_columns('user_verification_documents')]
    if 'detected_document_type' not in columns:
        op.add_column('user_verification_documents', sa.Column('detected_document_type', sa.String(length=100), nullable=True))
    if 'ocr_fields' not in columns:
        op.add_column('user_verification_documents', sa.Column('ocr_fields', sa.JSON(), nullable=True))
    if 'ocr_confidence' not in columns:
        op.add_column('user_verification_documents', sa.Column('ocr_confidence', sa.Float(), nullable=True))
    if 'verification_response' not in columns:
        op.add_column('user_verification_documents', sa.Column('verification_response', sa.JSON(), nullable=True))
    if 'verification_status' not in columns:
        op.add_column('user_verification_documents', sa.Column('verification_status', sa.String(length=50), nullable=True))
    
    # Drop old constraint (if it exists) and recreate properly
    try:
        op.drop_constraint('user_verification_documents_user_id_document_type_key', 'user_verification_documents', type_='unique')
    except Exception:
        pass
    try:
        op.create_unique_constraint('uq_user_document_type', 'user_verification_documents', ['user_id', 'document_type'])
    except Exception:
        pass


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_user_document_type', 'user_verification_documents', type_='unique')
    op.create_unique_constraint('user_verification_documents_user_id_document_type_key', 'user_verification_documents', ['user_id', 'document_type'])
    op.drop_column('user_verification_documents', 'verification_status')
    op.drop_column('user_verification_documents', 'verification_response')
    op.drop_column('user_verification_documents', 'ocr_confidence')
    op.drop_column('user_verification_documents', 'ocr_fields')
    op.drop_column('user_verification_documents', 'detected_document_type')
