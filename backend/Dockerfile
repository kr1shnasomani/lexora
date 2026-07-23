# ── Stage 1: Dependency builder ────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .

# Install all dependencies. Pip will use binary wheels where available
# (grpcio publishes cp312 wheels for linux_x86_64) and fall back to
# source only when necessary.
RUN pip install --no-cache-dir --prefix=/install \
        grpcio grpcio-tools && \
    pip install --no-cache-dir --prefix=/install \
        -r requirements.txt

# ── Stage 2: Lean runtime ──────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Link the package to the GitHub repository so it appears under Packages
LABEL org.opencontainers.image.source="https://github.com/kr1shnasomani/lexora"
LABEL org.opencontainers.image.description="Lexora — AI-powered Insurance Claims Processing Engine"
LABEL org.opencontainers.image.licenses="MIT"

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

EXPOSE 8000

# Production: no --reload. Use the compose dev profile for hot-reload.
# Shell form so $PORT (injected by some PaaS hosts) overrides the 8000 default.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
