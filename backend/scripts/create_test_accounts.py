"""
create_test_accounts.py
──────────────────────
Creates consistent test accounts across all environments using the backend's bcrypt hashing.

This script ensures that test accounts are created with the EXACT SAME password hashing
logic as your auth system, which prevents login failures across different machines/environments.

Usage (with venv active, from backend/ directory):
    python scripts/create_test_accounts.py

Test accounts created:
  1. Super Admin          : superadmin@coretat.com / admin123
  2. Approved Psychologist: psychologist@test.com / password123
  3. Pending Clinic Admin : clinic.admin@test.com / password123
  4. Clinic Staff         : clinic.staff@test.com / password123
"""

import sys
import os
from datetime import datetime
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

from app.database import SessionLocal
from app.models.user import User, UserRole, AccountType, VerificationStatus
from app.auth.jwt_utils import hash_password

def create_test_accounts():
    """Create test accounts with consistent bcrypt hashing."""
    db = SessionLocal()

    try:

        test_accounts = [
            {
                'email': 'superadmin@coretat.com',
                'password': 'admin123',
                'first_name': 'System',
                'last_name': 'Admin',
                'role': UserRole.super_admin,
                'account_type': AccountType.individual,
                'verification_status': VerificationStatus.approved,
                'description': 'Super Admin — Full platform access',
            },
            {
                'email': 'psychologist@test.com',
                'password': 'password123',
                'first_name': 'Jane',
                'last_name': 'Doe',
                'role': UserRole.individual_psychologist,
                'account_type': AccountType.individual,
                'verification_status': VerificationStatus.approved,
                'rci_number': 'A123456',
                'description': 'Approved Individual Psychologist',
            },
            {
                'email': 'clinic.admin@test.com',
                'password': 'password123',
                'first_name': 'Dr. John',
                'last_name': 'Smith',
                'role': UserRole.clinic_admin,
                'account_type': AccountType.clinic,
                'verification_status': VerificationStatus.pending,
                'clinic_name': 'Mental Wellness Clinic',
                'roc_number': 'ROC987654321',
                'description': 'Pending Clinic Admin',
            },
            {
                'email': 'clinic.staff@test.com',
                'password': 'password123',
                'first_name': 'Alice',
                'last_name': 'Johnson',
                'role': UserRole.clinic_staff,
                'account_type': AccountType.clinic,
                'verification_status': VerificationStatus.approved,
                'description': 'Clinic Staff Member',
            },
        ]

        print("=" * 70)
        print("Creating CoreTAT Test Accounts")
        print("=" * 70)
        print()

        created_count = 0
        skipped_count = 0

        for account in test_accounts:
            description = account.pop('description')
            password = account.pop('password')

            existing = db.query(User).filter(User.email == account['email']).first()
            if existing:
                print(f"⚠️  {description}")
                print(f"   {account['email']} already exists — skipping\n")
                skipped_count += 1
                continue

            hashed_password = hash_password(password)

            user = User(
                id=str(uuid.uuid4()),
                email=account['email'],
                hashed_password=hashed_password,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                **{k: v for k, v in account.items() if v is not None and k != 'email'}
            )

            db.add(user)
            print(f"✅ {description}")
            print(f"   Email: {account['email']}")
            print(f"   Password: {password}")
            print(f"   Role: {account['role'].value}\n")
            created_count += 1

        db.commit()
        print("=" * 70)
        print(f"✅ SUCCESS: Created {created_count} account(s), Skipped {skipped_count} existing")
        print("=" * 70)
        print()
        print("📋 Next Steps:")
        print("   1. Start your backend: python main.py")
        print("   2. Try logging in with one of the accounts above")
        print("   3. Use Incognito mode or clear browser cache if login fails")
        print()

        return True

    except Exception as e:
        db.rollback()
        print("=" * 70)
        print(f"❌ ERROR creating accounts: {e}")
        print("=" * 70)
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == '__main__':
    success = create_test_accounts()
    sys.exit(0 if success else 1)
