# ── Stage 1: Dependency builder ────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .

# Install grpcio from a pre-built binary wheel first (avoids multi-minute
# source compilation on Linux) then install the rest of the dependencies.
RUN pip install --no-cache-dir --prefix=/install \
        grpcio grpcio-tools --only-binary :all: && \
    pip install --no-cache-dir --prefix=/install \
        -r requirements.txt

# ── Stage 2: Lean runtime ──────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

EXPOSE 8000

# Production: no --reload. Use the compose dev profile for hot-reload.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
