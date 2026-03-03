# ============================================
# DeepAnalyze - Multi-stage Docker Build
# ============================================

# Stage 1: Frontend Build
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install bun
RUN npm install -g bun

# Copy frontend files
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy frontend source
COPY frontend/ ./

# Build arguments for environment variables
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8200
ARG NEXT_PUBLIC_FILE_SERVER_URL=http://localhost:8100
ARG NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=10

# Set environment variables for build
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_FILE_SERVER_URL=$NEXT_PUBLIC_FILE_SERVER_URL
ENV NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=$NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES
ENV NEXT_TELEMETRY_DISABLED=1

# Build frontend
RUN bun run build

# Stage 2: Backend Runtime
FROM python:3.11-slim AS backend

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt ./backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package.json ./frontend/
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules

# Create workspace directory
RUN mkdir -p /app/workspace

# Set working directory
WORKDIR /app/backend

# Expose ports
EXPOSE 3000 8100 8200

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV WORKSPACE_BASE_DIR=/app/workspace

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8200/health || exit 1

# Start script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
