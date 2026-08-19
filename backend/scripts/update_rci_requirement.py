import sys
import os

# ── Path setup ────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

import psycopg2

DATABASE_URL = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')

if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    sys.exit(1)

# ── Connect ───────────────────────────────────────────────────────
try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()
    print("Connected to PostgreSQL\n")
except Exception as e:
    print(f"Failed to connect: {e}")
    sys.exit(1)

try:
    print("Updating RCI Certificate requirement...")
    
    cur.execute("""
        UPDATE verification_document_requirements 
        SET is_required = true 
        WHERE account_type = 'individual' 
        AND document_type = 'professional_license'
    """)
    
    conn.commit()
    print("Successfully updated database requirement.")
except Exception as e:
    conn.rollback()
    print(f"Failed to update: {e}")
finally:
    cur.close()
    conn.close()
