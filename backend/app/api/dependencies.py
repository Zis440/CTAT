
from pathlib import Path
from app.database import DATA_STORE_DIR, SESSIONS_DIR, REPORTS_DIR

PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()

SAVED_LEARNING_DIR = PROJECT_ROOT / "data" / "saved_learning"
SAVED_LEARNING_DIR.mkdir(parents=True, exist_ok=True)

KG_SAVE_DIR = SAVED_LEARNING_DIR / "knowledge_graph"
KG_SAVE_DIR.mkdir(parents=True, exist_ok=True)

KG_GRAPH_FILE = KG_SAVE_DIR / "graph.pkl"

SESSION_DIR = SESSIONS_DIR
OUTPUT_DIR = REPORTS_DIR

engines: dict = {}
