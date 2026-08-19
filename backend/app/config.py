import os
from pathlib import Path

class SystemConfig:
    """Central configuration for paths and model settings."""

    def __init__(self):
        self.PROJECT_ROOT = Path(__file__).parent.parent
        self.DATASET_ROOT = self.PROJECT_ROOT / "data"

        # Runtime data paths — all under data_store/
        from app.database import DATA_STORE_DIR, SESSIONS_DIR, REPORTS_DIR, AUDIO_DIR
        self.DATA_STORE_DIR = DATA_STORE_DIR
        self.OUTPUT_DIR = REPORTS_DIR
        self.SESSIONS_DIR = self.PROJECT_ROOT / "data_store" / "sessions"
        self.AVATARS_DIR = self.PROJECT_ROOT / "data_store" / "uploads" / "avatars"
        self.DOCUMENTS_DIR = self.PROJECT_ROOT / "data_store" / "uploads" / "documents"

        self.SAVED_LEARNING_DIR = self.PROJECT_ROOT / "data" / "saved_learning"
        self.KNOWLEDGE_GRAPH_PATH = self.SAVED_LEARNING_DIR / "knowledge_graph" / "core_concepts.pkl"
        self.MODEL_CACHE_DIR = self.PROJECT_ROOT / "model_cache"
        self.MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

        # NLP models
        self.SPACY_MODEL = "en_core_web_lg"
        self.SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
        self.ROBERTA_SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
        self.GOEMOTIONS_MODEL = "joeddav/distilbert-base-uncased-go-emotions-student"
        self.KEYBERT_MODEL = "all-MiniLM-L6-v2"
        self.PYABSA_MODEL = "aste_training_set_custom"  # placeholder

        # Device
        import torch
        self.USE_GPU = torch.cuda.is_available()

        # RAG Configuration
        self.RAG_ENABLED = True
        self.RAG_INDEX_DIR = self.SAVED_LEARNING_DIR / "rag_index"
        self.RAG_CORPUS_DIRS = [
            self.DATASET_ROOT / "tat_scoring_manual",
            self.DATASET_ROOT / "tat_judging_manual",
            self.DATASET_ROOT / "remedies_dataset",
            self.DATASET_ROOT / "tat_cards",      # ✅ Card description PDFs now indexed in RAG
        ]
        self.RAG_EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # already in requirements
        self.RAG_TOP_K = 5
        self.RAG_CHUNK_SIZE = 500
        self.RAG_CHUNK_OVERLAP = 50