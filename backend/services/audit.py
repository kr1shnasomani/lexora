"""Lexora Backend — Audit Service"""
import json
import time

from database import get_supabase


def log_audit_event(
    claim_id: str,
    stage: str,
    event_type: str,
    payload: dict | None = None,
    model_versions: dict | None = None,
    duration_ms: int | None = None,
) -> dict:
    """Insert an immutable audit event."""
    db = get_supabase()
    record = {
        "claim_id": claim_id,
        "stage": stage,
        "event_type": event_type,
        "payload": json.dumps(payload or {}),
        "model_versions": json.dumps(model_versions or {}),
    }
    if duration_ms is not None:
        record["duration_ms"] = duration_ms

    result = db.table("audit_events").insert(record).execute()
    return result.data[0] if result.data else {}


def get_audit_trail(claim_id: str) -> list[dict]:
    """Get all audit events for a claim, ordered by creation time."""
    db = get_supabase()
    result = (
        db.table("audit_events")
        .select("*")
        .eq("claim_id", claim_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


class AuditTimer:
    """Context manager for timing stage execution."""

    def __init__(self, claim_id: str, stage: str):
        self.claim_id = claim_id
        self.stage = stage
        self.start = None

    def __enter__(self):
        self.start = time.time()
        log_audit_event(self.claim_id, self.stage, "started")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = int((time.time() - self.start) * 1000)
        if exc_type:
            log_audit_event(
                self.claim_id,
                self.stage,
                "failed",
                payload={"error": str(exc_val)},
                duration_ms=duration,
            )
        return False  # don't suppress exceptions

    def complete(self, payload: dict | None = None):
        duration = int((time.time() - self.start) * 1000)
        log_audit_event(
            self.claim_id,
            self.stage,
            "completed",
            payload=payload,
            duration_ms=duration,
        )
