from pathlib import Path
from typing import Any
from app.database import DATA_STORE_DIR, SESSIONS_DIR, REPORTS_DIR

PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()

SAVED_LEARNING_DIR = PROJECT_ROOT / "data" / "saved_learning"
SAVED_LEARNING_DIR.mkdir(parents=True, exist_ok=True)

KG_SAVE_DIR = SAVED_LEARNING_DIR / "knowledge_graph"
KG_SAVE_DIR.mkdir(parents=True, exist_ok=True)

KG_GRAPH_FILE = KG_SAVE_DIR / "graph.pkl"

SESSION_DIR = SESSIONS_DIR
OUTPUT_DIR = REPORTS_DIR

class LazyEngineDict(dict):
    """Dictionary that lazily instantiates NLP and analysis engines on first request.
    Keeps idle container memory under 80MB on Render Free Tier (512MB limit).
    """
    def __getitem__(self, key: str) -> Any:
        val = super().get(key)
        if val is None:
            from app.engine_factory import get_or_create_engine
            val = get_or_create_engine(key, self)
        return val

    def get(self, key: str, default: Any = None) -> Any:
        try:
            val = self[key]
            return val if val is not None else default
        except Exception:
            return default

engines: dict = LazyEngineDict()
