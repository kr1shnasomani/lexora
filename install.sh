#!/bin/bash
set -e

# Run from project root: bash install.sh
# Installs backend Python dependencies into backend/venv

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/backend"

# Create venv if it doesn't exist yet
if [ ! -f "venv/bin/activate" ]; then
  echo "==> Creating Python virtual environment in backend/venv ..."
  python3 -m venv venv
fi

echo "==> Activating venv ..."
source venv/bin/activate
pip install --upgrade pip setuptools --quiet

# Step 1: ensure grpcio is installed as a binary wheel FIRST
# so jina never tries to compile the old grpcio 1.57.0 from source
pip install "grpcio>=1.62.0" "grpcio-tools>=1.62.0" --prefer-binary --quiet

# Step 2: install everything else, skipping build isolation so jina
# reuses the grpcio already in the venv instead of spawning a fresh
# temp env that doesn't have pkg_resources
pip install -r requirements.txt --prefer-binary --no-build-isolation

echo ""
echo "✅ All dependencies installed. To start the backend:"
echo "   cd backend && source venv/bin/activate"
echo "   uvicorn main:app --reload --port 8000 --reload-exclude venv"
