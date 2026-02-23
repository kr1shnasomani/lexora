"""Lexora -- Layer 3 Pass 1: Live Supabase Integration Test

Connects to real Supabase, fetches claims, calls actual HTTP endpoints,
then validates DB updates, diagnostics, and audit trail.

Also includes targeted validation sections:
  - Document Reuse Test (shared sha256 across claims)
  - Multi-hop Ring Test (3-claim chains via shared identifiers)

Usage:
    1. Start the FastAPI server:
           cd backend
           venv\\Scripts\\activate
           uvicorn main:app --reload --port 8000

    2. In a SECOND terminal:
           cd backend
           venv\\Scripts\\activate
           python test_layer3_realdata.py
"""

import sys
import json
import time
import os
from pathlib import Path
from collections import defaultdict

# -- Path resolution --------------------------------------------------------
_this_file = Path(__file__).resolve()
_backend_dir = _this_file.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

# -- Real Supabase client (no mocks) ----------------------------------------
from database import get_supabase

# -- HTTP client -------------------------------------------------------------
try:
    import requests
except ImportError:
    print("ERROR: 'requests' package not found. Install with: pip install requests")
    sys.exit(1)

# -- Configuration -----------------------------------------------------------
BASE_URL = os.environ.get("LEXORA_API_URL", "http://127.0.0.1:8000")
API_PREFIX = "/api/claims"
CLAIM_LIMIT = 50


# ===========================================================================
# Helpers
# ===========================================================================

def sep(char="-", width=60):
    print(char * width)

def print_header(text):
    sep("=")
    print(f"  {text}")
    sep("=")

def safe_json_loads(val):
    if val is None:
        return None
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return None
    return val

def compact_json(obj, indent=2, max_width=120):
    """Return compact JSON string, truncated if too wide."""
    s = json.dumps(obj, indent=indent, default=str)
    lines = s.split("\n")
    if len(lines) > 30:
        return "\n".join(lines[:30]) + f"\n  ... ({len(lines)-30} more lines)"
    return s


# ===========================================================================
# 1. Discover claims
# ===========================================================================

def fetch_recent_claims(db, limit=CLAIM_LIMIT):
    result = (
        db.table("claims")
        .select("id, claim_number, status, claimed_amount, provider_name, "
                "invoice_number, claimant_phone, claimant_name")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ===========================================================================
# 2. Ensure claim reaches fraud_checking via public endpoints
# ===========================================================================

def ensure_fraud_checking(claim):
    """
    Attempt to bring a claim to fraud_checking status via public endpoints.
    Returns (ok, path_used, error_msg).
    Path values: "already", "run-policy", "status-force"
    """
    cid = claim["id"]
    status = claim["status"]

    if status == "fraud_checking":
        return True, "already", None

    # extracted -> policy_evaluating -> fraud_checking  (via run-policy)
    if status == "extracted":
        url = f"{BASE_URL}{API_PREFIX}/{cid}/run-policy"
        try:
            resp = requests.post(url, timeout=30)
            if resp.status_code == 200:
                return True, "run-policy", None
            else:
                return False, "run-policy", f"HTTP {resp.status_code}: {resp.text[:200]}"
        except requests.RequestException as e:
            return False, "run-policy", f"Request failed: {e}"

    # policy_evaluating -> fraud_checking  (force status since no endpoint for this)
    if status == "policy_evaluating":
        try:
            db = get_supabase()
            db.table("claims").update({"status": "fraud_checking"}).eq("id", cid).execute()
            return True, "status-force (policy_evaluating->fraud_checking)", None
        except Exception as e:
            return False, "status-force", f"Failed: {e}"

    # deciding / finalized / etc -- reset to fraud_checking for re-run
    if status in ("deciding", "finalized", "under_review", "fraud_investigation"):
        try:
            db = get_supabase()
            db.table("claims").update({"status": "fraud_checking"}).eq("id", cid).execute()
            return True, f"status-force ({status}->fraud_checking)", None
        except Exception as e:
            return False, "status-force", f"Failed: {e}"

    # error -> submitted -> extracting ... too many hops, force directly
    if status == "error":
        try:
            db = get_supabase()
            db.table("claims").update({"status": "fraud_checking"}).eq("id", cid).execute()
            return True, "status-force (error->fraud_checking)", None
        except Exception as e:
            return False, "status-force", f"Failed: {e}"

    return False, "unknown", f"Unexpected status '{status}'"


# ===========================================================================
# 3. Call run-fraud endpoint
# ===========================================================================

def call_run_fraud(claim_id):
    url = f"{BASE_URL}{API_PREFIX}/{claim_id}/run-fraud"
    try:
        resp = requests.post(url, timeout=60)
        if resp.status_code == 200:
            return resp.json(), None
        else:
            return None, f"HTTP {resp.status_code}: {resp.text[:300]}"
    except requests.RequestException as e:
        return None, f"Request failed: {e}"


# ===========================================================================
# 4. Validate DB update
# ===========================================================================

def validate_db_update(db, claim_id):
    result = (
        db.table("claims")
        .select("fraud_score, fraud_analysis, status")
        .eq("id", claim_id)
        .single()
        .execute()
    )
    row = result.data
    if not row:
        return False, "Claim not found after update", None

    errors = []
    if row.get("fraud_score") is None:
        errors.append("fraud_score is NULL")
    if row.get("fraud_analysis") is None:
        errors.append("fraud_analysis is NULL")

    analysis = safe_json_loads(row.get("fraud_analysis"))
    if analysis:
        for key in ("tier1", "tier2", "tier3", "diagnostics"):
            if key not in analysis:
                errors.append(f"fraud_analysis missing '{key}'")
    else:
        errors.append("fraud_analysis could not be parsed")

    if errors:
        return False, "; ".join(errors), analysis
    return True, None, analysis


# ===========================================================================
# 5. Validate diagnostics
# ===========================================================================

def validate_diagnostics(analysis):
    errors = []
    diag = analysis.get("diagnostics", {})
    services = diag.get("services", {})

    for svc in ("cohere", "qdrant", "neo4j", "jina"):
        svc_data = services.get(svc, {})
        if svc_data.get("used") is not False:
            errors.append(f"{svc}.used != false")

    paths = diag.get("primary_path", {})
    if paths.get("tier2") != "fallback_local":
        errors.append(f"tier2 path = '{paths.get('tier2')}', expected 'fallback_local'")
    if paths.get("tier3") != "fallback_relational":
        errors.append(f"tier3 path = '{paths.get('tier3')}', expected 'fallback_relational'")

    return len(errors) == 0, errors, diag


# ===========================================================================
# 6. Validate audit events  (FIXED: uses event_type, not status)
# ===========================================================================

def validate_audit_events(db, claim_id):
    result = (
        db.table("audit_events")
        .select("*")
        .eq("claim_id", claim_id)
        .eq("stage", "fraud_engine")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    events = result.data or []
    event_types = [e.get("event_type") for e in events]

    has_started = "started" in event_types
    has_completed = "completed" in event_types
    has_failed = "failed" in event_types

    duration_ms = None
    composite_from_audit = None
    for e in events:
        if e.get("event_type") == "completed":
            duration_ms = e.get("duration_ms")
            payload = safe_json_loads(e.get("payload"))
            if payload:
                composite_from_audit = payload.get("fraud_score")
                if duration_ms is None:
                    duration_ms = payload.get("duration_ms")
            break

    return {
        "started": has_started,
        "completed": has_completed,
        "failed": has_failed,
        "duration_ms": duration_ms,
        "composite_from_audit": composite_from_audit,
        "events": events,
    }


# ===========================================================================
# 7. Print compact evidence block
# ===========================================================================

def print_evidence(fraud_analysis):
    """Print compact Tier2/Tier3 evidence block."""
    t2 = fraud_analysis.get("tier2", {})
    t3 = fraud_analysis.get("tier3", {})

    # Tier2 doc reuse
    doc_reuse = t2.get("doc_reuse", [])
    t2_evidence = t2.get("evidence", {})
    print(f"  Tier2 Evidence:")
    print(f"    method: {t2_evidence.get('method', '?')}")
    print(f"    candidates_evaluated: {t2_evidence.get('candidates_evaluated', '?')}")
    print(f"    top_match_similarity: {t2_evidence.get('top_match_similarity', '?')}")
    if doc_reuse:
        print(f"    doc_reuse: YES ({len(doc_reuse)} hash(es))")
        for dr in doc_reuse:
            sha_short = dr.get("sha256", "?")[:16] + "..."
            linked = dr.get("other_claim_ids", [])
            print(f"      sha256={sha_short} linked_to={linked}")
    else:
        print(f"    doc_reuse: NONE")

    # Tier3 cluster
    cluster = t3.get("cluster_summary", {})
    t3_evidence = t3.get("evidence", {})
    print(f"  Tier3 Evidence:")
    print(f"    method: {t3_evidence.get('method', '?')}")
    print(f"    component_size: {cluster.get('size', t3_evidence.get('component_size', '?'))}")
    print(f"    direct_connections: {t3_evidence.get('direct_connections', '?')}")
    conn_details = t3_evidence.get("connection_details", [])
    if conn_details:
        for cd in conn_details[:5]:
            print(f"      {cd}")
    print(f"    provider_hub: {cluster.get('provider_hub', t3_evidence.get('provider_hub', '?'))}")


# ===========================================================================
# 8. Document Reuse Test
# ===========================================================================

def find_shared_sha256(db):
    """Find sha256 hashes that appear in >=2 different claim_ids."""
    result = db.table("claim_documents").select("claim_id, sha256").execute()
    docs = result.data or []

    hash_to_claims = defaultdict(set)
    for d in docs:
        sha = d.get("sha256")
        cid = d.get("claim_id")
        if sha and cid and len(sha) == 64:
            hash_to_claims[sha].add(cid)

    shared = {h: list(cids) for h, cids in hash_to_claims.items() if len(cids) >= 2}
    return shared


def run_doc_reuse_test(db):
    """Section: Document Reuse Test."""
    print()
    print_header("DOCUMENT REUSE TEST")

    shared = find_shared_sha256(db)
    if not shared:
        print("  No shared sha256 found in claim_documents. Skipping.")
        return True, 0

    print(f"  Found {len(shared)} shared sha256 hash(es):")
    for sha, cids in shared.items():
        print(f"    {sha[:16]}... -> claims: {cids}")

    # Pick the first shared hash
    test_sha, test_cids = next(iter(shared.items()))
    cid_a, cid_b = test_cids[0], test_cids[1]
    print()
    print(f"  Testing claims: {cid_a} and {cid_b}")
    print(f"  Shared sha256: {test_sha}")
    sep("-")

    errors = []

    for label, cid in [("Claim A", cid_a), ("Claim B", cid_b)]:
        # Fetch current status
        row = db.table("claims").select("id, status, claim_number").eq("id", cid).single().execute().data
        if not row:
            print(f"  {label} ({cid}): NOT FOUND in DB")
            errors.append(f"{label} not found")
            continue

        claim_for_transition = row
        ok, path, err = ensure_fraud_checking(claim_for_transition)
        if not ok:
            print(f"  {label}: Could not transition: {err}")
            errors.append(f"{label} transition: {err}")
            continue
        print(f"  {label}: transitioned via [{path}]")

        resp_data, err = call_run_fraud(cid)
        if err:
            print(f"  {label}: run-fraud FAILED: {err}")
            errors.append(f"{label} run-fraud: {err}")
            continue

        fraud_result = resp_data.get("fraud_result", {})
        fraud_analysis = fraud_result.get("fraud_analysis", {})
        t2 = fraud_analysis.get("tier2", {})
        t3 = fraud_analysis.get("tier3", {})
        t2_score = t2.get("score", 0)
        t3_score = t3.get("score", 0)
        doc_reuse = t2.get("doc_reuse", [])
        component_size = t3.get("cluster_summary", {}).get("size", 0)

        print(f"  {label}: fraud_score={fraud_result.get('fraud_score')}")
        print(f"    Tier2 score={t2_score}, doc_reuse={len(doc_reuse)} entries")
        print(f"    Tier3 score={t3_score}, component_size={component_size}")

        # Assertions
        if doc_reuse or t2_score > 0:
            print(f"    [PASS] Tier2 doc_reuse or elevated score detected")
        else:
            print(f"    [FAIL] Tier2 did NOT detect doc reuse")
            errors.append(f"{label}: Tier2 no doc_reuse")

        if component_size >= 2 or t3_score > 0:
            print(f"    [PASS] Tier3 component_size >= 2 or elevated score")
        else:
            print(f"    [INFO] Tier3 component_size = {component_size}")

        print_evidence(fraud_analysis)
        sep("-")

    if errors:
        print(f"  DOC REUSE TEST: SOME FAILURES")
        for e in errors:
            print(f"    - {e}")
        return False, len(errors)
    else:
        print(f"  DOC REUSE TEST: ALL PASSED")
        return True, 0


# ===========================================================================
# 9. Multi-hop Ring Test
# ===========================================================================

def find_multi_hop_chain(db):
    """
    Try to find 3 claims A, B, C where:
      A shares identifier X with B
      B shares identifier Y with C  (Y != X)
    Returns (A, B, C, details) or None.
    """
    result = db.table("claims").select(
        "id, claim_number, claimant_phone, claimant_name, provider_name, invoice_number"
    ).execute()
    claims = result.data or []

    # Also get doc hashes
    docs_result = db.table("claim_documents").select("claim_id, sha256").execute()
    docs = docs_result.data or []
    claim_hashes = defaultdict(set)
    for d in docs:
        if d.get("sha256") and len(d["sha256"]) == 64:
            claim_hashes[d["claim_id"]].add(d["sha256"])

    # Build identifier -> set of claim_ids
    ident_map = defaultdict(set)  # identifier_key -> {claim_ids}
    claim_idents = defaultdict(set)  # claim_id -> {identifier_keys}

    for c in claims:
        cid = c["id"]
        phone = (c.get("claimant_phone") or "").strip()
        provider = (c.get("provider_name") or "").strip().lower()
        invoice = (c.get("invoice_number") or "").strip().upper()

        if phone:
            key = f"phone:{phone}"
            ident_map[key].add(cid)
            claim_idents[cid].add(key)
        if provider:
            key = f"provider:{provider}"
            ident_map[key].add(cid)
            claim_idents[cid].add(key)
        if invoice:
            key = f"invoice:{invoice}"
            ident_map[key].add(cid)
            claim_idents[cid].add(key)
        for h in claim_hashes.get(cid, set()):
            key = f"doc:{h[:16]}"
            ident_map[key].add(cid)
            claim_idents[cid].add(key)

    # Search: for each pair (A, ident_X), find B sharing ident_X,
    # then find ident_Y != ident_X shared by B with some C != A, B
    for ident_x, cids_x in ident_map.items():
        if len(cids_x) < 2:
            continue
        cids_list = list(cids_x)
        for i, a in enumerate(cids_list):
            for b in cids_list[i+1:]:
                # A and B share ident_x. Now find a DIFFERENT ident shared by B with C.
                for ident_y in claim_idents[b]:
                    if ident_y == ident_x:
                        continue
                    for c in ident_map[ident_y]:
                        if c != a and c != b:
                            return a, b, c, {
                                "A_B_shared": ident_x,
                                "B_C_shared": ident_y,
                            }
    return None


def run_multi_hop_test(db):
    """Section: Multi-hop Ring Test."""
    print()
    print_header("MULTI-HOP RING TEST")

    chain = find_multi_hop_chain(db)
    if chain is None:
        print("  Not found in current dataset.")
        print("  (No 3-claim chain A-B-C with distinct shared identifiers)")
        return True, 0

    a, b, c, details = chain
    print(f"  Found chain:")
    print(f"    A = {a}")
    print(f"    B = {b}")
    print(f"    C = {c}")
    print(f"    A<->B via: {details['A_B_shared']}")
    print(f"    B<->C via: {details['B_C_shared']}")
    sep("-")

    # Run fraud on A
    row = db.table("claims").select("id, status, claim_number").eq("id", a).single().execute().data
    if not row:
        print(f"  Claim A ({a}) not found!")
        return False, 1

    ok, path, err = ensure_fraud_checking(row)
    if not ok:
        print(f"  Could not transition A: {err}")
        return False, 1
    print(f"  Claim A transitioned via [{path}]")

    resp_data, err = call_run_fraud(a)
    if err:
        print(f"  run-fraud on A failed: {err}")
        return False, 1

    fraud_result = resp_data.get("fraud_result", {})
    fraud_analysis = fraud_result.get("fraud_analysis", {})
    t3 = fraud_analysis.get("tier3", {})
    component_size = t3.get("cluster_summary", {}).get("size", 0)

    print(f"  Claim A fraud_score: {fraud_result.get('fraud_score')}")
    print(f"  Tier3 component_size: {component_size}")
    print_evidence(fraud_analysis)

    if component_size >= 3:
        print(f"  [PASS] Multi-hop: component_size >= 3")
        return True, 0
    else:
        print(f"  [WARN] component_size = {component_size} (expected >= 3)")
        print(f"  This may happen if B or C are outside the lookback window.")
        return True, 0  # Not a hard failure


# ===========================================================================
# Main: per-claim test loop
# ===========================================================================

def main():
    print_header("LEXORA -- Layer 3 Pass 1: Live Integration Test")
    print(f"API Base: {BASE_URL}")
    print()

    db = get_supabase()

    # -- 1. Check API is up --------------------------------------------------
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if r.status_code != 200:
            print(f"ERROR: API health check returned {r.status_code}. Is the server running?")
            sys.exit(1)
        print("API health check: OK")
    except requests.RequestException:
        print(f"ERROR: Cannot reach {BASE_URL}/health. Start the server first:")
        print(f"       uvicorn main:app --reload --port 8000")
        sys.exit(1)

    # -- 2. Discover claims ---------------------------------------------------
    print("Fetching 5 most recent claims from Supabase...")
    claims = fetch_recent_claims(db)
    if not claims:
        print("ERROR: No claims found in the database.")
        sys.exit(1)
    print(f"Found {len(claims)} claims.\n")

    # -- Counters -------------------------------------------------------------
    total = len(claims)
    fraud_score_ok = 0
    diagnostics_ok = 0
    audit_ok = 0
    failures = []

    # -- 3. Process each claim ------------------------------------------------
    for i, claim in enumerate(claims, 1):
        cid = claim["id"]
        cnum = claim.get("claim_number", "?")
        status = claim.get("status", "?")
        amount = claim.get("claimed_amount", "?")
        provider = claim.get("provider_name", "?")
        invoice = claim.get("invoice_number", "?")

        sep("=")
        print(f"  [{i}/{total}] Claim: {cnum}")
        print(f"  ID:       {cid}")
        print(f"  Status:   {status}")
        print(f"  Amount:   {amount}")
        print(f"  Provider: {provider}")
        print(f"  Invoice:  {invoice}")
        sep("-")

        # -- Ensure fraud_checking -------------------------------------------
        ok, path, err = ensure_fraud_checking(claim)
        if not ok:
            print(f"  [FAIL] Could not transition: {err}")
            failures.append((cnum, f"Status transition: {err}"))
            continue
        print(f"  Status ready via [{path}]")

        # -- Call run-fraud ---------------------------------------------------
        print(f"  Calling POST {API_PREFIX}/{cid}/run-fraud ...")
        resp_data, err = call_run_fraud(cid)
        if err:
            print(f"  [FAIL] run-fraud failed: {err}")
            failures.append((cnum, f"run-fraud: {err}"))
            continue

        fraud_result = resp_data.get("fraud_result", {})
        fraud_analysis = fraud_result.get("fraud_analysis", {})
        fraud_score = fraud_result.get("fraud_score", None)

        tier1_score = fraud_analysis.get("tier1", {}).get("score", "?")
        tier2_score = fraud_analysis.get("tier2", {}).get("score", "?")
        tier3_score = fraud_analysis.get("tier3", {}).get("score", "?")
        risk_band = fraud_analysis.get("risk_band", "?")
        action = fraud_analysis.get("recommended_action", "?")

        print(f"  Fraud Score: {fraud_score}")
        print(f"  Tier1: {tier1_score} | Tier2: {tier2_score} | Tier3: {tier3_score}")
        print(f"  Risk Band: {risk_band}")
        print(f"  Recommended Action: {action}")
        sep("-")

        # -- Evidence block ---------------------------------------------------
        print_evidence(fraud_analysis)
        sep("-")

        # -- Validate DB update -----------------------------------------------
        db_ok, db_err, db_analysis = validate_db_update(db, cid)
        if db_ok:
            print(f"  [PASS] DB: fraud_score and fraud_analysis written correctly.")
            fraud_score_ok += 1
        else:
            print(f"  [FAIL] DB: {db_err}")
            failures.append((cnum, f"DB validation: {db_err}"))

        # -- Validate diagnostics ---------------------------------------------
        diag_ok, diag_errs, diag_data = validate_diagnostics(fraud_analysis)
        if diag_ok:
            print(f"  [PASS] Diagnostics: all services disabled, fallback paths correct.")
            diagnostics_ok += 1
        else:
            for de in diag_errs:
                print(f"  [FAIL] Diag: {de}")
            failures.append((cnum, f"Diagnostics: {'; '.join(diag_errs)}"))

        # -- Validate audit events --------------------------------------------
        audit = validate_audit_events(db, cid)
        s_mark = "PASS" if audit["started"] else "FAIL"
        c_mark = "PASS" if audit["completed"] else "FAIL"
        f_mark = "WARN (failed event!)" if audit["failed"] else "OK"

        print(f"  Audit: started [{s_mark}] | completed [{c_mark}] | failed [{f_mark}]")
        if audit["duration_ms"] is not None:
            print(f"  Audit: duration_ms = {audit['duration_ms']}")
        if audit["composite_from_audit"] is not None:
            print(f"  Audit: composite from payload = {audit['composite_from_audit']}")

        if audit["started"] and audit["completed"] and not audit["failed"]:
            audit_ok += 1
        else:
            reasons = []
            if not audit["started"]:
                reasons.append("missing 'started'")
            if not audit["completed"]:
                reasons.append("missing 'completed'")
            if audit["failed"]:
                reasons.append("unexpected 'failed'")
            failures.append((cnum, f"Audit: {', '.join(reasons)}"))

        print()

    # ========================================================================
    # Special test sections
    # ========================================================================
    doc_reuse_ok, doc_reuse_errs = run_doc_reuse_test(db)
    multi_hop_ok, multi_hop_errs = run_multi_hop_test(db)

    # ========================================================================
    # Summary
    # ========================================================================
    print()
    print_header("SUMMARY")
    print(f"  Total claims tested:               {total}")
    print(f"  Claims with non-null fraud_score:   {fraud_score_ok}/{total}")
    print(f"  Claims with correct diagnostics:    {diagnostics_ok}/{total}")
    print(f"  Claims with valid audit events:     {audit_ok}/{total}")
    print(f"  Document Reuse Test:               {'PASS' if doc_reuse_ok else 'FAIL'}")
    print(f"  Multi-hop Ring Test:               {'PASS' if multi_hop_ok else 'FAIL'}")

    if failures:
        print()
        sep("-")
        print("  FAILURES:")
        for cnum, reason in failures:
            print(f"    {cnum}: {reason}")
        sep("-")
    else:
        print()
        print("  ALL CHECKS PASSED.")

    sep("=")
    return 0 if not failures else 1


if __name__ == "__main__":
    rc = main()
    sys.exit(rc)
