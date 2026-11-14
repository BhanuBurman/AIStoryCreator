@echo off
title AIStoryCreator Microservices Ecosystem
echo ==========================================================
echo  Starting AIStoryCreator Microservices Ecosystem
echo ==========================================================

set VENV_PYTHON=%~dp0.venv\Scripts\python.exe
if not exist "%VENV_PYTHON%" (
    set VENV_PYTHON=python
)

echo [0/3] Ensuring Ollama Engine is running on http://127.0.0.1:11434...
curl -s --connect-timeout 2 http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting local Ollama engine in background...
    start "" "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe"
    timeout /t 3 /nobreak >nul
)

echo [1/3] Launching LLM-Service on http://localhost:8001...
start "LLM-Service (8001)" cmd /k "cd /d %~dp0LLM-Service && "%VENV_PYTHON%" -m uvicorn main:app --port 8001 --reload"

echo [2/3] Launching Workflow-Engine-Service on http://localhost:8002...
start "Workflow-Engine (8002)" cmd /k "cd /d %~dp0Workflow-Engine-Service && "%VENV_PYTHON%" -m uvicorn main:app --port 8002 --reload"

echo [3/3] Launching Frontend-UI-Service on http://localhost:3000...
start "Frontend-UI (3000)" cmd /k "cd /d %~dp0Frontend-UI-Service && npm run dev"

echo.
echo ==========================================================
echo All 3 Microservices launched in separate windows!
echo - Frontend Studio: http://localhost:3000
echo - LLM-Service API: http://localhost:8001/docs
echo - Workflow Engine: http://localhost:8002/docs
echo ==========================================================
