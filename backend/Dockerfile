FROM python:3.11-slim

# Install uv compiler tool
COPY --from=ghcr.io/astral-sh/uv:0.5.21 /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Install dependencies via uv
COPY pyproject.toml .
RUN uv sync --no-dev

# Copy the rest of the app code
COPY . .

# Expose port
EXPOSE 8000

# Start server
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
