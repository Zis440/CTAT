@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   CoreThematics : Starting Application
echo ============================================
echo.

echo [1/3] Starting Ollama Server...

set "OLLAMA_MODEL=hf.co/therandomuser03/Airavata-Q4_K_M-GGUF:Q4_K_M"
set "TEMP_CHECK=%TEMP%\ct_ollama_check.txt"
del /f "%TEMP_CHECK%" 2>nul

ollama list > "%TEMP_CHECK%" 2>nul

echo   Checking for Llama3 model...
set COUNTDOWN=5

:check_loop
if !COUNTDOWN! leq 0 goto :check_done

if exist "%TEMP_CHECK%" (
    findstr /i "llama3" "%TEMP_CHECK%" >nul 2>nul && (
        set "OLLAMA_MODEL=llama3"
        goto :check_done
    )
)

timeout /t 1 /nobreak >nul
set /a COUNTDOWN=COUNTDOWN-1
goto :check_loop

:check_done
del /f "%TEMP_CHECK%" 2>nul

if "!OLLAMA_MODEL!"=="llama3" (
    echo   Llama3 found! Starting Llama3...
) else (
    echo   Llama3 not found. Falling back to Airavata...
)

start "Ollama Server" cmd /k "ollama run !OLLAMA_MODEL!"

echo [2/3] Starting Backend...
start "CoreThematics Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Starting Frontend...
start "CoreThematics Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All servers are starting in separate windows.
echo   Ollama:   Local AI Server [!OLLAMA_MODEL!]
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo.
pause
endlocal
