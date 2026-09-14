# ── Stage 1: Builder ──────────────────────────────────────────────
FROM python:3.10-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# PyTorch CPU-only (smaller image ~200 MB)
# RUN pip install --no-cache-dir \
#     torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2 \
#     --extra-index-url https://download.pytorch.org/whl/cpu

# Standard PyTorch install (supports CUDA if available, but image is ~2.5GB)
RUN pip install --no-cache-dir torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2

RUN pip install --no-cache-dir -r requirements.txt

# spaCy model
RUN pip install --no-cache-dir \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.7.1/en_core_web_lg-3.7.1-py3-none-any.whl

# NLTK data — uses the dedicated script to download all required corpora
COPY scripts/download_nltk.py /tmp/download_nltk.py
RUN python /tmp/download_nltk.py


# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /root/nltk_data /root/nltk_data

# Copy application code
COPY . .

# Create mount point directories
# (actual data lives outside — mounted via docker-compose volumes)
RUN mkdir -p \
    data_store/uploads/avatars \
    data_store/uploads/documents \
    data_store/reports \
    data_store/sessions \
    data_store/audio_temp \
    saved_learning/rag_index \
    saved_learning/knowledge_graph \
    logs

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]