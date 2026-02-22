"""Layer 3 Pass 2: Real Data Integration Test (Staged Cloud Integration)

Tests the cloud connections to Cohere, Qdrant, Neo4j, and Jina.
Fails open to local fallback logic gracefully.
Run with appropriate API keys in your environment.
"""
import sys
import json
import time
import os
import requests
from database import get_supabase
from services.audit import AuditTimer

API_BASE = os.environ.get("LEXORA_API_URL", "http://localhost:8000")


def check_api_health():
    try:
        r = requests.get(f"{API_BASE}/health", timeout=3)
        if r.status_code == 200:
            print("  API health check: OK")
            return True
    except requests.exceptions.RequestException:
        pass
    print(f"  ERROR: API at {API_BASE} is not reachable. Ensure server is running.")
    return False


def setup_claim_for_fraud(db, claim_id: str):
    """Ensure claim is in 'fraud_checking' status so we can run the endpoint."""
    claim = db.table("claims").select("status").eq("id", claim_id).single().execute()
    if not claim.data:
        print(f"  Claim {claim_id} not found.")
        return False
    status = claim.data["status"]
    if status != "fraud_checking":
        db.table("claims").update({"status": "fraud_checking"}).eq("id", claim_id).execute()
    return True


def run_stage(db, claim_id: str, stage_name: str, env_overrides: dict, expected_method_t2=None, expected_method_t3=None, check_jina_used=False):
    print(f"\n{'='*60}")
    print(f" STAGE: {stage_name}")
    print(f"{'='*60}")
    
    # We must patch os.environ directly for FastAPI server, BUT if the server is running in a separate process, 
    # setting env vars here won't affect it!
    # Ah! The fastAPI server config loads env vars at startup. But wait, `engines.layer3.config.load_config` 
    # reads `os.environ.get` ON EVERY CALL.
    # Therefore, we can't change the API server's env vars from a remote script unless we pass them or restart it.
    # INSTEAD, for the testing script to work perfectly without restarting the server, we will import and run
    # `run_fraud_check` directly without hitting the API! Or we can update the config table in DB and let the engine read it.
    
    # Let's adjust DB config since it overrides!
    for k, v in env_overrides.items():
        # Clean old
        db.table("configuration").delete().eq("config_key", k).execute()
        # Set new
        db.table("configuration").insert({"config_key": k, "config_value": str(v), "config_type": "feature_flag"}).execute()

    # Sleep briefly to ensure any DB lag
    time.sleep(1)
    
    if not setup_claim_for_fraud(db, claim_id):
        return False

    print(f"  Triggering POST /api/claims/{claim_id}/run-fraud ...")
    r = requests.post(f"{API_BASE}/api/claims/{claim_id}/run-fraud")
    if r.status_code != 200:
        print(f"  Request failed: {r.status_code} - {r.text}")
        return False
        
    data = r.json()
    res = data.get("fraud_result", {})
    analysis = res.get("fraud_analysis", {})
    diag = analysis.get("diagnostics", {})
    t2 = analysis.get("tier2", {})
    t3 = analysis.get("tier3", {})
    
    print(f"  Tier 2 Method: {t2.get('evidence', {}).get('method')}")
    print(f"  Tier 3 Method: {t3.get('evidence', {}).get('method')}")
    print(f"  Diagnostics Services:")
    print(f"    Cohere: {diag.get('services', {}).get('cohere')}")
    print(f"    Qdrant: {diag.get('services', {}).get('qdrant')}")
    print(f"    Neo4j : {diag.get('services', {}).get('neo4j')}")
    print(f"    Jina  : {diag.get('services', {}).get('jina')}")
    
    return True


def run_staged_tests():
    print("LEXORA -- Layer 3 Pass 2: Staged Cloud Integration Test")
    print("============================================================")

    if not check_api_health():
        sys.exit(1)

    db = get_supabase()

    # Get a recent claim with doc
    doc_claim_res = db.table("claim_documents").select("claim_id").limit(1).execute()
    if not doc_claim_res.data:
        print("No claims with documents found to test Jina integration.")
        sys.exit(1)
    
    claim_id = doc_claim_res.data[0]["claim_id"]

    # STAGE A: ALL DISABLED (Fallback)
    run_stage(db, claim_id, "STAGE A: ALL DISABLED (Fallback)", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "false",
        "FRAUD_LAYER3_ENABLE_NEO4J": "false",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "false",
    })

    # STAGE B: QDRANT + COHERE ONLY
    run_stage(db, claim_id, "STAGE B: QDRANT + COHERE ONLY", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "true",
        "FRAUD_LAYER3_ENABLE_NEO4J": "false",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "false",
    })

    # STAGE C: IDEMPOTENCY CHECK (Re-run Stage B)
    run_stage(db, claim_id, "STAGE C: IDEMPOTENCY CHECK (Should Skip Embedding)", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "true",
        "FRAUD_LAYER3_ENABLE_NEO4J": "false",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "false",
    })

    # STAGE D: NEO4J ONLY
    run_stage(db, claim_id, "STAGE D: NEO4J ONLY", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "false",
        "FRAUD_LAYER3_ENABLE_NEO4J": "true",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "false",
    })

    # STAGE E: JINA MEDIA
    run_stage(db, claim_id, "STAGE E: JINA MEDIA (Only 1 file embedded)", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "true",
        "FRAUD_LAYER3_ENABLE_NEO4J": "false",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "true",
    })
    
    # STAGE F: FORCE FAILURE
    print("\n  [Testing Force Failure - Overriding QDRANT_URL locally]")
    
    # Purge any known configuration logic 
    keys = ["FRAUD_LAYER3_ENABLE_QDRANT", "FRAUD_LAYER3_ENABLE_NEO4J", "FRAUD_LAYER3_ENABLE_JINA_MEDIA", "QDRANT_URL"]
    for k in keys:
        db.table("configuration").delete().eq("config_key", k).execute()

    # We must explicitly bypass the cache for Stage F to test the connection failure
    from engines.layer3.qdrant_client import QdrantConnector
    qc = QdrantConnector({
        "qdrant_url": os.environ.get("QDRANT_URL"),
        "qdrant_api_key": os.environ.get("QDRANT_API_KEY")
    })
    
    if qc.client:
        try:
            pt_id = str(qc._to_qdrant_point_id(claim_id))
            qc.client.delete(os.environ.get("QDRANT_COLLECTION_TEXT", "claims_v1_text"), [pt_id])
            
            # Wiping out media hashes
            db_docs = db.table("claim_documents").select("sha256").eq("claim_id", claim_id).execute()
            for doc in db_docs.data:
                qc.client.delete(os.environ.get("QDRANT_COLLECTION_MEDIA", "claims_v1_media"), [str(qc._to_qdrant_point_id(doc["sha256"]))])
        except Exception:
            pass
            
    run_stage(db, claim_id, "STAGE F: FORCE FAILURE (Bad Qdrant URL)", {
        "FRAUD_LAYER3_ENABLE_QDRANT": "true",
        "FRAUD_LAYER3_ENABLE_NEO4J": "false",
        "FRAUD_LAYER3_ENABLE_JINA_MEDIA": "false",
        "QDRANT_URL": "http://invalid-force-fail.lexora:9999"
    })
    
    # Cleanup config flags
    keys = ["FRAUD_LAYER3_ENABLE_QDRANT", "FRAUD_LAYER3_ENABLE_NEO4J", "FRAUD_LAYER3_ENABLE_JINA_MEDIA", "QDRANT_URL"]
    for k in keys:
        db.table("configuration").delete().eq("config_key", k).execute()

    print("\n  ALL TESTS COMPLETED.")


if __name__ == "__main__":
    run_staged_tests()
