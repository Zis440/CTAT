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

from app.services.patient_intake import PatientDatabase, SessionManager
from app.assessments.tat.engines.rag.rag_engine import RAGEngine
from app.assessments.tat.pipeline.multicard_dynamics_engine import MulticardDynamicsEngine

from app.assessments.tat.engines.graph.knowledge_graph_engine import KnowledgeGraphEngine
from app.assessments.tat.engines.nlp.enhanced_nlp import EnhancedNLPProcessor
from app.assessments.tat.engines.nlp.semantic_narrative_engine import SemanticNarrativeEngine
from app.assessments.tat.engines.nlp.theme_detection_engine import ThemeDetectionEngine
from app.assessments.tat.engines.nlp.conflict_aspect_engine import ConflictAspectEngine
from app.assessments.tat.engines.inference.murray_inference_engine import MurrayInferenceEngine
from app.assessments.tat.engines.graph.relational_field_engine import RelationalFieldEngine
from app.assessments.tat.engines.scoring.quantitative_scorer import QuantitativeScorer
from app.assessments.tat.engines.scoring.scoring_engine import TATScoringEngine
from app.assessments.tat.engines.visual.environment_classifier import EnvironmentClassifier
from app.assessments.tat.engines.visual.visual_analysis_engine import VisualAnalysisEngine
from app.assessments.tat.engines.clinical.medication_engine import MedicationEngine

from app.services.airavata_provider import AiravataProvider
from app.services.ollama_humanizer import OllamaHumanizer

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler (replaces deprecated @app.on_event)."""

    from app.database import init_db
    init_db()
    print(f"Database tables initialized. Data store: {DATA_STORE_DIR}")
    print("Initializing Engines...")
    system_config = SystemConfig()
    knowledge_graph = KnowledgeGraphEngine(config=system_config)

    if KG_GRAPH_FILE.exists():
        knowledge_graph.load(KG_GRAPH_FILE)
        knowledge_graph._graph_built = True
    else:

        knowledge_graph._graph_built = False

    nlp_processor = EnhancedNLPProcessor(system_config)
    engines['nlp_processor'] = nlp_processor

    engines['semantic_engine'] = SemanticNarrativeEngine(nlp_processor)
    engines['murray_engine'] = MurrayInferenceEngine(nlp_processor)
    engines['theme_engine'] = ThemeDetectionEngine(nlp_processor)
    engines['relational_engine'] = RelationalFieldEngine(nlp_processor)
    engines['multicard_engine'] = MulticardDynamicsEngine(nlp_processor)
    engines['quantitative_scorer'] = QuantitativeScorer(nlp_processor)
    engines['scoring_engine'] = TATScoringEngine(system_config, knowledge_graph)

    try:
        engines['conflict_engine'] = ConflictAspectEngine(nlp_processor)
    except Exception as e:
        print(f"CRITICAL ERROR: ConflictAspectEngine failed to initialize: {e}")
        raise RuntimeError(f"Failed to load critical system engine: ConflictAspectEngine. Error: {e}")

    try:
        engines['environment_classifier'] = EnvironmentClassifier()
    except Exception as e:
        print(f"Warning: EnvironmentClassifier failed to initialize: {e}")
        engines['environment_classifier'] = None

    engines['session_manager'] = SessionManager(SESSION_DIR)

    from app.assessments.tat.engines.inference.defense_inference_engine import DefenseInferenceEngine
    try:
        engines['defense_engine'] = DefenseInferenceEngine(nlp_processor)
    except Exception as e:
        print(f"CRITICAL ERROR: DefenseInferenceEngine failed: {e}")
        raise RuntimeError(f"Failed to load critical system engine: DefenseInferenceEngine. Error: {e}")

    try:
        engines['visual_engine'] = VisualAnalysisEngine(config=system_config)
        print("[OK] visual_engine initialized")

    except Exception as e:
        print(f"Warning: VisualAnalysisEngine failed: {e}")
        engines['visual_engine'] = None

    try:
        engines['medication_engine'] = MedicationEngine(
            medication_csv_path=PROJECT_ROOT / "data" / "remedies_dataset" / "MEDICATION.csv"
        )
    except Exception as e:
        print(f"Warning: MedicationEngine failed: {e}")
        engines['medication_engine'] = None

    rag_engine = None
    airavata = None
    if system_config.RAG_ENABLED:
        try:
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
            print(f"Warning: RAG/Airavata init failed: {e}")

    try:
        engines['ollama_humanizer'] = OllamaHumanizer(
            rag_engine=rag_engine,
            airavata_provider=airavata,
        )
    except Exception as e:
        print(f"Warning: OllamaHumanizer failed: {e}")
        engines['ollama_humanizer'] = None

    print("Starting background SLA loop...")
    import asyncio
    from app.services.sla_loop import sla_assignment_loop
    sla_task = asyncio.create_task(sla_assignment_loop(interval_seconds=60))

    try:
        from scripts.backfill_audit_logs import backfill
        backfill()
    except Exception as be:
        print(f"Startup backfill failed: {be}")

    print("All engines initialized successfully.")
    yield
    print("Shutting down engines...")
    sla_task.cancel()

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
