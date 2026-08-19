#!/usr/bin/env bash
# Psyichub — Start Script (macOS / Linux)
# Starts Ollama, backend, and frontend servers.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "  Psyichub : Starting Application"
echo "============================================"
echo ""

# ── Ollama Server ─────────────────────────────
echo "[1/3] Starting Ollama Server..."

OLLAMA_MODEL="hf.co/therandomuser03/Airavata-Q4_K_M-GGUF:Q4_K_M"

# Check if llama3 is available locally
if command -v ollama &>/dev/null; then
    if ollama list 2>/dev/null | grep -qi "llama3"; then
        OLLAMA_MODEL="llama3"
        echo "  Llama3 found! Using llama3."
    else
        echo "  Llama3 not found. Falling back to Airavata."
    fi
else
    echo "  ⚠ Ollama not found. Skipping LLM server."
    echo "    Install from: https://ollama.ai"
    echo ""
fi

if command -v ollama &>/dev/null; then
    ollama run "$OLLAMA_MODEL" &
    OLLAMA_PID=$!
    echo "  Ollama started (PID: $OLLAMA_PID, model: $OLLAMA_MODEL)"
fi

echo ""

# ── Backend ───────────────────────────────────
echo "[2/3] Starting Backend..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend started (PID: $BACKEND_PID)"
echo ""

# ── Frontend ──────────────────────────────────
echo "[3/3] Starting Frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "============================================"
echo "  All servers running:"
echo "    Ollama:   Local AI Server [$OLLAMA_MODEL]"
echo "    Backend:  http://localhost:8000"
echo "    Frontend: http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop all servers."
echo "============================================"
echo ""

# ── Graceful shutdown ─────────────────────────
cleanup() {
    echo ""
    echo "Shutting down..."
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$OLLAMA_PID" ] && kill $OLLAMA_PID 2>/dev/null
    echo "All servers stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for all background processes
wait
