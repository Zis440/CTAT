import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def main():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE test_pricing ADD COLUMN org_price_paise INTEGER DEFAULT 2000 NOT NULL;"))
            print("Added org_price_paise to test_pricing")
        except Exception as e:
            print(f"Error adding org_price_paise: {e}")

        try:
            conn.execute(text("ALTER TABLE assessments ADD COLUMN org_price NUMERIC(10, 2);"))
            print("Added org_price to assessments")
        except Exception as e:
            print(f"Error adding org_price: {e}")
        
        conn.commit()

if __name__ == "__main__":
    main()
