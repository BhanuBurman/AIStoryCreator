# AIStoryCreator Microservices Runner (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting AIStoryCreator Microservices Ecosystem " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$VENV_PYTHON = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $VENV_PYTHON)) {
    $VENV_PYTHON = "python"
}

# 0. Ensure Ollama daemon is active
Write-Host "[0/3] Checking Ollama Engine on http://127.0.0.1:11434..." -ForegroundColor Cyan
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 1 -ErrorAction Stop
} catch {
    Write-Host "Launching local Ollama daemon in background..." -ForegroundColor Yellow
    Start-Process "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# 1. Start LLM-Service (Port 8001)
Write-Host "[1/3] Launching LLM-Service on http://localhost:8001..." -ForegroundColor Yellow
$llmProcess = Start-Process -FilePath $VENV_PYTHON -ArgumentList "-m", "uvicorn", "main:app", "--port", "8001", "--reload" -WorkingDirectory "$PSScriptRoot\LLM-Service" -PassThru

# 2. Start Workflow-Engine-Service (Port 8002)
Write-Host "[2/3] Launching Workflow-Engine-Service on http://localhost:8002..." -ForegroundColor Yellow
$workflowProcess = Start-Process -FilePath $VENV_PYTHON -ArgumentList "-m", "uvicorn", "main:app", "--port", "8002", "--reload" -WorkingDirectory "$PSScriptRoot\Workflow-Engine-Service" -PassThru

# 3. Start Frontend-UI-Service (Port 3000)
Write-Host "[3/3] Launching Frontend-UI-Service on http://localhost:3000..." -ForegroundColor Yellow
$frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm", "run", "dev" -WorkingDirectory "$PSScriptRoot\Frontend-UI-Service" -PassThru

Write-Host "`nAll 3 Microservices started successfully!" -ForegroundColor Green
Write-Host "Frontend Studio: http://localhost:3000" -ForegroundColor Cyan
Write-Host "LLM-Service API: http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "Workflow Engine: http://localhost:8002/docs" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C in this terminal or close windows to terminate." -ForegroundColor DarkGray

# Wait for processes
try {
    Wait-Process -Id $llmProcess.Id, $workflowProcess.Id, $frontendProcess.Id
} catch {
    Write-Host "Shutting down microservices..." -ForegroundColor Red
    Stop-Process -Id $llmProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $workflowProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
}
