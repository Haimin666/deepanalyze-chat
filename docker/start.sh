#!/bin/bash
# ============================================
# DeepAnalyze Container Start Script
# ============================================

set -e

echo "============================================"
echo "  DeepAnalyze Starting..."
echo "============================================"

# Start backend API server
echo "Starting Backend API Server on port 8200..."
cd /app/backend
python -u main.py &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Start file server
echo "Starting File Server on port 8100..."
cd /app/backend
python -u -c "
from utils.http_server import start_file_server
import os
os.chdir('/app')
start_file_server(port=8100, directory='/app/workspace')
" &
FILE_SERVER_PID=$!

# Start frontend
echo "Starting Frontend Server on port 3000..."
cd /app/frontend
HOSTNAME='0.0.0.0' node server.js &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  DeepAnalyze is running!"
echo "============================================"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8200"
echo "  File Server: http://localhost:8100"
echo "============================================"

# Wait for any process to exit
wait -n $BACKEND_PID $FILE_SERVER_PID $FRONTEND_PID

# Exit with status of process that exited first
exit $?
