"""
Prototype Embeddings Store
--------------------------
Loads pre-computed numpy arrays for clinical prototypes from `backend/data/tat_prototypes.npz`.
Provides sub-millisecond retrieval of prototype sentence embeddings without invoking PyTorch or ONNX.
"""

from pathlib import Path
from typing import Dict, Optional
import numpy as np
import logging

logger = logging.getLogger(__name__)

_PROTOTYPES_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "tat_prototypes.npz"
_STORE: Optional[Dict[str, np.ndarray]] = None

def _load_store() -> Dict[str, np.ndarray]:
    global _STORE
    if _STORE is None:
        if _PROTOTYPES_FILE.exists():
            try:
                npz = np.load(_PROTOTYPES_FILE)
                _STORE = {k: npz[k] for k in npz.files}
                logger.info(f"Loaded {len(_STORE)} prototype arrays from {_PROTOTYPES_FILE.name}")
            except Exception as e:
                logger.warning(f"Failed to load {_PROTOTYPES_FILE.name}: {e}")
                _STORE = {}
        else:
            _STORE = {}
    return _STORE

def has_prototypes() -> bool:
    """Check if the pre-computed prototypes file exists and is populated."""
    store = _load_store()
    return len(store) > 0

def get_prototypes_by_prefix(prefix: str) -> Dict[str, np.ndarray]:
    """Return dict of {item_key: np.ndarray} matching prefix (e.g. 'need', 'press', 'defense', 'env', 'conflict', 'gender')."""
    store = _load_store()
    pfx = f"{prefix}__"
    result = {}
    for k, v in store.items():
        if k.startswith(pfx):
            sub_key = k[len(pfx):]
            result[sub_key] = v
    return result

def get_single_prototype(prefix: str, key: str) -> Optional[np.ndarray]:
    """Retrieve single prototype embedding vector or matrix."""
    store = _load_store()
    store_key = f"{prefix}__{key}"
    return store.get(store_key)
