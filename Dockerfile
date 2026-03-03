# ============================================
# DeepAnalyze - Docker Image
# ============================================

FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    pkg-config \
    libssl-dev \
    libffi-dev \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    libfreetype6-dev \
    default-libmysqlclient-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Create workspace and logs directories
RUN mkdir -p /app/workspace /app/logs

# Expose ports
# 8100 - File Server
# 8200 - Backend API
EXPOSE 8100 8200

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV WORKSPACE_BASE_DIR=/app/workspace
ENV PYTHONPATH=/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8200/health || exit 1

# Copy and setup start script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
