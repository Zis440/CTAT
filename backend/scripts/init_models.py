"""
Model Initialization Script
Initializes and validates all required models.
Assumes installation steps from MASTER INSTALLATION are completed.
No forced downloads — only verification + caching.
"""

# =====================================================
# CLEAN ENVIRONMENT
# =====================================================

import os
import logging
import warnings

os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)

warnings.filterwarnings("ignore", category=DeprecationWarning)

# =====================================================
# IMPORTS
# =====================================================

from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sentence_transformers import SentenceTransformer
import spacy
import nltk
from keybert import KeyBERT

# =====================================================
# CACHE DIRECTORY
# =====================================================

cache_dir = Path("./model_cache")
cache_dir.mkdir(exist_ok=True)

print("=" * 60)
print("MODEL INITIALIZATION STARTED")
print("=" * 60)

# =====================================================
# VERIFY SPACY (installed in Step 9 of installation)
# =====================================================

print("Verifying spaCy model...")

try:
    spacy.load("en_core_web_lg")
    print("spaCy model OK")
except OSError:
    raise RuntimeError(
        "spaCy model not installed.\n"
        "Run Step 9 from installation guide:\n"
        "pip install https://github.com/explosion/spacy-models/releases/download/"
        "en_core_web_lg-3.7.1/en_core_web_lg-3.7.1-py3-none-any.whl"
    )

# =====================================================
# VERIFY NLTK (installed in Step 10)
# =====================================================

print("Verifying NLTK resources...")

required_nltk = [
    ("corpora/stopwords", "stopwords"),
    ("tokenizers/punkt", "punkt"),
]

for path, name in required_nltk:
    try:
        nltk.data.find(path)
        print(f"{name} OK")
    except LookupError:
        raise RuntimeError(
            f"NLTK resource missing: {name}\n"
            "Run Step 10 from installation guide."
        )

# =====================================================
# SENTENCE TRANSFORMER
# =====================================================

print("Loading SentenceTransformer...")

sbert_model = SentenceTransformer(
    "all-MiniLM-L6-v2",
    cache_folder=str(cache_dir)
)

# =====================================================
# KEYBERT
# =====================================================

print("Loading KeyBERT...")

kw_model = KeyBERT(model=sbert_model)

# =====================================================
# TWITTER ROBERTA SENTIMENT
# =====================================================

print("Caching Twitter RoBERTa sentiment model...")

AutoTokenizer.from_pretrained(
    "cardiffnlp/twitter-roberta-base-sentiment-latest",
    cache_dir=cache_dir
)

AutoModelForSequenceClassification.from_pretrained(
    "cardiffnlp/twitter-roberta-base-sentiment-latest",
    cache_dir=cache_dir
)

# =====================================================
# GOEMOTIONS MODEL (FIXED REPOSITORY)
# =====================================================

print("Caching GoEmotions model...")

GOEMOTIONS_MODEL = "SamLowe/roberta-base-go_emotions"

AutoTokenizer.from_pretrained(
    GOEMOTIONS_MODEL,
    cache_dir=cache_dir
)

AutoModelForSequenceClassification.from_pretrained(
    GOEMOTIONS_MODEL,
    cache_dir=cache_dir
)

# =====================================================
# DEVICE INFO
# =====================================================

device = "cuda" if torch.cuda.is_available() else "cpu"
print("PyTorch device:", device)

print("=" * 60)
print("ALL MODELS VERIFIED AND CACHED")
print("=" * 60)