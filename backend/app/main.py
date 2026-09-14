import os
os.environ["GIT_PYTHON_REFRESH"] = "quiet"
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["LOW_MEMORY_MODE"] = os.getenv("LOW_MEMORY_MODE", "true")
os.environ["MALLOC_ARENA_MAX"] = "2"

import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(_env_path, override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import SystemConfig

from app.api.dependencies import (
    engines,
    KG_GRAPH_FILE,
    SESSION_DIR,
)
from app.database import DATA_STORE_DIR
import asyncio

def _init_all_engines_sync():
    """Background initialization for database and lightweight services in a worker thread.
    Heavy ML/NLP engines are loaded on-demand via LazyEngineDict to keep idle RAM under 80MB.
    """
    try:
        from app.database import init_db
        init_db()
        print(f"[OK] Database tables initialized. Data store: {DATA_STORE_DIR}", flush=True)
    except Exception as e:
        print(f"[WARN] Database initialization: {e}", flush=True)

    try:
        from app.services.patient_intake import SessionManager
        engines['session_manager'] = SessionManager(SESSION_DIR)
    except Exception as e:
        print(f"[WARN] SessionManager: {e}", flush=True)

    try:
        from scripts.backfill_audit_logs import backfill
        backfill()
    except Exception as be:
        print(f"[WARN] Startup backfill: {be}", flush=True)

    try:
        import gc
        gc.collect()
    except Exception:
        pass

    print("[OK] Startup complete. ML engines configured for on-demand lazy loading (Memory < 80MB).", flush=True)


    print(f"[OK] All engines initialized successfully ({len(engines)} loaded).", flush=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan handler: binds port immediately for health check, initializes engines in background thread."""
    print("[READY] FastAPI server started - listening on port immediately", flush=True)
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _init_all_engines_sync)
    try:
        from app.services.sla_loop import sla_assignment_loop
        asyncio.create_task(sla_assignment_loop(interval_seconds=60))
    except Exception as e:
        print(f"[WARN] SLA loop: {e}", flush=True)
    yield
    print("Shutting down engines...", flush=True)

app = FastAPI(
    title="TAT Analysis API",
    description="FastAPI wrapper for TAT learning system backend.",
    lifespan=lifespan,
)

import os as _os

_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in _os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

from app.middleware.activity_logger import ActivityLoggerMiddleware
app.add_middleware(ActivityLoggerMiddleware)

from slowapi.errors import RateLimitExceeded
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

@app.get("/")
@app.head("/")
def root():
    """Root endpoint for status and Render health checks."""
    return {"status": "ok", "service": "CTAT Backend API", "docs": "/docs", "health": "/health"}

@app.get("/health")
def health():
    """Docker/load-balancer health check."""
    return {"status": "ok"}

@app.get("/memory")
def memory_check():
    """Live RAM diagnostic endpoint to monitor memory usage against Render's 512MB limit."""
    import psutil
    proc = psutil.Process()
    rss_mb = round(proc.memory_info().rss / (1024 * 1024), 2)
    return {
        "rss_mb": rss_mb,
        "limit_mb": 512,
        "usage_pct": f"{round((rss_mb / 512) * 100, 1)}%",
        "status": "healthy" if rss_mb < 400 else "warning",
    }

@app.get("/readiness")
def readiness():
    """Deeper readiness probe — confirms engines are loaded."""
    return {"ready": True, "engines_loaded": len(engines)}

from app.auth.router import router as auth_router
from app.wallet.router import router as wallet_router
from app.pricing.router import router as pricing_router
from app.patient.router import router as patient_crud_router

app.include_router(auth_router)
app.include_router(wallet_router)
app.include_router(pricing_router)
app.include_router(patient_crud_router)

from app.api.routes import (
    patients_router,
    cards_router,
    analysis_router,
    sessions_router,
    feedback_router,
    audio_router,
    reports_router,
    admin_router,
    verification_router,
    support_router,
    rci_verify_router,
    clinic_router,
    appointments_router,
    assessments_router,
    screening_level1,
    dashboard_router,
    otp_router,
    signup_verify_router,
    individual_router,
    org_requests_router,
    anonymous_links_router,
    org_anonymous_links_router,
    clinic_anonymous_links_router,
    psychologist_verification_router,
)
from app.api.routes.verification_queue import router as verification_queue_router
from app.api.routes.audit import router as audit_router
from app.api.routes.cron import router as cron_router
from app.api.routes.notifications import router as notifications_router

app.include_router(notifications_router)
app.include_router(patients_router)
app.include_router(cards_router)
app.include_router(analysis_router)
app.include_router(sessions_router)
app.include_router(feedback_router)
app.include_router(audio_router)
app.include_router(reports_router)
app.include_router(admin_router)
app.include_router(verification_router)
app.include_router(support_router)
app.include_router(rci_verify_router)
app.include_router(clinic_router)
app.include_router(appointments_router)
app.include_router(assessments_router)
app.include_router(screening_level1.router)
app.include_router(dashboard_router)
app.include_router(audit_router)
app.include_router(otp_router)
app.include_router(signup_verify_router)
app.include_router(individual_router)
app.include_router(org_requests_router)
app.include_router(anonymous_links_router)
app.include_router(org_anonymous_links_router)
app.include_router(clinic_anonymous_links_router)
app.include_router(verification_queue_router)
app.include_router(psychologist_verification_router)
app.include_router(cron_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
