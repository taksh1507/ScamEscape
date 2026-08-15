FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps needed to build some Python wheels (kept minimal)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for better layer caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend source
COPY backend/ /app/backend/

WORKDIR /app/backend

# Create a non-root user and drop root privileges
RUN useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Cloud Run, Render, and Railway all inject a $PORT env var the container
# must bind to (Cloud Run defaults to 8080, others vary) — a hardcoded port
# breaks on all three. Falls back to 8000 for local `docker run` / compose.
ENV PORT=8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\", 8000)}/health/health')" || exit 1

# Shell form so $PORT is expanded at container start, not build time.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
