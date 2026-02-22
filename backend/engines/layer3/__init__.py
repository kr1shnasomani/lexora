"""Layer 3 — Package Init

Exports the public entrypoint so routes can import from either:
  from engines.layer3 import run_fraud_check
  from engines.layer3.main import run_fraud_check
"""
from engines.layer3.main import run_fraud_check

__all__ = ["run_fraud_check"]
