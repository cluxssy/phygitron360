# =============================================================================
# Phygitron 360 — Windows PowerShell Start Script
# Launches Backend (uvicorn) and Frontend (Vite) in separate console windows
# =============================================================================
$RootDir = Split-Path -Parent $PSScriptRoot

Write-Host "`n=== Launching Phygitron 360 ===" -ForegroundColor Cyan
Write-Host "Project Root: $RootDir" -ForegroundColor Gray

# 1. Start Backend API
Write-Host "Starting Backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$RootDir`"; Write-Host '--- Phygitron 360 Backend API ---' -ForegroundColor Cyan; & `"$RootDir\backend\venv\Scripts\python.exe`" -m uvicorn backend.main:app --reload --port 8000"

# 2. Start Frontend Dev Server
Write-Host "Starting Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$RootDir\frontend`"; Write-Host '--- Phygitron 360 Frontend ---' -ForegroundColor Cyan; npm run dev"

Write-Host "`nBoth services started in dedicated windows!" -ForegroundColor Green
Write-Host "  -> Backend API:  http://localhost:8000" -ForegroundColor White
Write-Host "  -> API Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host "  -> Frontend App: http://localhost:5173" -ForegroundColor White
Write-Host "==============================`n" -ForegroundColor Cyan
