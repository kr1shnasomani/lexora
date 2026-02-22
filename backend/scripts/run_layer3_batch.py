r"""Lexora — Batch Runner: Process all pending Layer 3 claims.

Usage:
    cd backend
    venv\Scripts\activate
    python scripts/run_layer3_batch.py

Finds all claims where fraud_score IS NULL (excluding newly submitted ones),
runs the full Layer 3 Fraud Engine on each, updates the database, and prints a detailed summary.
"""

from __future__ import annotations

import sys
import json
from pathlib import Path
from datetime import datetime, timezone

# ── Path resolution ──────────────────────────────────────────────────────────
_this_file = Path(__file__).resolve()
_backend_dir = _this_file.parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from database import get_supabase
from engines.layer3.main import run_fraud_check


def run_pending() -> dict:
    """Process all pending Layer 3 claims.

    Returns summary dict with processed_count, success, failed.
    """
    db = get_supabase()

    # Query pending claims: fraud_score IS NULL and status is not 'submitted'
    result = (
        db.table("claims")
        .select("id, claim_number, claimant_name, status, claimed_amount")
        .is_("fraud_score", "null")
        .neq("status", "submitted")
        .order("created_at", desc=False)
        .execute()
    )

    pending = result.data or []
    print(f"\n{'='*80}")
    print(f"  LEXORA — Layer 3 Batch Runner (Fraud Engine)")
    print(f"  Found {len(pending)} pending claim(s)")
    print(f"  Started at {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*80}")

    if not pending:
        print("\n  No pending claims to process.")
        return {"processed_count": 0, "success": [], "failed": []}

    success_ids: list[str] = []
    failed_entries: list[dict] = []

    for i, row in enumerate(pending, 1):
        claim_id = row["id"]
        claim_num = row.get("claim_number", "?")
        claimant = row.get("claimant_name", "?")
        status = row.get("status", "?")
        amount = row.get("claimed_amount", 0)

        print(f"\n  [{i}/{len(pending)}] {claim_num} — {claimant}")
        print(f"           Current Status: {status}  |  Claimed: ₹{float(amount or 0):,.2f}")

        try:
            # 1. Ensure status is tracking 'fraud_checking' during run if we care to mirror flow perfectly
            if status != "fraud_checking":
                db.table("claims").update({"status": "fraud_checking"}).eq("id", claim_id).execute()

            # 2. Execute Fraud Engine
            fraud_result = run_fraud_check(claim_id)
            
            score = fraud_result["fraud_score"]
            analysis = fraud_result["fraud_analysis"]
            diag = analysis.get("diagnostics", {})
            fallbacks = diag.get("fallbacks", {})
            services = diag.get("services", {})
            latency = diag.get("latency_ms", 0)

            # 3. Update Database (matching the API endpoint 'POST /run-fraud')
            db.table("claims").update({
                "fraud_score": score,
                "fraud_analysis": json.dumps(analysis),
                "status": "deciding",  # Auto-advances to deciding to queue Layer 4
            }).eq("id", claim_id).execute()

            # 4. Print detailed metrics neatly
            print(f"           ✅ Completed in {latency}ms  |  Final Fraud Score: {score:.2f} ({analysis.get('risk_band', 'unknown').upper()})")
            
            # Print Tier Scores / Weights
            print("           ├─ Tiers:")
            print(f"           │   ├─ Tier 1 (Velocity/Rules): {analysis.get('tier1', {}).get('score', 0):.2f}")
            print(f"           │   ├─ Tier 2 (Semantics)    : {analysis.get('tier2', {}).get('score', 0):.2f}")
            print(f"           │   └─ Tier 3 (Graph)        : {analysis.get('tier3', {}).get('score', 0):.2f}")
            
            # Print Diagnostics & Cloud Service usage
            print("           ├─ Fallbacks triggered:")
            print(f"           │   ├─ Tier 2 Local Fallback Used: {'YES' if fallbacks.get('tier2') else 'NO'}")
            print(f"           │   └─ Tier 3 Local Fallback Used: {'YES' if fallbacks.get('tier3') else 'NO'}")
            
            print("           └─ AI Services:")
            for s_name, s_data in services.items():
                if not s_data:
                    print(f"               ├─ {s_name.title():<6}: (Not Configured/None)")
                    continue
                
                is_used = s_data.get('used', False)
                is_ok = s_data.get('ok', False)
                
                if not is_used:
                    reason = s_data.get('skipped_reason', 'disabled')
                    print(f"               ├─ {s_name.title():<6}: Skipped ({reason})")
                else:
                    if is_ok:
                        plat = s_data.get('latency_ms', 0)
                        print(f"               ├─ {s_name.title():<6}: OK ({plat}ms)")
                    else:
                        err = s_data.get('error', 'unknown error')
                        print(f"               ├─ {s_name.title():<6}: ERROR ({err})")
            
            print(f"           ➔ Advancing next status to 'deciding'")

            success_ids.append(claim_id)

        except Exception as exc:
            import traceback
            traceback.print_exc()
            print(f"           ❌ FAILED: {exc}")
            # Reset status to error
            db.table("claims").update({
                "status": "error",
                "current_state_context": json.dumps({"error": str(exc), "stage": "fraud_engine"}),
            }).eq("id", claim_id).execute()
            
            failed_entries.append({"claim_id": claim_id, "error": str(exc)})

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{'='*80}")
    print(f"  RESULTS: {len(success_ids)} succeeded, {len(failed_entries)} failed")
    print(f"{'='*80}")

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
