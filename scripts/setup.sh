#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "============================================"
echo "  Psyichub : Project Setup"
echo "============================================"
echo ""

echo "[1/3] Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install
echo "  ✔ Frontend dependencies installed."
echo ""

echo "[2/3] Setting up backend virtual environment..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
    python3.10 -m venv venv 2>/dev/null || python3 -m venv venv
    echo "  ✔ Virtual environment created."
else
    echo "  ✔ Virtual environment already exists."
fi

source venv/bin/activate

echo "  Upgrading pip..."
python -m pip install --upgrade pip -q

echo "  Installing PyTorch & core ML dependencies..."
pip install torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2 numpy==1.24.4 scipy==1.10.1 scikit-learn==1.3.2 -q

echo "  Installing requirements.txt..."
pip install --no-cache-dir -r requirements.txt -q

echo "  Installing FastAPI & Uvicorn..."
pip install "uvicorn[standard]" fastapi -q

echo "  Installing spaCy model (en_core_web_lg)..."
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.7.1/en_core_web_lg-3.7.1-py3-none-any.whl -q

echo "  ✔ Backend dependencies installed."
echo ""

echo "[3/3] Downloading NLTK data..."
(python scripts/download_nltk.py) || {
    echo "  ⚠ One or more NLTK packages failed to download."
    echo "    Re-run manually: python backend/scripts/download_nltk.py"
}
echo "  ✔ NLTK step complete."

deactivate

echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "    1. Set up your PostgreSQL database"
echo "    2. Copy .env.example to .env and configure"
echo "    3. Run: ./start.sh"
echo "============================================"
