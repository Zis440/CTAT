# Setup Guide

Complete installation guide for Psyichub. All dependencies are tested and pinned.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.10+ | [Download](https://www.python.org/downloads/) |
| Node.js | 18+ | [Download](https://nodejs.org/) |
| Ollama | Latest | [Download](https://ollama.ai) — required for LLM features |
| Tesseract OCR | 5.x | [Download](https://github.com/UB-Mannheim/tesseract/wiki) |
| Poppler | 25.x | [Download](https://github.com/oschwartz10612/poppler-windows/releases/) |

---

## 1. Navigate to the Project Folder

Once you have received the project files from your team, open a terminal and navigate into the **PsyicHub** folder:

```bash
cd PsyicHub
```

All subsequent commands should be run from inside this folder.

## 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
py -3.10 -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Update pip
python -m pip install --upgrade pip

# Install heavy compiled libraries first (stability)
pip install torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2 numpy==1.24.4 scipy==1.10.1 scikit-learn==1.3.2

# Install remaining dependencies
pip install --no-cache-dir -r requirements.txt
pip install uvicorn[standard] fastapi
```

### Download NLP Models

```bash
# spaCy English model (large)
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.7.1/en_core_web_lg-3.7.1-py3-none-any.whl

# NLTK data (runs the dedicated download script)
python scripts/download_nltk.py
```

### Pull LLM Models (Ollama)

```bash
ollama pull llama3
ollama pull hf.co/therandomuser03/Airavata-Q4_K_M-GGUF:Q4_K_M
```

> **Note:** `llama3` is the primary model for RAG-augmented reasoning. If Llama 3 is not found at startup, the system automatically falls back to Airavata.

### Verify Installation

```bash
python scripts/init_models.py
```

If RAG is enabled, the FAISS vector index builds automatically on first run (~60-90 seconds).

## 3. Frontend Setup

```bash
cd frontend
npm install
```

## 4. Environment Configuration

Copy the example environment file and edit as needed:

```bash
cp .env.example .env
```

See [configuration.md](configuration.md) for all available settings.

---

## Running the Application

### One-Click Launch (Recommended)

After setup, use the unified launch scripts from the **project root**:

| OS | Command |
|----|---------|
| Windows | Double-click **`start.bat`** |
| macOS / Linux | `./start.sh` |

These scripts automatically:
1. Detect whether **Llama 3** is available (10-second timeout with countdown)
2. Fall back to **Airavata** if Llama 3 is not found
3. Start the Ollama server, Backend (FastAPI), and Frontend (Vite) in separate terminals

### Manual Start

#### Start Backend

```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend initializes all NLP engines and ML models. Wait for "Application startup complete" before proceeding.

> **Note:** On first startup, the backend auto-creates `backend/data_store/` with all required subdirectories (database, uploads, reports, sessions, backups).

#### Start Frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:5173` in your browser.

---

## System Dependencies (Windows)

### Tesseract OCR
Required for PDF card reading. Either:
- Install system-wide and add `C:\Program Files\Tesseract-OCR` to PATH, or
- Place the Tesseract folder inside the project root (auto-detected)

### Poppler
Required for `pdf2image` conversion. Either:
- Add to system PATH, or
- Place in the project root (auto-detected)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError` on backend | Activate the virtual environment first |
| Port 8000 already in use | Kill the existing process or use `--port 8001` |
| Node errors on frontend | Run `npm install` in the `frontend/` directory |
| Models fail to load (OOM) | Reduce batch size or ensure ≥8 GB RAM |
| Ollama not responding | Ensure `ollama serve` is running |
| PyABSA downloads on first use | Normal — downloads ~200 MB of models |
