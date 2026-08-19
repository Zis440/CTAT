import sys
import os
import uuid
from datetime import datetime

# ── Path setup ────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

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
    print("Seeding Organization Requirements...")
    
    org_reqs = [
        {
            "account_type": "organization",
            "document_type": "cin_certificate",
            "label": "CIN / Registration Certificate",
            "description": "Certificate of Incorporation or Registration Certificate",
            "is_required": True,
            "document_category": "business"
        },
        {
            "account_type": "organization",
            "document_type": "company_pan",
            "label": "Company PAN Card",
            "description": "PAN Card registered under the organization's name",
            "is_required": True,
            "document_category": "business"
        },
        {
            "account_type": "organization",
            "document_type": "gst_certificate",
            "label": "GST Certificate",
            "description": "GST Registration Certificate (Optional)",
            "is_required": False,
            "document_category": "business"
        }
    ]
    
    for r in org_reqs:
        # Check if exists
        cur.execute("SELECT id FROM verification_document_requirements WHERE account_type = %s AND document_type = %s", (r['account_type'], r['document_type']))
        if cur.fetchone():
            print(f"Requirement {r['document_type']} already exists for {r['account_type']}")
            continue
            
        cur.execute("""
            INSERT INTO verification_document_requirements (
                account_type, document_type, label, description, is_required, document_category
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            r['account_type'], r['document_type'], r['label'], r['description'], r['is_required'], r['document_category']
        ))
        print(f"Inserted {r['document_type']}")
        
    conn.commit()
    print("Successfully added org requirements.")
except Exception as e:
    conn.rollback()
    print(f"Failed to update: {e}")
finally:
    cur.close()
    conn.close()
