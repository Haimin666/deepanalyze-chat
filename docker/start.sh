#!/bin/bash
# ============================================
# DeepAnalyze Container Start Script
# ============================================

set -e

echo "============================================"
echo "  DeepAnalyze Starting..."
echo "============================================"

# Create necessary directories
mkdir -p /app/workspace /app/logs

# Function to wait for a service
wait_for_url() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    echo "Waiting for $name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo "✓ $name is ready"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    echo "✗ $name failed to start"
    return 1
}

# Start backend API server
echo "Starting Backend API Server on port 8200..."
cd /app/backend
python -u main.py > /app/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 5
wait_for_url "http://localhost:8200/health" "Backend API" || echo "Warning: Backend health check failed"

echo ""
echo "============================================"
echo "  DeepAnalyze is running!"
echo "============================================"
echo "  Backend API: http://localhost:8200"
echo "  File Server: http://localhost:8100"
echo "  API Docs:    http://localhost:8200/docs"
echo "============================================"
echo ""
echo "Note: Frontend should be deployed separately."
echo "Update NEXT_PUBLIC_BACKEND_URL and NEXT_PUBLIC_FILE_SERVER_URL"
echo "in frontend environment to point to this container."
echo ""

# Trap signals for graceful shutdown
trap 'echo "Shutting down..."; kill $BACKEND_PID 2>/dev/null; exit 0' SIGTERM SIGINT

# Keep container running and monitor process
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Backend process died, exiting..."
        exit 1
    fi
    sleep 5
done
