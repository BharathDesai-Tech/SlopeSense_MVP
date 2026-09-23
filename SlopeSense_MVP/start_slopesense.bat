@echo off
title SlopeSense AI - Launcher
echo ===================================================
echo        Starting SlopeSense AI Platform
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting FastAPI Backend on port 8002...
start "SlopeSense Backend" cmd /k "python -m uvicorn src.main:app --host 0.0.0.0 --port 8002"

echo [2/2] Starting Vite Frontend on port 5173...
start "SlopeSense Frontend" cmd /k "npm run dev -- --host 0.0.0.0"

echo.
echo Waiting 3 seconds for services to initialize...
timeout /t 3 >nul

echo Opening browser at http://localhost:5173/ ...
start http://localhost:5173/

echo.
echo ===================================================
echo  SlopeSense AI is running! Keep this window open.
echo  Local URL:   http://localhost:5173/
echo  NDRF Desk:   http://localhost:5173/authority
echo  Swagger API: http://127.0.0.1:8002/docs
echo ===================================================
echo.
pause
