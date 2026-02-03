#!/bin/bash

# Firewall AI Development Startup Script
# This script starts both the backend and frontend services

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting Firewall AI Development Environment"
echo "================================================="
echo "Script directory: $SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    local name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Port $port ($name) is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port ($name) is available${NC}"
        return 0
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${BLUE}⏳ Waiting for $service_name to be ready...${NC}"

    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 2 "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        echo -e "${YELLOW}⏳ Attempt $attempt/$max_attempts: $service_name not ready yet...${NC}"
        sleep 2
        ((attempt++))
    done

    echo -e "${RED}❌ $service_name failed to start within expected time${NC}"
    return 1
}

# Check if required tools are installed
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}❌ Python3 is required but not installed${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm is required but not installed${NC}"; exit 1; }

# Check ports
echo "🔍 Checking port availability..."
check_port 8080 "Backend (Flask)"
check_port 3000 "Frontend (Next.js)"

# Check if virtual environment exists
if [ ! -d "$SCRIPT_DIR/venv" ]; then
    echo -e "${RED}❌ Virtual environment not found at $SCRIPT_DIR/venv. Please run setup first.${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    echo -e "${RED}❌ Frontend dependencies not installed. Please run 'npm install' in frontend directory.${NC}"
    exit 1
fi

echo ""
echo "🔧 Starting Backend Service..."
echo "------------------------------"

# Start backend in background
cd "$SCRIPT_DIR/backend"
source "$SCRIPT_DIR/venv/bin/activate"
echo -e "${BLUE}📡 Starting Flask backend on port 8080...${NC}"
python app.py &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Wait for backend to be ready
if ! wait_for_service "http://localhost:8080/health" "Backend"; then
    echo -e "${RED}❌ Backend failed to start. Killing process...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🎨 Starting Frontend Service..."
echo "-------------------------------"

# Start frontend in background
cd "$SCRIPT_DIR/frontend"
echo -e "${BLUE}🌐 Starting Next.js frontend on port 3000...${NC}"
npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

# Wait for frontend to be ready
if ! wait_for_service "http://localhost:3000" "Frontend"; then
    echo -e "${RED}❌ Frontend failed to start. Killing processes...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🎉 All services started successfully!"
echo "====================================="
echo -e "${GREEN}📡 Backend: http://localhost:8080${NC}"
echo -e "${GREEN}🌐 Frontend: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}📝 Useful commands:${NC}"
echo "  • Stop all services: kill $BACKEND_PID $FRONTEND_PID"
echo "  • View backend logs: kill -USR1 $BACKEND_PID (if supported)"
echo "  • View frontend logs: Check the terminal where this script runs"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"

# Wait for user interrupt
trap "echo -e '\n${YELLOW}🛑 Stopping services...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0" INT

# Keep the script running
wait