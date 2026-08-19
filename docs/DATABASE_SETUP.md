# PostgreSQL Setup Guide for Psyichub

## Prerequisites

1. **PostgreSQL Server** - Must be running and accessible on `localhost:5432`
2. **pgAdmin or psql** - For database administration
3. **Python 3.10+** - Already set up in your environment

## Step 1: Create PostgreSQL User and Database

### Option A: Using pgAdmin (GUI)

1. Open pgAdmin in your browser
2. Right-click on "Databases" → Create → Database
3. Name: `psyichub`
4. Owner: `postgres` (create if doesn't exist)
   - In pgAdmin: Tools → Query Tool
   - Run:
   ```sql
   CREATE USER postgres WITH PASSWORD 'user';
   CREATE DATABASE psyichub OWNER postgres ENCODING 'UTF8';
   GRANT ALL PRIVILEGES ON DATABASE psyichub TO postgres;
   ```

### Option B: Using psql (Command Line)

```bash
# Connect to PostgreSQL
psql -U postgres

# Run these commands in psql:
CREATE USER postgres WITH PASSWORD 'user';
CREATE DATABASE psyichub OWNER postgres ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE psyichub TO postgres;
\q
```

## Step 2: Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `psycopg2-binary` - PostgreSQL driver
- `alembic` - Database migrations
- All other project dependencies

## Step 3: Create Tables and Verify Connection

```bash
cd backend

# Create tables using Alembic migrations
alembic upgrade head

# Verify PostgreSQL connection and schema
python scripts/verify_db.py
```

Expected output:
```
PostgreSQL Database Verification

DATABASE_URL: postgresql://postgres:user@localhost:5432/psyichub

✓ Database connection successful
✓ Table 'users' exists
✓ Table 'wallets' exists
✓ Table 'wallet_transactions' exists
✓ Table 'test_pricing' exists
✓ Table 'patients' exists
✓ Table 'sessions' exists
✓ Session works. Current users: 0

✓ All checks passed! Database is ready.
```

## Step 4: Seed Initial Data

```bash
python scripts/seed_db.py
```

Expected output:
```
Initializing database...
✓ Database tables initialized

Seeding default pricing...
✓ Seeded 3 pricing rows
```

## Step 5: Start the Application

```bash
# Terminal 1: Start the FastAPI server
cd backend
uvicorn app.main:app --reload

# Terminal 2: Start the React frontend
cd frontend
npm run dev
```

The API will be available at: http://localhost:8000
The frontend will be available at: http://localhost:5173

## Testing the Setup

### 1. Register a Test User

```bash
curl -X POST http://localhost:8000/api/auth/register/individual \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User",
    "qualification": "Ph.D. in Psychology",
    "license_no": "LIC123456"
  }'
```

### 2. Check User in Database

```bash
# Using psql
psql -U postgres -d psyichub -h localhost

# Inside psql:
SELECT id, email, first_name, last_name, created_at FROM users;
SELECT id, user_id, balance_paise FROM wallets WHERE user_id = 'usr_sadm_001';
\q
```

### 3. Verify Wallet Was Created Automatically

```bash
psql -U postgres -d psyichub -h localhost
SELECT * FROM wallets;
\q
```

## Troubleshooting

### Error: "psycopg2: connection refused"
- **Cause**: PostgreSQL server not running
- **Fix**: Start PostgreSQL server (Windows: Services → postgresql → Start)

### Error: "FATAL: password authentication failed"
- **Cause**: Wrong username or password
- **Fix**: Check DATABASE_URL in `.env` matches your PostgreSQL credentials

### Error: "relation \"users\" does not exist"
- **Cause**: Tables not created yet
- **Fix**: Run `alembic upgrade head` to run database migrations

### Error: "ImportError: No module named 'psycopg2'"
- **Cause**: Dependencies not installed
- **Fix**: Run `pip install -r requirements.txt` again

### Error: "No such file or directory: .env"
- **Cause**: Missing .env file
- **Fix**: Make sure `.env` exists in `backend/` directory with DATABASE_URL set

## Connection String Reference

**Format:** `postgresql://username:password@hostname:port/database_name`

**Your Setup:** `postgresql://postgres:user@localhost:5432/psyichub`

- **Hostname**: `localhost` (local machine)
- **Port**: `5432` (default PostgreSQL port)
- **Database**: `psyichub`
- **Username**: `postgres`
- **Password**: `user`

## Docker Deployment (Optional)

If using Docker, the PostgreSQL is already configured in `docker-compose.yml`:

```bash
docker-compose up -d
# Wait 10 seconds for PostgreSQL to start
# Tables will be created automatically
```

## Next Steps

1. ✅ PostgreSQL configured
2. ✅ Tables created
3. ✅ Initial data seeded
4. 🔄 **Register your first user and test the API**
5. 🔄 **Create Alembic migrations for any future model changes**

### Alembic Usage

If you make changes to the models in the future, use Alembic to create migrations:

```bash
# Generate a migration from model changes
alembic revision --autogenerate -m "description of change"

# Review the generated migration file in app/migrations/versions/

# Apply the migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

---

**Questions?** Check the troubleshooting section above or review the DATABASE_SETUP.md in the backend directory.
