# Lexora — Windows PowerShell install script
# Run from project root: .\install.ps1
# Requires PowerShell 5+ and Python 3.11+ on PATH

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location "$ScriptDir\backend"

Write-Host ""
Write-Host "==> Creating Python virtual environment in backend\venv ..." -ForegroundColor Cyan
python -m venv venv

Write-Host "==> Activating venv ..." -ForegroundColor Cyan
& .\venv\Scripts\Activate.ps1

Write-Host "==> Upgrading pip and setuptools ..." -ForegroundColor Cyan
python -m pip install --upgrade pip setuptools --quiet

# Step 1: install grpcio as a pre-built binary wheel FIRST
# Prevents jina from trying to compile the older grpcio from source
Write-Host "==> Installing grpcio (binary wheel) ..." -ForegroundColor Cyan
pip install "grpcio>=1.62.0" "grpcio-tools>=1.62.0" --prefer-binary --quiet

# Step 2: install everything else
Write-Host "==> Installing remaining dependencies ..." -ForegroundColor Cyan
pip install -r requirements.txt --prefer-binary --no-build-isolation

Write-Host ""
Write-Host "All dependencies installed." -ForegroundColor Green
Write-Host ""
Write-Host "To start the backend, run:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  uvicorn main:app --reload --port 8000 --reload-exclude venv" -ForegroundColor White
Write-Host ""
