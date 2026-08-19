"""
seed_db.py
──────────
Seeds the PostgreSQL database with:
  1. Super Admin user  (admin@ct.com / admin123)
  2. Default TAT test pricing

Usage (with venv active, from backend/ directory):
    python scripts/seed_db.py

Run this AFTER:
    alembic upgrade head
"""

import sys
import os
import uuid
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

import psycopg2
import bcrypt

DATABASE_URL = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env")
    sys.exit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()
    print("✅ Connected to PostgreSQL\n")
except Exception as e:
    print(f"❌ Failed to connect: {e}")
    sys.exit(1)

try:

    print("Seeding: super_admin user")

    ADMIN_EMAIL     = "admin@ct.com"
    ADMIN_PASSWORD  = "admin123"
    ADMIN_ID        = str(uuid.uuid4())

    cur.execute("SELECT id FROM users WHERE email = %s", (ADMIN_EMAIL,))
    existing = cur.fetchone()

    if existing:
        print(f"  ⚠️  Admin user already exists ({ADMIN_EMAIL}) — skipping")
    else:
        hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

        cur.execute("""
            INSERT INTO users (
                id, email, hashed_password,
                first_name, last_name,
                role, account_type, verification_status,
                is_active, created_at
            ) VALUES (
                %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s
            )
        """, (
            ADMIN_ID,
            ADMIN_EMAIL,
            hashed,
            "Psyichub",
            "Admin",
            "super_admin",
            "individual",
            "approved",
            True,
            datetime.utcnow()
        ))
        print(f"  ✅ Admin user created")
        print(f"     Email    : {ADMIN_EMAIL}")
        print(f"     Password : {ADMIN_PASSWORD}")
        print(f"     Role     : super_admin")
        print(f"     ID       : {ADMIN_ID}")

    print("\nSeeding: test_pricing")

    pricing_rows = [
        {
            "id":                   str(uuid.uuid4()),
            "test_type":            "TAT Full (20 cards)",
            "individual_price_paise": 5000,
            "clinic_price_paise":   3000,
            "is_active":            True,
        },
        {
            "id":                   str(uuid.uuid4()),
            "test_type":            "TAT Short (10 cards)",
            "individual_price_paise": 3000,
            "clinic_price_paise":   2000,
            "is_active":            True,
        },
        {
            "id":                   str(uuid.uuid4()),
            "test_type":            "TAT Custom",
            "individual_price_paise": 2000,
            "clinic_price_paise":   1500,
            "is_active":            True,
        },
    ]

    for p in pricing_rows:
        cur.execute("SELECT id FROM test_pricing WHERE test_type = %s", (p['test_type'],))
        if cur.fetchone():
            print(f"  ⚠️  Pricing for '{p['test_type']}' already exists — skipping")
            continue

        cur.execute("""
            INSERT INTO test_pricing (
                id, test_type, individual_price_paise,
                clinic_price_paise, is_active, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            p['id'], p['test_type'],
            p['individual_price_paise'], p['clinic_price_paise'],
            p['is_active'], datetime.utcnow()
        ))
        print(f"  ✅ {p['test_type']} — ₹{p['individual_price_paise']//100} (individual) / ₹{p['clinic_price_paise']//100} (clinic)")

    conn.commit()
    print("\n✅ Seed complete.")
    print("\n⚠️  IMPORTANT: Change the admin password after first login.")
    print("   Settings → Change Password in the admin dashboard.\n")

except Exception as e:
    conn.rollback()
    print(f"\n❌ Seeding failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    cur.close()
    conn.close()
