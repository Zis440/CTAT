"""
Shared dependencies and path constants for API route modules.

The ``engines`` dict is populated during app lifespan startup (see ``app.main``).
Route modules import from here to access engines and path constants without
circular imports back into ``main``.

All mutable runtime paths now derive from ``DATA_STORE_DIR`` defined in
``app.database``.
"""
from pathlib import Path
from app.database import DATA_STORE_DIR, SESSIONS_DIR, REPORTS_DIR

# ── Path constants ────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()  # backend/

SAVED_LEARNING_DIR = PROJECT_ROOT / "data" / "saved_learning"
SAVED_LEARNING_DIR.mkdir(parents=True, exist_ok=True)

KG_SAVE_DIR = SAVED_LEARNING_DIR / "knowledge_graph"
KG_SAVE_DIR.mkdir(parents=True, exist_ok=True)

KG_GRAPH_FILE = KG_SAVE_DIR / "graph.pkl"

# Sessions and reports now live under data_store/
SESSION_DIR = SESSIONS_DIR
OUTPUT_DIR = REPORTS_DIR


# ── Global engine registry ───────────────────────────────────────────────────
# Populated by the lifespan handler in app.main; accessed by route modules.
engines: dict = {}
