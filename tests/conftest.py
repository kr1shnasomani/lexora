"""
Pytest configuration — adds backend directory to sys.path so all
test files can import from backend modules directly.
"""
import sys
import os

# Make backend importable from any test
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
