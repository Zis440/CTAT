"""add patient_id to screening_reports

Revision ID: a1b2c3d4e5f6
Revises: cbd64bdc05ee
Create Date: 2026-06-12 23:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'cbd64bdc05ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [col['name'] for col in insp.get_columns('screening_reports')]
    if 'patient_id' not in columns:
        op.add_column('screening_reports', sa.Column('patient_id', sa.String(), nullable=True))

    try:
        op.create_foreign_key(
            'fk_screening_reports_patient_id',
            'screening_reports', 'patients',
            ['patient_id'], ['id']
        )
    except Exception:
        pass

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_screening_reports_patient_id', 'screening_reports', type_='foreignkey')
    op.drop_column('screening_reports', 'patient_id')
