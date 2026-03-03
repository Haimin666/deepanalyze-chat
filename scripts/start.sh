#!/bin/bash
# ============================================
# DeepAnalyze - Production Start Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo -e "${BLUE}"
echo "============================================"
echo "  DeepAnalyze - Starting Services"
echo "============================================"
echo -e "${NC}"

# Load environment variables
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓ Loading environment from backend/.env${NC}"
    export $(grep -v '^#' backend/.env | xargs)
else
    echo -e "${RED}✗ backend/.env not found. Please copy .env.example to .env and configure.${NC}"
    exit 1
fi

# Create necessary directories
mkdir -p workspace logs

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for a service
wait_for_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Waiting for $name to be ready...${NC}"
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ $name is ready${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e "${RED}✗ $name failed to start${NC}"
    return 1
}

# Check ports
for port in 3000 8100 8200; do
    if check_port $port; then
        echo -e "${RED}✗ Port $port is already in use${NC}"
        exit 1
    fi
done

# Start Backend
echo -e "${YELLOW}Starting Backend API Server...${NC}"
cd backend
nohup python -u main.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
cd ..

# Start File Server
echo -e "${YELLOW}Starting File Server...${NC}"
cd backend
nohup python -u -c "
import os
import sys
sys.path.insert(0, '.')
from utils.http_server import start_file_server
os.chdir('..')
start_file_server(port=8100, directory='workspace')
" > ../logs/fileserver.log 2>&1 &
FILE_SERVER_PID=$!
echo $FILE_SERVER_PID > ../logs/fileserver.pid
cd ..

# Wait for backend
wait_for_service "Backend API" "http://localhost:8200/health" || exit 1

# Start Frontend
echo -e "${YELLOW}Starting Frontend Server...${NC}"
cd frontend
if [ -d ".next" ]; then
    nohup npm run start > ../logs/frontend.log 2>&1 &
else
    nohup npm run dev > ../logs/frontend.log 2>&1 &
fi
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
cd ..

# Wait for frontend
wait_for_service "Frontend" "http://localhost:3000" || exit 1

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  DeepAnalyze is running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${BLUE}Frontend:${NC}    http://localhost:3000"
echo -e "  ${BLUE}Backend API:${NC} http://localhost:8200"
echo -e "  ${BLUE}API Docs:${NC}    http://localhost:8200/docs"
echo -e "  ${BLUE}File Server:${NC} http://localhost:8100"
echo ""
echo -e "  ${YELLOW}Logs directory:${NC} $PROJECT_DIR/logs/"
echo -e "  ${YELLOW}PID files:${NC}      $PROJECT_DIR/logs/*.pid"
echo ""
echo -e "  To stop services: ${BLUE}./scripts/stop.sh${NC}"
echo ""
