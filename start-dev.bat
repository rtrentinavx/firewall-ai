@echo off
REM Firewall AI Development Startup Script (Windows)
REM Starts both backend and frontend services

echo 🚀 Starting Firewall AI Development Environment
echo =================================================

REM Check if virtual environment exists
if not exist "venv" (
    echo ❌ Virtual environment not found. Please run setup first.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "frontend\node_modules" (
    echo ❌ Frontend dependencies not installed. Please run 'npm install' in frontend directory.
    pause
    exit /b 1
)

echo.
echo 🔧 Starting Backend Service...
echo ------------------------------

REM Start backend in new command window
start "Firewall AI Backend" cmd /k "cd backend && ..\\venv\\Scripts\\activate && python app.py"

echo ⏳ Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo.
echo 🎨 Starting Frontend Service...
echo -------------------------------

REM Start frontend in new command window
start "Firewall AI Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo 🎉 Services starting...
echo 📡 Backend: http://localhost:8080
echo 🌐 Frontend: http://localhost:3000
echo.
echo Close the command windows to stop the services
echo.

pause