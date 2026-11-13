@echo off
title AIStoryCreator Services Launcher
echo ==========================================================
echo  Starting AIStoryCreator Microservices Ecosystem
echo ==========================================================

set VENV_PY=..\.venv\Scripts\python.exe

echo [1/3] Starting LLM-Service on http://localhost:8001...
start "AIStoryCreator - LLM-Service" cmd /k "cd /d %~dp0LLM-Service && %VENV_PY% -m uvicorn main:app --port 8001"

echo [2/3] Starting Workflow-Engine-Service on http://localhost:8002...
start "AIStoryCreator - Workflow Engine" cmd /k "cd /d %~dp0Workflow-Engine-Service && %VENV_PY% -m uvicorn main:app --port 8002"

echo [3/3] Starting Frontend-UI-Service on http://localhost:3000...
start "AIStoryCreator - Frontend Studio" cmd /k "cd /d %~dp0Frontend-UI-Service && npm run dev"

echo.
echo ==========================================================
echo  All services launched in separate windows!
echo  Studio URL: http://localhost:3000
echo ==========================================================
pause
