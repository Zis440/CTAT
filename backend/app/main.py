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
    """Background initialization for database and ML engines in a worker thread."""
    try:
        from app.database import init_db
        init_db()
        print(f"[OK] Database tables initialized. Data store: {DATA_STORE_DIR}", flush=True)
    except Exception as e:
        print(f"[WARN] Database initialization: {e}", flush=True)

    print("[...] Initializing Engines in background...", flush=True)
    system_config = SystemConfig()
    try:
        from app.assessments.tat.engines.graph.knowledge_graph_engine import KnowledgeGraphEngine
        knowledge_graph = KnowledgeGraphEngine(config=system_config)
        if KG_GRAPH_FILE.exists():
            knowledge_graph.load(KG_GRAPH_FILE)
            knowledge_graph._graph_built = True
        else:
            knowledge_graph._graph_built = False
    except Exception as e:
        print(f"[WARN] KnowledgeGraphEngine: {e}", flush=True)
        knowledge_graph = None

    try:
        from app.assessments.tat.engines.nlp.enhanced_nlp import EnhancedNLPProcessor
        from app.assessments.tat.engines.nlp.semantic_narrative_engine import SemanticNarrativeEngine
        from app.assessments.tat.engines.nlp.theme_detection_engine import ThemeDetectionEngine
        from app.assessments.tat.engines.inference.murray_inference_engine import MurrayInferenceEngine
        from app.assessments.tat.engines.graph.relational_field_engine import RelationalFieldEngine
        from app.assessments.tat.pipeline.multicard_dynamics_engine import MulticardDynamicsEngine
        from app.assessments.tat.engines.scoring.quantitative_scorer import QuantitativeScorer
        from app.assessments.tat.engines.scoring.scoring_engine import TATScoringEngine

        nlp_processor = EnhancedNLPProcessor(system_config)
        engines['nlp_processor'] = nlp_processor

        from app.assessments.tat.engines.nlp.semantic_narrative_engine import SemanticNarrativeEngine
        engines['semantic_engine'] = SemanticNarrativeEngine(nlp_processor)

        from app.assessments.tat.engines.inference.defense_inference_engine import DefenseInferenceEngine
        defense_engine = DefenseInferenceEngine(nlp_processor)
        engines['defense_engine'] = defense_engine

        murray_engine = MurrayInferenceEngine(nlp_processor)
        engines['murray_engine'] = murray_engine

        theme_engine = ThemeDetectionEngine(nlp_processor)
        engines['theme_engine'] = theme_engine

        relational_engine = RelationalFieldEngine(nlp_processor)
        engines['relational_engine'] = relational_engine

        engines['multicard_engine'] = MulticardDynamicsEngine(
            nlp_processor,
            murray_engine=murray_engine,
            theme_engine=theme_engine,
            relational_engine=relational_engine,
            defense_engine=defense_engine,
        )
        engines['quantitative_scorer'] = QuantitativeScorer(nlp_processor)
        if knowledge_graph:
            engines['scoring_engine'] = TATScoringEngine(system_config, knowledge_graph)
    except Exception as e:
        print(f"[WARN] NLP engines: {e}", flush=True)
        nlp_processor = None

    if nlp_processor:
        try:
            from app.assessments.tat.engines.nlp.conflict_aspect_engine import ConflictAspectEngine
            engines['conflict_engine'] = ConflictAspectEngine(nlp_processor)
        except Exception as e:
            print(f"[WARN] ConflictAspectEngine: {e}", flush=True)

    try:
        from app.assessments.tat.engines.visual.environment_classifier import EnvironmentClassifier
        engines['environment_classifier'] = EnvironmentClassifier()
    except Exception as e:
        print(f"[WARN] EnvironmentClassifier: {e}", flush=True)
        engines['environment_classifier'] = None

    try:
        from app.services.patient_intake import SessionManager
        engines['session_manager'] = SessionManager(SESSION_DIR)
    except Exception as e:
        print(f"[WARN] SessionManager: {e}", flush=True)

    try:
        from app.assessments.tat.engines.visual.visual_analysis_engine import VisualAnalysisEngine
        engines['visual_engine'] = VisualAnalysisEngine(config=system_config)
        print("[OK] visual_engine initialized", flush=True)
    except Exception as e:
        print(f"[WARN] VisualAnalysisEngine: {e}", flush=True)
        engines['visual_engine'] = None

    try:
        from app.assessments.tat.engines.clinical.medication_engine import MedicationEngine
        engines['medication_engine'] = MedicationEngine(
            medication_csv_path=PROJECT_ROOT / "data" / "remedies_dataset" / "MEDICATION.csv"
        )
    except Exception as e:
        print(f"[WARN] MedicationEngine: {e}", flush=True)
        engines['medication_engine'] = None

    rag_engine = None
    airavata = None
    if system_config.RAG_ENABLED:
        try:
            from app.assessments.tat.engines.rag.rag_engine import RAGEngine
            from app.services.airavata_provider import AiravataProvider
            rag_engine = RAGEngine(
                corpus_dirs=system_config.RAG_CORPUS_DIRS,
                index_dir=system_config.RAG_INDEX_DIR,
                embedding_model_name=system_config.RAG_EMBEDDING_MODEL,
                chunk_size=system_config.RAG_CHUNK_SIZE,
                chunk_overlap=system_config.RAG_CHUNK_OVERLAP,
                top_k=system_config.RAG_TOP_K,
            )
            airavata = AiravataProvider()
        except Exception as e:
            print(f"[WARN] RAG/Airavata: {e}", flush=True)

    try:
        from app.services.ollama_humanizer import OllamaHumanizer
        engines['ollama_humanizer'] = OllamaHumanizer(
            rag_engine=rag_engine,
            airavata_provider=airavata,
        )
    except Exception as e:
        print(f"[WARN] OllamaHumanizer: {e}", flush=True)
        engines['ollama_humanizer'] = None

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
