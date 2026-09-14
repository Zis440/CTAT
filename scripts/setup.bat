@echo off
title CoreThematics - Project Setup
echo ============================================
echo   CoreThematics : Project Setup (Windows)
echo ============================================
echo.

echo [1/3] Installing frontend dependencies...
cd /d "%~dp0..\frontend"
call npm install
if errorlevel 1 (
    echo   [ERROR] npm install failed. Check Node.js installation.
    pause
    exit /b 1
)
echo   Frontend dependencies installed.
echo.

echo [2/3] Setting up backend virtual environment...
cd /d "%~dp0..\backend"

if not exist "venv\" (
    py -3.10 -m venv venv
    if errorlevel 1 (
        echo   [ERROR] Failed to create venv with py -3.10. Trying python...
        python -m venv venv
    )
    echo   Virtual environment created.
) else (
    echo   Virtual environment already exists.
)

call venv\Scripts\activate.bat

echo   Upgrading pip...
python -m pip install --upgrade pip -q

echo   Installing PyTorch and core ML dependencies...
pip install torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2 numpy==1.24.4 scipy==1.10.1 scikit-learn==1.3.2 -q

echo   Installing requirements.txt...
pip install --no-cache-dir -r requirements.txt -q

echo   Installing FastAPI and Uvicorn...
pip install "uvicorn[standard]" fastapi -q

echo   Installing spaCy model (en_core_web_lg)...
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.7.1/en_core_web_lg-3.7.1-py3-none-any.whl -q

echo   Backend dependencies installed.
echo.

echo [3/3] Downloading NLTK data...
python scripts\download_nltk.py
if errorlevel 1 (
    echo   [WARNING] One or more NLTK packages failed to download.
    echo   Re-run manually: python backend\scripts\download_nltk.py
) else (
    echo   NLTK downloads complete.
)

call venv\Scripts\deactivate.bat 2>nul

echo.
echo ============================================
echo   Setup complete!
echo.
echo   Next steps:
echo     1. Set up your PostgreSQL database
echo     2. Copy .env.example to .env and configure
echo     3. Double-click start.bat to launch
echo ============================================
echo.
pause
