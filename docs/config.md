# Configuration Reference

System configuration is managed through `app/config.py` (`SystemConfig` class)
and environment variables loaded from `.env`.

---

## Environment Variables

Copy `.env.example` to `.env` at the project root and adjust as needed:

```env
# Ollama LLM endpoint
OLLAMA_BASE_URL=http://localhost:11434

# Optional: GPU acceleration (auto-detected if omitted)
USE_GPU=false

# Optional: RAG subsystem
RAG_ENABLED=true
RAG_TOP_K=5
```

---

## Model Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `SPACY_MODEL` | `en_core_web_lg` | spaCy NLP pipeline model |
| `SENTENCE_TRANSFORMER_MODEL` | `all-MiniLM-L6-v2` | Sentence embeddings for semantic similarity |
| `ROBERTA_SENTIMENT_MODEL` | `cardiffnlp/twitter-roberta-base-sentiment-latest` | Sentiment analysis |
| `GOEMOTIONS_MODEL` | `joeddav/distilbert-base-uncased-go-emotions-student` | 28-label emotion detection |

## RAG Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `RAG_ENABLED` | `True` | Enable the FAISS retrieval subsystem |
| `RAG_TOP_K` | `5` | Number of passages to retrieve per query |
| `RAG_CHUNK_SIZE` | `500` | Document chunk size (characters) for indexing |
| `RAG_CHUNK_OVERLAP` | `50` | Overlap between consecutive chunks |

## LLM Models (Ollama)

| Setting | Default | Description |
|---------|---------|-------------|
| Primary model (`OllamaHumanizer`) | `hf.co/therandomuser03/Airavata-Q4_K_M-GGUF:Q4_K_M` | Used for clinical humanization, meta-reasoning, medication summaries |
| Fallback model (`AiravataProvider`) | `hf.co/therandomuser03/Airavata-Q4_K_M-GGUF:Q4_K_M` | RAG-augmented clinical reasoning |
| Vision model | `llava:7b` | TAT card auto-annotation (VLM) |

> The `start.bat` / `start.sh` scripts auto-detect Llama 3 with a 10-second timeout. If not found, they launch Airavata instead.

## Runtime Behavior

| Setting | Default | Description |
|---------|---------|-------------|
| `USE_GPU` | Auto-detected | Uses CUDA if available, CPU otherwise |

---

## Data Storage

All runtime data is persisted under `backend/data_store/` (auto-created on first startup):

| Path | Contents |
|------|----------|
| `data_store/uploads/avatars/` | User profile pictures |
| `data_store/uploads/documents/` | Professional verification documents |
| `data_store/reports/` | Generated clinical PDF reports |
| `data_store/sessions/` | Session JSON snapshots |
| `data_store/backups/` | Automated database backups |

> This directory is git-ignored and never committed to version control.

---

## Notes

- PyABSA downloads models (~200 MB) on first use.
- The FAISS index builds automatically on first RAG query (~60-90 seconds) and is persisted to disk.
- If Llama 3 is unavailable, the system falls back to Airavata silently.
- Ollama must be running for humanized medication summaries and meta-reasoning.
- All scoring is model-based — no hardcoded keyword lists.
- Passwords are stored as bcrypt hashes — plaintext is never persisted.
