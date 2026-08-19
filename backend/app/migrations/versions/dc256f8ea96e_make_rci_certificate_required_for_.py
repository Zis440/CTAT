"""make rci certificate required for individual

Revision ID: dc256f8ea96e
Revises: 588d685f7614
Create Date: 2026-06-12 17:00:31.144616

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'dc256f8ea96e'
down_revision: Union[str, None] = '588d685f7614'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("""
        UPDATE verification_document_requirements
        SET is_required = true
        WHERE account_type = 'individual'
        AND document_type = 'professional_license'
    """)

def downgrade() -> None:
    op.execute("""
        UPDATE verification_document_requirements
        SET is_required = false
        WHERE account_type = 'individual'
        AND document_type = 'professional_license'
    """)
