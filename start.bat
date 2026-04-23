@echo off
title AlgoArena — Local Dev

echo.
echo   AlgoArena — starting local dev servers
echo   ========================================
echo.

:: Install dependencies if needed
if not exist "backend\node_modules" (
    echo [setup] Installing backend dependencies...
    cd backend && npm install && cd ..
)

if not exist "frontend\node_modules" (
    echo [setup] Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

:: Create temp dir
if not exist "temp" mkdir temp

echo [info] Backend  ^>  http://localhost:3001
echo [info] Frontend ^>  http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.

:: Start both in separate windows
start "AlgoArena Backend"  cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak >nul
start "AlgoArena Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers launched in separate windows.
pause
