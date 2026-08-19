"""
SQLAlchemy database setup for Psyichub.

PostgreSQL is the only supported database engine.
All file-based data lives under ``backend/data_store/``:
  - uploads/avatars/   — user profile pictures
  - uploads/documents/ — verification docs
  - reports/           — generated PDF reports  (per-user subdirs)
  - sessions/          — session JSON files     (per-user subdirs)
  - audio_temp/        — temporary audio files
"""
import os
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool

BASE_DIR = Path(__file__).parent.parent
DATA_STORE_DIR = BASE_DIR / "data_store"

AVATARS_DIR = DATA_STORE_DIR / "uploads" / "avatars"
DOCUMENTS_DIR = DATA_STORE_DIR / "uploads" / "documents"
REPORTS_DIR = DATA_STORE_DIR / "reports"
SESSIONS_DIR = DATA_STORE_DIR / "sessions"
AUDIO_DIR = DATA_STORE_DIR / "audio"
AUDIO_TEMP_DIR = AUDIO_DIR / "temp"
SUPPORT_DIR = DATA_STORE_DIR / "uploads" / "support"

from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", None)

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Please set it in backend/.env to your PostgreSQL connection string, e.g.:\n"
        "  DATABASE_URL=postgresql://user:password@localhost:5432/psyichub"
    )

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
)

@event.listens_for(engine, "connect")
def set_postgresql_timezone(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("SET timezone='UTC'")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI dependency — yields a DB session with proper transaction handling.

    - Creates a new session for each request
    - Automatically commits on success, rolls back on exception
    - Always closes the session after request completes
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def ensure_data_store_dirs():
    """Create the data_store directory tree if it does not exist."""
    for d in [
        DATA_STORE_DIR,
        AVATARS_DIR,
        DOCUMENTS_DIR,
        REPORTS_DIR,
        SESSIONS_DIR,
        AUDIO_DIR,
        AUDIO_TEMP_DIR,
        SUPPORT_DIR,
    ]:
        d.mkdir(parents=True, exist_ok=True)

def init_db():
    """Create all tables if they do not exist. Called during app lifespan startup.

    Creates enum types first (UserRole, AccountType, VerificationStatus, TransactionType)
    then creates all tables with proper indexes and constraints.
    """

    ensure_data_store_dirs()

    from app.models.user import User
    from app.models.wallet import Wallet, WalletTransaction
    from app.models.pricing import TestPricing
    from app.models.patient import Patient, Session
    from app.models.verification import UserVerificationDocument, VerificationDocumentRequirement
    from app.models.support import SupportTicket, SupportMessage
    from app.models.anonymous_link import AnonymousLink

    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
    except Exception as e:
        print(f"[INFO] Schema creation (non-blocking): {e}")

    Base.metadata.create_all(bind=engine)
    print("[OK] All tables created/verified in database")

    _run_migrations("patients", [
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender_confidence FLOAT",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS living_condition VARCHAR",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS family_structure VARCHAR",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS residence_type VARCHAR",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS environment_type VARCHAR",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS education_level VARCHAR",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation VARCHAR",
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS socioeconomic_status VARCHAR",
    ])

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE audit_logs RENAME COLUMN admin_id TO user_id"))
    except Exception:
        pass

    _run_migrations("audit_logs", [
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_user_id VARCHAR",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS signature_hash VARCHAR",
    ])

    _run_migrations("screening_reports", [
        "ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Generated'",
        "ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS verified_by_id INTEGER",
        "ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP",
        "ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS verification_notes TEXT",
        "ALTER TABLE screening_reports ADD COLUMN IF NOT EXISTS changes_history JSON",
    ])

    _run_migrations("users", [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_ip VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_disclaimer_accepted BOOLEAN DEFAULT FALSE NOT NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS refund_policy_accepted BOOLEAN DEFAULT FALSE NOT NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_responsibility_accepted BOOLEAN DEFAULT FALSE NOT NULL",
    ])

    _run_migrations("sessions", [
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS assigned_psychologist_id VARCHAR",
    ])

    _run_migrations("test_pricing", [
        "ALTER TABLE test_pricing ADD COLUMN IF NOT EXISTS org_price_paise INTEGER DEFAULT 2000 NOT NULL",
    ])

    _run_migrations("assessments", [
        "ALTER TABLE assessments ADD COLUMN IF NOT EXISTS org_price NUMERIC(10, 2)",
    ])

    _run_migrations("anonymous_links", [
        "ALTER TABLE anonymous_links ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE NOT NULL",
        "ALTER TABLE anonymous_links ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE anonymous_links ADD COLUMN IF NOT EXISTS consent_ip_address VARCHAR",
    ])

    _seed_default_pricing()
    _seed_assessments()

def _run_migrations(table_name: str, statements: list):
    """Run a list of DDL statements in a single transaction, silently skipping errors."""
    try:
        with engine.begin() as conn:
            for stmt in statements:
                try:
                    conn.execute(text(stmt))
                except Exception as e:

                    print(f"[MIGRATION] {table_name}: skipped — {e!r}")
    except Exception as e:
        print(f"[MIGRATION] {table_name}: transaction failed — {e!r}")

def _seed_default_pricing():
    """Insert default pricing rows if the table is empty."""
    from app.models.pricing import TestPricing

    db = SessionLocal()
    try:
        db.execute(text("UPDATE test_pricing SET individual_price_paise=3000 WHERE test_type='TAT Full (20 cards)' AND individual_price_paise=5000"))
        if db.query(TestPricing).count() == 0:
            defaults = [
                TestPricing(
                    test_type="TAT Full (20 cards)",
                    individual_price_paise=3000,
                    clinic_price_paise=3000,
                    org_price_paise=2000,
                ),
                TestPricing(
                    test_type="TAT Short (10 cards)",
                    individual_price_paise=3000,
                    clinic_price_paise=2000,
                    org_price_paise=1500,
                ),
                TestPricing(
                    test_type="TAT Per Card",
                    individual_price_paise=3000,
                    clinic_price_paise=2000,
                    org_price_paise=1500,
                ),
                TestPricing(
                    test_type="screening-tool",
                    individual_price_paise=10000,
                    clinic_price_paise=10000,
                    org_price_paise=10000,
                ),
            ]
            db.add_all(defaults)
            db.commit()
    except Exception as e:
        import traceback
        print(f"[WARN] Pricing seed failed: {e}")
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

def _seed_assessments():
    """Ensure all known assessments exist in the assessments table.

    Uses upsert-style logic (insert if slug not present) so re-running
    is idempotent — existing rows with updated prices are NOT overwritten.
    """
    from app.models.assessment import Assessment

    db = SessionLocal()
    try:
        defaults = [
            {
                "slug": "tat",
                "name": "Narrative Intelligence",
                "category": "Projective",
                "clinic_price": 49.0,
                "org_price": 49.0,
                "psychologist_price": 60.0,
                "is_coming_soon": False,
            },
            {
                "slug": "screening_level1",
                "name": "Employee Mental Health & Wellbeing - Level 1",
                "category": "Screening",
                "clinic_price": 99.0,
                "org_price": 99.0,
                "psychologist_price": 110.0,
                "is_coming_soon": False,
            },
            {
                "slug": "m-paci",
                "name": "Pre Adolescent Personality Assessment Intelligence",
                "category": "Self-Report Inventory",
                "clinic_price": None,
                "psychologist_price": None,
                "is_coming_soon": True,
            },
            {
                "slug": "conners",
                "name": "Attention Deficit And Hyperactivity Intelligence",
                "category": "Behavioral Rating",
                "clinic_price": None,
                "psychologist_price": None,
                "is_coming_soon": True,
            },
            {
                "slug": "scl90",
                "name": "Psychological Symptom Checklist Intelligence",
                "category": "Symptom Checklist",
                "clinic_price": None,
                "psychologist_price": None,
                "is_coming_soon": True,
            },
            {
                "slug": "caars",
                "name": "Adult Attention Deficit And Hyperactivity Intelligence",
                "category": "Behavioral Rating",
                "clinic_price": None,
                "psychologist_price": None,
                "is_coming_soon": True,
            },
            {
                "slug": "dsmd-adolescent",
                "name": "Adolescent Developmental And Behavioral Intelligence",
                "category": "Behavioral Assessment",
                "clinic_price": None,
                "psychologist_price": None,
                "is_coming_soon": True,
            },
        ]

        for item in defaults:
            existing = db.query(Assessment).filter(Assessment.slug == item["slug"]).first()
            if not existing:
                db.add(Assessment(
                    slug=item["slug"],
                    name=item["name"],
                    category=item["category"],
                    clinic_price=item["clinic_price"],
                    org_price=item.get("org_price"),
                    psychologist_price=item["psychologist_price"],
                    is_coming_soon=item["is_coming_soon"],
                ))
                print(f"[OK] Seeded assessment: {item['name']}")

        db.commit()
        print("[OK] Assessments table seeded/verified")
    except Exception as e:
        import traceback
        print(f"[WARN] Assessment seed failed: {e}")
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()
