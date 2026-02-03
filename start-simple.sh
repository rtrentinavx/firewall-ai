#!/bin/bash

# Simple Firewall AI Development Startup Script
# Starts backend and frontend concurrently

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting Firewall AI (Simple Mode)"
echo "====================================="
echo "Script directory: $SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "$SCRIPT_DIR/venv" ]; then
    echo "❌ Virtual environment not found at $SCRIPT_DIR/venv"
    exit 1
fi

# Check if frontend node_modules exists
if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    echo "❌ Frontend dependencies not installed. Run 'npm install' in frontend directory first."
    exit 1
fi

# Start backend in background
echo "📡 Starting backend..."
cd "$SCRIPT_DIR/backend"
source "$SCRIPT_DIR/venv/bin/activate"
python app.py &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 3

# Start frontend in background
echo "🌐 Starting frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

echo ""
echo "🎉 Services starting..."
echo "📡 Backend: http://localhost:8080"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set trap for cleanup
trap cleanup INT

# Wait for processes
wait