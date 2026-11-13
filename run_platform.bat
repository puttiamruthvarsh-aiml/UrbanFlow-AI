@echo off
echo ===================================================================
echo UrbanFlow AI - Adaptive Traffic Intelligence & Emergency Response
echo Launching Step 1 Platform Services...
echo ===================================================================
cd /d "%~dp0"
start "UrbanFlow Backend API (Port 8000)" cmd /k "run_backend.bat"
timeout /t 3 /nobreak >nul
start "UrbanFlow Frontend Dashboard (Port 5173)" cmd /k "run_frontend.bat"
echo.
echo UrbanFlow AI Services Started:
echo - Backend API: http://127.0.0.1:8000
echo - Swagger Docs: http://127.0.0.1:8000/docs
echo - Interactive Frontend: http://127.0.0.1:5173
echo.
pause
