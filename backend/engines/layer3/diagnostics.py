"""Layer 3 — Diagnostics Tracker

Tracks which services were attempted, succeeded, failed, and whether fallbacks were used.
Also tracks per-tier timing.

Usage:
    diag = DiagnosticsTracker()
    diag.record_service("cohere", used=False, skipped_reason="disabled")
    diag.record_tier_time("tier1", ms=22)
    diag.record_fallback("neo4j", "relational_graph", "disabled")
    output = diag.to_dict()
"""
import time
from typing import Optional


class DiagnosticsTracker:
    def __init__(self):
        self._services: dict[str, dict] = {}
        self._tier_times: dict[str, int] = {}
        self._fallbacks: list[dict] = []
        self._primary_path: dict[str, str] = {}
        self._start_ms: Optional[int] = None

    def start_total(self):
        self._start_ms = int(time.time() * 1000)

    # ── Service tracking ──────────────────────────────────────────

    def record_service(
        self,
        name: str,
        used: bool,
        ok: Optional[bool] = None,
        fallback_used: bool = False,
        latency_ms: Optional[int] = None,
        error: Optional[str] = None,
        skipped_reason: Optional[str] = None,
    ):
        entry: dict = {"used": used}
        if used:
            entry["ok"] = ok if ok is not None else True
            entry["fallback_used"] = fallback_used
            if latency_ms is not None:
                entry["latency_ms"] = latency_ms
            if error is not None:
                entry["error"] = error
        else:
            entry["ok"] = None
            if skipped_reason:
                entry["skipped_reason"] = skipped_reason
        self._services[name] = entry

    def record_fallback(self, component: str, fallback_strategy: str, reason: str):
        self._fallbacks.append(
            {"component": component, "fallback": fallback_strategy, "reason": reason}
        )

    def set_primary_path(self, tier: str, path: str):
        self._primary_path[tier] = path

    # ── Timing ───────────────────────────────────────────────────

    def record_tier_time(self, tier: str, ms: int):
        self._tier_times[tier] = ms

    # ── Output ───────────────────────────────────────────────────

    def to_dict(self) -> dict:
        total_ms = None
        if self._start_ms is not None:
            total_ms = int(time.time() * 1000) - self._start_ms

        timing: dict = {k: v for k, v in self._tier_times.items()}
        if total_ms is not None:
            timing["total"] = total_ms

        return {
            "primary_path": self._primary_path,
            "services": self._services,
            "fallbacks": self._fallbacks,
            "timing_ms": timing,
        }


def record_disabled_services(diag: DiagnosticsTracker, cfg: dict):
    """Bulk-record all external services as disabled (Pass 1 / toggle-off state).

    In Pass 1 all four services are unconditionally marked as unused.
    Diagnostics will explicitly show:
        cohere.used = false, qdrant.used = false,
        neo4j.used = false,  jina.used = false
    with tier2 = "fallback_local" and tier3 = "fallback_relational".
    """
    # ── Cohere (text embeddings) ──
    diag.record_service("cohere", used=False, skipped_reason="disabled")

    # ── Qdrant (vector DB) ──
    diag.record_service("qdrant", used=False, skipped_reason="disabled")
    diag.record_fallback("qdrant", "local_similarity", "disabled")
    diag.set_primary_path("tier2", "fallback_local")

    # ── Neo4j (graph DB) ──
    diag.record_service("neo4j", used=False, skipped_reason="disabled")
    diag.record_fallback("neo4j", "relational_graph", "disabled")
    diag.set_primary_path("tier3", "fallback_relational")

    # ── Jina (non-text embeddings) ──
    diag.record_service("jina", used=False, skipped_reason="disabled")
