# ── Stage 1: Builder ──────────────────────────────────────────────
FROM python:3.10-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    poppler-utils \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# PyTorch CPU-only (lightweight image ~200 MB vs 2.5GB CUDA)
RUN pip install --no-cache-dir \
    torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2 \
    --extra-index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

# spaCy lightweight model (~12 MB vs 750 MB for en_core_web_lg)
RUN pip install --no-cache-dir \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl

# NLTK data — uses the dedicated script to download all required corpora
COPY scripts/download_nltk.py /tmp/download_nltk.py
RUN python /tmp/download_nltk.py

# Pre-download SentenceTransformer model and lightweight quantized ONNX model into model_cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2', cache_folder='/app/model_cache')"
RUN python -c "from huggingface_hub import hf_hub_download; from transformers import AutoTokenizer; hf_hub_download(repo_id='Xenova/all-MiniLM-L6-v2', filename='onnx/model_quantized.onnx', cache_dir='/app/model_cache'); AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2', cache_dir='/app/model_cache')"


# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONIOENCODING=utf-8 \
    GIT_PYTHON_REFRESH=quiet \
    LOW_MEMORY_MODE=true \
    MALLOC_ARENA_MAX=2 \
    PORT=8000

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /root/nltk_data /root/nltk_data
COPY --from=builder /app/model_cache /app/model_cache

# Copy application code
COPY . .

# Create mount point directories
RUN mkdir -p \
    data_store/uploads/avatars \
    data_store/uploads/documents \
    data_store/reports \
    data_store/sessions \
    data_store/audio_temp \
    saved_learning/rag_index \
    saved_learning/knowledge_graph \
    model_cache \
    logs

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]