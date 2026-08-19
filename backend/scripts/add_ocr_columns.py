"""
Migration script: Add missing OCR & verification columns to user_verification_documents table.
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin123@localhost:5432/psyichub")

engine = create_engine(DATABASE_URL)

ALTER_SQL = """
ALTER TABLE user_verification_documents
    ADD COLUMN IF NOT EXISTS detected_document_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ocr_fields JSON,
    ADD COLUMN IF NOT EXISTS ocr_confidence FLOAT,
    ADD COLUMN IF NOT EXISTS verification_response JSON,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50);
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        conn.execute(text(ALTER_SQL))
        conn.commit()
    print("Migration complete: added missing columns to user_verification_documents.")
