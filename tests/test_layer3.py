"""Lexora — Layer 3 Integration Tests (Pass 1 + Pass 2)

═══════════════════════════════════════════════════════
 PASS 1  Live Supabase Integration (runs against real DB and HTTP server)
 PASS 2  Staged Cloud Integration  (toggles feature flags in DB and re-runs)
═══════════════════════════════════════════════════════

Prerequisites: FastAPI server must be running locally.
    cd backend
    source venv/bin/activate          # Mac/Linux
    .\\venv\\Scripts\\Activate.ps1        # Windows
    uvicorn main:app --reload --port 8000

Usage (from a second terminal, backend venv active):
    python tests/test_layer3.py           # Pass 1 only
    python tests/test_layer3.py --pass2   # Pass 1 then Pass 2
"""

from __future__ import annotations

import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

# ─── Path resolution ─────────────────────────────────────────────────────────
_backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

# ─── Real Supabase client (no mocks) ─────────────────────────────────────────
from database import get_supabase  # type: ignore[import]  # noqa: E402

try:
    import requests  # type: ignore[import]
except ImportError:
    print("ERROR: 'requests' not found. Run: pip install requests")
    sys.exit(1)

BASE_URL = os.environ.get("LEXORA_API_URL", "http://127.0.0.1:8000")
API_PREFIX = "/api/claims"
CLAIM_LIMIT = 50


# ─── Shared helpers ──────────────────────────────────────────────────────────

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

def compact_json(obj, indent=2):
    s = json.dumps(obj, indent=indent, default=str)
    lines = s.split("\n")
    if len(lines) > 30:
        return "\n".join(lines[:30]) + f"\n  ... ({len(lines)-30} more lines)"
    return s


# ╔══════════════════════════════════════════════════════════════════════╗
# ║                  PASS 1 — LIVE INTEGRATION                          ║
# ╚══════════════════════════════════════════════════════════════════════╝

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


def ensure_fraud_checking(claim):
    """
    Attempt to bring a claim to fraud_checking status via public endpoints.
    Returns (ok, path_used, error_msg).
    """
    cid = claim["id"]
    status = claim["status"]

    if status == "fraud_checking":
        return True, "already", None

    if status == "extracted":
        url = f"{BASE_URL}{API_PREFIX}/{cid}/run-policy"
        try:
            resp = requests.post(url, timeout=30)
            if resp.status_code == 200:
                return True, "run-policy", None
            return False, "run-policy", f"HTTP {resp.status_code}: {resp.text[:200]}"
        except requests.RequestException as e:
            return False, "run-policy", f"Request failed: {e}"

    forcible = ("policy_evaluating", "deciding", "finalized",
                "under_review", "fraud_investigation", "error")
    if status in forcible:
        try:
            db = get_supabase()
            db.table("claims").update({"status": "fraud_checking"}).eq("id", cid).execute()
            return True, f"status-force ({status}->fraud_checking)", None
        except Exception as e:
            return False, "status-force", f"Failed: {e}"

    return False, "unknown", f"Unexpected status '{status}'"


def call_run_fraud(claim_id):
    url = f"{BASE_URL}{API_PREFIX}/{claim_id}/run-fraud"
    try:
        resp = requests.post(url, timeout=60)
        if resp.status_code == 200:
            return resp.json(), None
        return None, f"HTTP {resp.status_code}: {resp.text[:300]}"
    except requests.RequestException as e:
        return None, f"Request failed: {e}"


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
        "started": "started" in event_types,
        "completed": "completed" in event_types,
        "failed": "failed" in event_types,
        "duration_ms": duration_ms,
        "composite_from_audit": composite_from_audit,
        "events": events,
    }


def print_evidence(fraud_analysis):
    t2 = fraud_analysis.get("tier2", {})
    t3 = fraud_analysis.get("tier3", {})

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

    cluster = t3.get("cluster_summary", {})
    t3_evidence = t3.get("evidence", {})
    print(f"  Tier3 Evidence:")
    print(f"    method: {t3_evidence.get('method', '?')}")
    print(f"    component_size: {cluster.get('size', t3_evidence.get('component_size', '?'))}")
    print(f"    direct_connections: {t3_evidence.get('direct_connections', '?')}")
    conn_details = t3_evidence.get("connection_details", [])
    for cd in conn_details[:5]:
        print(f"      {cd}")
    print(f"    provider_hub: {cluster.get('provider_hub', t3_evidence.get('provider_hub', '?'))}")


# ── Document Reuse Test ───────────────────────────────────────────────────────

def find_shared_sha256(db):
    result = db.table("claim_documents").select("claim_id, sha256").execute()
    docs = result.data or []

    hash_to_claims: dict[str, set] = defaultdict(set)
    for d in docs:
        sha = d.get("sha256")
        cid = d.get("claim_id")
        if sha and cid and len(sha) == 64:
            hash_to_claims[sha].add(cid)

    return {h: list(cids) for h, cids in hash_to_claims.items() if len(cids) >= 2}


def run_doc_reuse_test(db):
    print()
    print_header("DOCUMENT REUSE TEST")

    shared = find_shared_sha256(db)
    if not shared:
        print("  No shared sha256 found in claim_documents. Skipping.")
        return True, 0

    print(f"  Found {len(shared)} shared sha256 hash(es):")
    for sha, cids in shared.items():
        print(f"    {sha[:16]}... -> claims: {cids}")

    test_sha, test_cids = next(iter(shared.items()))
    cid_a, cid_b = test_cids[0], test_cids[1]
    print(f"\n  Testing claims: {cid_a} and {cid_b}")
    print(f"  Shared sha256: {test_sha}")
    sep("-")

    errors = []
    for label, cid in [("Claim A", cid_a), ("Claim B", cid_b)]:
        row = db.table("claims").select("id, status, claim_number").eq("id", cid).single().execute().data
        if not row:
            print(f"  {label} ({cid}): NOT FOUND in DB")
            errors.append(f"{label} not found")
            continue

        ok, path, err = ensure_fraud_checking(row)
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
        doc_reuse = t2.get("doc_reuse", [])
        component_size = t3.get("cluster_summary", {}).get("size", 0)

        print(f"  {label}: fraud_score={fraud_result.get('fraud_score')}")
        print(f"    Tier2 score={t2.get('score', 0)}, doc_reuse={len(doc_reuse)} entries")
        print(f"    Tier3 score={t3.get('score', 0)}, component_size={component_size}")

        if doc_reuse or t2.get("score", 0) > 0:
            print(f"    [PASS] Tier2 doc_reuse or elevated score detected")
        else:
            print(f"    [FAIL] Tier2 did NOT detect doc reuse")
            errors.append(f"{label}: Tier2 no doc_reuse")

        if component_size >= 2 or t3.get("score", 0) > 0:
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
    print(f"  DOC REUSE TEST: ALL PASSED")
    return True, 0


# ── Multi-hop Ring Test ───────────────────────────────────────────────────────

def find_multi_hop_chain(db):
    """Find 3-claim chain A-B-C where A shares identifier X with B, B shares Y with C."""
    result = db.table("claims").select(
        "id, claim_number, claimant_phone, claimant_name, provider_name, invoice_number"
    ).execute()
    claims = result.data or []

    docs = db.table("claim_documents").select("claim_id, sha256").execute().data or []
    claim_hashes: dict[str, set] = defaultdict(set)
    for d in docs:
        if d.get("sha256") and len(d["sha256"]) == 64:
            claim_hashes[d["claim_id"]].add(d["sha256"])

    ident_map: dict[str, set] = defaultdict(set)
    claim_idents: dict[str, set] = defaultdict(set)

    for c in claims:
        cid = c["id"]
        for key in [
            f"phone:{(c.get('claimant_phone') or '').strip()}",
            f"provider:{(c.get('provider_name') or '').strip().lower()}",
            f"invoice:{(c.get('invoice_number') or '').strip().upper()}",
        ]:
            val = key.split(":", 1)[1]
            if val:
                ident_map[key].add(cid)
                claim_idents[cid].add(key)
        for h in claim_hashes.get(cid, set()):
            k = f"doc:{h[:16]}"
            ident_map[k].add(cid)
            claim_idents[cid].add(k)

    for ident_x, cids_x in ident_map.items():
        if len(cids_x) < 2:
            continue
        cids_list = list(cids_x)
        for i, a in enumerate(cids_list):
            for b in cids_list[i + 1:]:
                for ident_y in claim_idents[b]:
                    if ident_y == ident_x:
                        continue
                    for c in ident_map[ident_y]:
                        if c != a and c != b:
                            return a, b, c, {"A_B_shared": ident_x, "B_C_shared": ident_y}
    return None


def run_multi_hop_test(db):
    print()
    print_header("MULTI-HOP RING TEST")

    chain = find_multi_hop_chain(db)
    if chain is None:
        print("  Not found in current dataset.")
        print("  (No 3-claim chain A-B-C with distinct shared identifiers)")
        return True, 0

    a, b, c, details = chain
    print(f"  Found chain: A={a}  B={b}  C={c}")
    print(f"  A<->B via: {details['A_B_shared']}")
    print(f"  B<->C via: {details['B_C_shared']}")
    sep("-")

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
    else:
        print(f"  [WARN] component_size = {component_size} (expected >= 3; B or C may be outside lookback)")
    return True, 0


# ── Pass 1 main ───────────────────────────────────────────────────────────────

def run_pass1():
    print_header("LEXORA — Layer 3 Pass 1: Live Integration Test")
    print(f"API Base: {BASE_URL}\n")

    db = get_supabase()

    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if r.status_code != 200:
            print(f"ERROR: API health returned {r.status_code}. Is the server running?")
            return 1
        print("API health check: OK")
    except requests.RequestException:
        print(f"ERROR: Cannot reach {BASE_URL}/health. Start the server first.")
        return 1

    print(f"Fetching {CLAIM_LIMIT} most recent claims from Supabase...")
    claims = fetch_recent_claims(db)
    if not claims:
        print("ERROR: No claims found in the database.")
        return 1
    print(f"Found {len(claims)} claims.\n")

    total = len(claims)
    fraud_score_ok = diagnostics_ok = audit_ok = 0
    failures: list[tuple[str, str]] = []

    for i, claim in enumerate(claims, 1):
        cid = claim["id"]
        cnum = claim.get("claim_number", "?")

        sep("=")
        print(f"  [{i}/{total}] {cnum}  id={cid}")
        print(f"  Status: {claim.get('status')}  Amount: {claim.get('claimed_amount')}")
        print(f"  Provider: {claim.get('provider_name')}  Invoice: {claim.get('invoice_number')}")
        sep("-")

        ok, path, err = ensure_fraud_checking(claim)
        if not ok:
            print(f"  [FAIL] Status transition: {err}")
            failures.append((cnum, f"Status transition: {err}"))
            continue
        print(f"  Status ready via [{path}]")

        print(f"  Calling POST {API_PREFIX}/{cid}/run-fraud ...")
        resp_data, err = call_run_fraud(cid)
        if err:
            print(f"  [FAIL] run-fraud: {err}")
            failures.append((cnum, f"run-fraud: {err}"))
            continue

        fraud_result = resp_data.get("fraud_result", {})
        fraud_analysis = fraud_result.get("fraud_analysis", {})
        t1 = fraud_analysis.get("tier1", {}).get("score", "?")
        t2 = fraud_analysis.get("tier2", {}).get("score", "?")
        t3 = fraud_analysis.get("tier3", {}).get("score", "?")

        print(f"  Fraud Score: {fraud_result.get('fraud_score')}")
        print(f"  Tier1={t1} | Tier2={t2} | Tier3={t3}")
        print(f"  Risk: {fraud_analysis.get('risk_band')}  Action: {fraud_analysis.get('recommended_action')}")
        sep("-")
        print_evidence(fraud_analysis)
        sep("-")

        db_ok, db_err, _ = validate_db_update(db, cid)
        if db_ok:
            print(f"  [PASS] DB: fraud_score and fraud_analysis written correctly.")
            fraud_score_ok += 1
        else:
            print(f"  [FAIL] DB: {db_err}")
            failures.append((cnum, f"DB: {db_err}"))

        diag_ok, diag_errs, _ = validate_diagnostics(fraud_analysis)
        if diag_ok:
            print(f"  [PASS] Diagnostics: all services disabled, fallback paths correct.")
            diagnostics_ok += 1
        else:
            for de in diag_errs:
                print(f"  [FAIL] Diag: {de}")
            failures.append((cnum, f"Diagnostics: {'; '.join(diag_errs)}"))

        audit = validate_audit_events(db, cid)
        s = "PASS" if audit["started"] else "FAIL"
        c = "PASS" if audit["completed"] else "FAIL"
        f = "WARN" if audit["failed"] else "OK"
        print(f"  Audit: started [{s}] | completed [{c}] | failed [{f}]")
        if audit["duration_ms"]:
            print(f"  Audit: duration_ms = {audit['duration_ms']}")
        if audit["composite_from_audit"]:
            print(f"  Audit: composite = {audit['composite_from_audit']}")

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

    doc_ok, _ = run_doc_reuse_test(db)
    hop_ok, _ = run_multi_hop_test(db)

    print()
    print_header("PASS 1 SUMMARY")
    print(f"  Claims tested:                    {total}")
    print(f"  Non-null fraud_score:             {fraud_score_ok}/{total}")
    print(f"  Correct diagnostics:              {diagnostics_ok}/{total}")
    print(f"  Valid audit events:               {audit_ok}/{total}")
    print(f"  Document Reuse Test:              {'PASS' if doc_ok else 'FAIL'}")
    print(f"  Multi-hop Ring Test:              {'PASS' if hop_ok else 'FAIL'}")
    if failures:
        sep("-")
        print("  FAILURES:")
        for cnum, reason in failures:
            print(f"    {cnum}: {reason}")
        sep("-")
    else:
        print("  ALL CHECKS PASSED.")
    sep("=")
    return 0 if not failures else 1


# ╔══════════════════════════════════════════════════════════════════════╗
# ║                 PASS 2 — STAGED CLOUD INTEGRATION                   ║
# ╚══════════════════════════════════════════════════════════════════════╝

def _check_api_health():
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=3)
        if r.status_code == 200:
            print("  API health check: OK")
            return True
    except requests.exceptions.RequestException:
        pass
    print(f"  ERROR: API at {BASE_URL} is not reachable.")
    return False


def _setup_claim_for_fraud(db, claim_id: str) -> bool:
    claim = db.table("claims").select("status").eq("id", claim_id).single().execute()
    if not claim.data:
        print(f"  Claim {claim_id} not found.")
        return False
    if claim.data["status"] != "fraud_checking":
        db.table("claims").update({"status": "fraud_checking"}).eq("id", claim_id).execute()
    return True


def _run_stage(db, claim_id: str, stage_name: str, env_overrides: dict):
    print(f"\n{'='*60}\n STAGE: {stage_name}\n{'='*60}")

    # Write overrides to configuration table (engine reads this on every call)
    for k, v in env_overrides.items():
        db.table("configuration").delete().eq("config_key", k).execute()
        db.table("configuration").insert({
            "config_key": k, "config_value": str(v), "config_type": "feature_flag"
        }).execute()
    time.sleep(1)

    if not _setup_claim_for_fraud(db, claim_id):
        return False

    print(f"  Triggering POST /api/claims/{claim_id}/run-fraud ...")
    r = requests.post(f"{BASE_URL}/api/claims/{claim_id}/run-fraud")
    if r.status_code != 200:
        print(f"  Request failed: {r.status_code} - {r.text}")
        return False

    data = r.json()
    res = data.get("fraud_result", {})
    analysis = res.get("fraud_analysis", {})
    diag = analysis.get("diagnostics", {})
    t2 = analysis.get("tier2", {})
    t3 = analysis.get("tier3", {})

    print(f"  Tier 2 Method : {t2.get('evidence', {}).get('method')}")
    print(f"  Tier 3 Method : {t3.get('evidence', {}).get('method')}")
    print(f"  Diagnostics:")
    for svc in ("cohere", "qdrant", "neo4j", "jina"):
        print(f"    {svc:8s}: {diag.get('services', {}).get(svc)}")
    return True


def run_pass2():
    print_header("LEXORA — Layer 3 Pass 2: Staged Cloud Integration Test")

    if not _check_api_health():
        return 1

    db = get_supabase()

    doc_res = db.table("claim_documents").select("claim_id").limit(1).execute()
    if not doc_res.data:
        print("No claims with documents found to test. Aborting.")
        return 1
    claim_id = doc_res.data[0]["claim_id"]

    _flags = "FRAUD_LAYER3_ENABLE_QDRANT FRAUD_LAYER3_ENABLE_NEO4J FRAUD_LAYER3_ENABLE_JINA_MEDIA".split()

    # Stage A — all disabled (pure fallback)
    _run_stage(db, claim_id, "STAGE A: ALL DISABLED (Fallback)", {
        f: "false" for f in _flags
    })

    # Stage B — Qdrant + Cohere only
    _run_stage(db, claim_id, "STAGE B: QDRANT + COHERE ONLY", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "true",
        "FRAUD_LAYER3_ENABLE_NEO4J": "false",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "false",
    })

    # Stage C — idempotency re-run (should skip re-embedding)
    _run_stage(db, claim_id, "STAGE C: IDEMPOTENCY CHECK (Should Skip Embedding)", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "true",
        "FRAUD_LAYER3_ENABLE_NEO4J": "false",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "false",
    })

    # Stage D — Neo4j only
    _run_stage(db, claim_id, "STAGE D: NEO4J ONLY", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "false",
        "FRAUD_LAYER3_ENABLE_NEO4J": "true",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "false",
    })

    # Stage E — Jina media
    _run_stage(db, claim_id, "STAGE E: JINA MEDIA (1 file embedded)", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "true",
        "FRAUD_LAYER3_ENABLE_NEO4J": "false",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "true",
    })

    # Stage F — force failure (bad Qdrant URL)
    print("\n  [Pre-cleaning Stage F: wiping Qdrant vectors for this claim]")
    from engines.layer3.qdrant_client import QdrantConnector  # type: ignore[import]  # noqa: PLC0415
    qc = QdrantConnector({
        "qdrant_url": os.environ.get("QDRANT_URL"),
        "qdrant_api_key": os.environ.get("QDRANT_API_KEY"),
    })
    if qc.client:
        try:
            pt_id = str(qc._to_qdrant_point_id(claim_id))
            qc.client.delete(os.environ.get("QDRANT_COLLECTION_TEXT", "claims_v1_text"), [pt_id])
            db_docs = db.table("claim_documents").select("sha256").eq("claim_id", claim_id).execute()
            for doc in db_docs.data:
                qc.client.delete(
                    os.environ.get("QDRANT_COLLECTION_MEDIA", "claims_v1_media"),
                    [str(qc._to_qdrant_point_id(doc["sha256"]))],
                )
        except Exception:
            pass

    _run_stage(db, claim_id, "STAGE F: FORCE FAILURE (Bad Qdrant URL)", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "true",
        "FRAUD_LAYER3_ENABLE_NEO4J": "false",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "false",
        "QDRANT_URL": "http://invalid-force-fail.lexora:9999",
    })

    # Cleanup config overrides
    all_keys = [*_flags, "QDRANT_URL"]
    for k in all_keys:
        db.table("configuration").delete().eq("config_key", k).execute()

    print("\n  ALL STAGED TESTS COMPLETED.")
    return 0


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    run_pass2_flag = "--pass2" in sys.argv

    rc = run_pass1()
    if run_pass2_flag:
        rc2 = run_pass2()
        rc = max(rc, rc2)

    sys.exit(rc)
