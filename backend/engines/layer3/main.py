"""Layer 3 — Main Orchestration: run_fraud_check

Follows the execution flow from the spec (§11):
  1. Start AuditTimer(stage="fraud_engine")
  2. Initialize DiagnosticsTracker
  3. Fetch claim, policy, line_items, documents
  4. Run Tier 1 → record timing
  5. Run Tier 2 (fallback) → record timing + diagnostics
  6. Run Tier 3 (fallback) → record timing + diagnostics
  7. Run fusion → composite + band + action + reasons
  8. Build fraud_analysis with diagnostics
  9. Emit AuditTimer completed payload
 10. Return {fraud_score, fraud_analysis}

DB writes policy:
  - This function DOES NOT write to the claims table.
  - The calling route (routes/claims.py) handles all DB writes.
"""
import time

from database import get_supabase
from services.audit import AuditTimer

from engines.layer3.config import load_config
from engines.layer3.diagnostics import DiagnosticsTracker
from engines.layer3.tier1 import run_tier1
from engines.layer3.tier2 import run_tier2
from engines.layer3.tier3 import run_tier3
from engines.layer3.fusion import run_fusion


def run_fraud_check(claim_id: str) -> dict:
    """
    Public entrypoint for Layer 3 fraud detection.
    Called by routes/claims.py via POST /claims/{id}/run-fraud and /run-all.

    Returns:
        {
            "fraud_score": float,        # 0.0–1.0 composite
            "fraud_analysis": {...}      # full analysis per spec §5
        }

    Raises:
        Exception: only if claim not found or core DB read fails.
    """
    db = get_supabase()
    timer = AuditTimer(claim_id, "fraud_engine")
    timer.__enter__()

    try:
        # ── 1. Load config ────────────────────────────────────────
        cfg = load_config(db)

        # ── 2. Initialize diagnostics ─────────────────────────────
        diag = DiagnosticsTracker()
        diag.start_total()

        # ── 3. Fetch data ─────────────────────────────────────────
        claim_result = (
            db.table("claims").select("*").eq("id", claim_id).single().execute()
        )
        if not claim_result.data:
            raise ValueError(f"Claim {claim_id} not found")
        claim = claim_result.data

        # Fetch policy (optional — skip gracefully if missing)
        policy = None
        if claim.get("policy_id"):
            try:
                pol_result = (
                    db.table("policies")
                    .select("*")
                    .eq("id", claim["policy_id"])
                    .single()
                    .execute()
                )
                policy = pol_result.data
            except Exception:
                policy = None

        # Fetch line items
        line_items: list[dict] = []
        try:
            li_result = (
                db.table("claim_line_items")
                .select("*")
                .eq("claim_id", claim_id)
                .execute()
            )
            line_items = li_result.data or []
        except Exception:
            line_items = []

        # Fetch documents
        documents: list[dict] = []
        try:
            doc_result = (
                db.table("claim_documents")
                .select("*")
                .eq("claim_id", claim_id)
                .execute()
            )
            documents = doc_result.data or []
        except Exception:
            documents = []

        # ── 4. Tier 1 ─────────────────────────────────────────────
        t1_start = _now_ms()
        tier1_result = run_tier1(db, claim, policy, cfg)
        diag.record_tier_time("tier1", _now_ms() - t1_start)

        # ── 5. Tier 2 (fallback or cloud) ─────────────────────────
        t2_start = _now_ms()
        tier2_result = run_tier2(db, claim, line_items, documents, cfg, diag)
        diag.record_tier_time("tier2", _now_ms() - t2_start)

        # ── 6. Tier 3 (fallback or cloud) ─────────────────────────
        t3_start = _now_ms()
        tier3_result = run_tier3(db, claim, documents, cfg, diag)
        diag.record_tier_time("tier3", _now_ms() - t3_start)

        # ── 7. Fusion ─────────────────────────────────────────────
        diagnostics_dict = diag.to_dict()
        fraud_analysis = run_fusion(
            tier1_result,
            tier2_result,
            tier3_result,
            cfg,
            diagnostics_dict,
        )

        composite_score = fraud_analysis["composite_score"]

        # ── 8. Emit audit completed ───────────────────────────────
        alert_summary = tier3_result.get("alert_summary")
        timer.complete({
            "fraud_score": composite_score,
            "risk_band": fraud_analysis["risk_band"],
            "recommended_action": fraud_analysis["recommended_action"],
            "tiers_evaluated": 3,
            "tier1_score": tier1_result["score"],
            "tier2_score": tier2_result["score"],
            "tier3_score": tier3_result["score"],
            "diagnostics": diagnostics_dict,
            **({"graph_alert": alert_summary} if alert_summary else {}),
        })

        # ── 9. Return ─────────────────────────────────────────────
        return {
            "fraud_score": composite_score,
            "fraud_analysis": fraud_analysis,
        }

    except Exception as e:
        timer.__exit__(type(e), e, e.__traceback__)
        raise


def _now_ms() -> int:
    return int(time.time() * 1000)
