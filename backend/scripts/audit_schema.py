import sys
import os

# Add the app directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, MetaData
from app.database import Base, SQLALCHEMY_DATABASE_URL
from alembic.migration import MigrationContext
from alembic.autogenerate import compare_metadata

def main():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    # Import all models to ensure they are registered with Base.metadata
    from app.models.patient import Patient, Session
    from app.models.user import User
    from app.assessments.screening.level1.models import ScreeningLevel1Session, ScreeningReport, ScreeningUser
    # Add other models if necessary
    
    mc = MigrationContext.configure(engine.connect())
    diff = compare_metadata(mc, Base.metadata)
    
    print("SCHEMA DRIFT REPORT")
    print("="*80)
    import pprint
    pprint.pprint(diff)

if __name__ == "__main__":
    main()
