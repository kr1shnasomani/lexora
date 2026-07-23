"""Lexora — Batch Runner: Process all pending Layer 2 claims.

Usage:
    cd backend
    venv\\Scripts\\activate
    python scripts/run_layer2_batch.py

Finds all claims where status='extracted' AND policy_decision IS NULL,
runs evaluate_policy() on each, and prints a summary.
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

# ── Path resolution ──────────────────────────────────────────────────────────
_this_file = Path(__file__).resolve()
_backend_dir = _this_file.parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from engines.layer2 import evaluate_policy

from database import get_supabase


def run_pending() -> dict:
    """Process all pending Layer 2 claims.

    Returns summary dict with processed_count, success, failed.
    """
    db = get_supabase()

    # Query pending claims: status='extracted' AND policy_decision IS NULL
    result = (
        db.table("claims")
        .select("id, claim_number, claimant_name, incident_type, claimed_amount")
        .eq("status", "extracted")
        .is_("policy_decision", "null")
        .order("created_at", desc=False)
        .execute()
    )

    pending = result.data or []
    print(f"\n{'='*70}")
    print(f"  LEXORA — Layer 2 Batch Runner")
    print(f"  Found {len(pending)} pending claim(s)")
    print(f"  Started at {datetime.utcnow().isoformat()}Z")
    print(f"{'='*70}")

    if not pending:
        print("\n  No pending claims to process.")
        return {"processed_count": 0, "success": [], "failed": []}

    success_ids: list[str] = []
    failed_entries: list[dict] = []

    for i, row in enumerate(pending, 1):
        claim_id = row["id"]
        claim_num = row.get("claim_number", "?")
        claimant = row.get("claimant_name", "?")
        incident = row.get("incident_type", "?")
        amount = row.get("claimed_amount", 0)

        print(f"\n  [{i}/{len(pending)}] {claim_num} — {claimant}")
        print(f"           Type: {incident}  |  Amount: ₹{float(amount or 0):,.2f}")

        try:
            decision = evaluate_policy(claim_id)
            status = decision.get("outcome", {}).get("status", "?")
            recommended = decision.get("outcome", {}).get("recommended_amount", 0)
            queue = decision.get("routing", {}).get("queue", "?")

            print(f"           ✅ {status}  |  Recommended: ₹{recommended:,.2f}  |  Queue: {queue}")
            success_ids.append(claim_id)

        except Exception as exc:
            print(f"           ❌ FAILED: {exc}")
            failed_entries.append({"claim_id": claim_id, "error": str(exc)})

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"  RESULTS: {len(success_ids)} succeeded, {len(failed_entries)} failed")
    print(f"{'='*70}")

    if success_ids:
        print(f"\n  ✅ Success IDs:")
        for sid in success_ids:
            print(f"     {sid}")

    if failed_entries:
        print(f"\n  ❌ Failed:")
        for f in failed_entries:
            print(f"     {f['claim_id']}: {f['error']}")

    print()
    return {
        "processed_count": len(pending),
        "claim_ids_success": success_ids,
        "claim_ids_failed": failed_entries,
    }


if __name__ == "__main__":
    summary = run_pending()
    sys.exit(0 if not summary.get("claim_ids_failed") else 1)
