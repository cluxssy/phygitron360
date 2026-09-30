@echo off
title Phygitron 360 Launcher
echo ========================================
echo    Launching Phygitron 360 Platform
echo ========================================
cd /d "%~dp0\.."

echo Starting Backend API on http://localhost:8000...
start "Phygitron 360 - Backend" cmd /k "backend\venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000"

echo Starting Frontend on http://localhost:5173...
start "Phygitron 360 - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers launched in separate windows!
echo   - Backend:  http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo   - Frontend: http://localhost:5173
echo ========================================
pause
