"""Lexora Backend — State Machine"""
from fastapi import HTTPException

# Canonical state transitions per SOLUTION.md
VALID_TRANSITIONS: dict[str, list[str]] = {
    "submitted":          ["extracting", "error"],
    "extracting":         ["extracted", "error"],
    "extracted":          ["policy_evaluating", "under_review", "error"],
    "policy_evaluating":  ["fraud_checking", "error"],
    "fraud_checking":     ["deciding", "error"],
    "deciding":           ["finalized", "under_review", "fraud_investigation", "error"],
    "under_review":       ["finalized", "fraud_investigation", "error"],
    "fraud_investigation": ["finalized", "error"],
    "finalized":          [],
    "error":              ["submitted"],  # allow retry from error
}


def validate_transition(current: str, target: str) -> bool:
    """Check if a status transition is valid."""
    allowed = VALID_TRANSITIONS.get(current, [])
    return target in allowed


def enforce_transition(current: str, target: str) -> None:
    """Raise HTTP 409 if transition is invalid."""
    if not validate_transition(current, target):
        raise HTTPException(
            status_code=409,
            detail=f"Invalid state transition: {current} → {target}. "
                   f"Allowed transitions from '{current}': {VALID_TRANSITIONS.get(current, [])}"
        )
