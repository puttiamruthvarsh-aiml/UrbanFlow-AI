@echo off
echo ===================================================================
echo Starting UrbanFlow AI Frontend (Vite + React + MapLibre GL)...
echo ===================================================================
cd /d "%~dp0\frontend"
call npm.cmd run dev -- --host 127.0.0.1 --port 5173
pause
