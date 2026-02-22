"""Lexora — Fraud Engine (Layer 3) — Thin Wrapper

This file is preserved for backwards compatibility.
All logic has been moved to engines/layer3/main.py.

The calling route (routes/claims.py) imports:
    from engines.fraud_engine import run_fraud_check

This wrapper simply delegates to the modular Layer 3 implementation.
"""
from engines.layer3.main import run_fraud_check  # noqa: F401 – re-export

__all__ = ["run_fraud_check"]
