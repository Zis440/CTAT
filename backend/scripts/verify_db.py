#!/usr/bin/env python
"""Verify PostgreSQL connection and schema integrity."""
import sys
import os
from pathlib import Path
from sqlalchemy import text

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import engine, SessionLocal, Base
from app.models.user import User
from app.models.wallet import Wallet
from app.models.patient import Patient, Session
from app.models.pricing import TestPricing


def verify_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[OK] Database connection successful")
        return True
    except Exception as e:
        print(f"[FAIL] Connection failed: {e}")
        return False


def verify_tables():
    """Check that all required tables exist."""
    from sqlalchemy import inspect

    inspector = inspect(engine)
    tables = inspector.get_table_names()

    required_tables = [
        "users",
        "wallets",
        "wallet_transactions",
        "test_pricing",
        "patients",
        "sessions",
    ]

    all_exist = True
    for table in required_tables:
        if table in tables:
            print(f"[OK] Table '{table}' exists")
        else:
            print(f"[FAIL] Table '{table}' missing")
            all_exist = False

    return all_exist


def verify_session():
    """Test session creation."""
    try:
        db = SessionLocal()
        user_count = db.query(User).count()
        db.close()
        print(f"[OK] Session works. Current users: {user_count}")
        return True
    except Exception as e:
        print(f"[FAIL] Session failed: {e}")
        return False


def main():
    print("PostgreSQL Database Verification\n")
    print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'Not set (using SQLite fallback)')}\n")

    results = [
        verify_connection(),
        verify_tables(),
        verify_session(),
    ]

    if all(results):
        print("[OK] All checks passed! Database is ready.")
    else:
        print("\n[FAIL] Some checks failed. Please review the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
