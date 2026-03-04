"""Lexora — Neo4j Connectivity & Graph Query Tests

Two sections:
  1. Node counts   — verify Claim and Entity nodes exist (from config module)
  2. Relationship  — sample HAS_ENTITY edges, then cross-check documents in Supabase

Usage (backend venv active):
    python tests/test_neo4j.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from dotenv import load_dotenv
load_dotenv(_backend_dir.parent / ".env")

from engines.layer3.neo4j_client import Neo4jConnector  # noqa: E402
from config import get_settings  # noqa: E402
from database import get_supabase  # noqa: E402


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  SECTION 1 — Node Counts                                            ║
# ╚══════════════════════════════════════════════════════════════════════╝

def test_node_counts():
    """Connect via config module and count Claim / Entity nodes."""
    print("\n" + "=" * 60)
    print("  SECTION 1: Neo4j Node Counts")
    print("=" * 60)

    s = get_settings()
    cfg = {
        "neo4j_uri": s.neo4j_uri,
        "neo4j_user": s.neo4j_user,
        "neo4j_password": s.neo4j_password,
        "neo4j_database": getattr(s, "neo4j_database", ""),
        "neo4j_timeout_seconds": 5,
    }

    neo = Neo4jConnector(cfg)
    try:
        with neo.driver.session(**neo.db_args) as session:
            claim_cnt = session.run("MATCH (c:Claim) RETURN count(c) as cnt").single()["cnt"]
            entity_cnt = session.run("MATCH (e:Entity) RETURN count(e) as cnt").single()["cnt"]

        print(f"  Total Claim  nodes: {claim_cnt}")
        print(f"  Total Entity nodes: {entity_cnt}")

        if claim_cnt == 0:
            print("  [WARN] No Claim nodes found. Are fraud checks being run?")
        else:
            print("  [PASS] Claim nodes present.")

        if entity_cnt == 0:
            print("  [WARN] No Entity nodes found.")
        else:
            print("  [PASS] Entity nodes present.")

    finally:
        neo.close()


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  SECTION 2 — Relationship Query + Supabase Cross-Check             ║
# ╚══════════════════════════════════════════════════════════════════════╝

def test_relationship_and_docs():
    """
    Sample HAS_ENTITY relationships from Neo4j, then fetch matching
    claim_documents from Supabase to verify the claim IDs are consistent.
    """
    print("\n" + "=" * 60)
    print("  SECTION 2: HAS_ENTITY Relationships + Supabase Doc Cross-Check")
    print("=" * 60)

    cfg = {
        "neo4j_uri": os.environ.get("NEO4J_URI"),
        "neo4j_user": os.environ.get("NEO4J_USER"),
        "neo4j_password": os.environ.get("NEO4J_PASSWORD"),
        "neo4j_database": os.environ.get("NEO4J_DATABASE", ""),
        "neo4j_timeout_seconds": 5,
    }

    neo = Neo4jConnector(cfg)
    try:
        with neo.driver.session(**neo.db_args) as session:
            result = session.run("""
                MATCH (c:Claim)-[r:HAS_ENTITY]->(e:Entity)
                RETURN c.id AS claim_id, e.id AS entity_id, e.type AS entity_type
                LIMIT 5
            """)
            records = list(result)
    finally:
        neo.close()

    print(f"\n  Raw Neo4j records ({len(records)} rows):")
    for r in records[:2]:
        print(f"    {dict(r)}")

    claim_ids = list({r["claim_id"] for r in records})

    print(f"\n  Cross-checking {len(claim_ids)} claim(s) in Supabase claim_documents ...")
    if not claim_ids:
        print("  [WARN] No records returned from Neo4j — skipping Supabase check.")
        return

    try:
        db = get_supabase()
        result = (
            db.table("claim_documents")
            .select("sha256, file_name, claim_id")
            .in_("claim_id", claim_ids)
            .execute()
        )
        doc_map: dict[str, str] = {}
        for row in result.data or []:
            doc_map[str(row["sha256"])[:32]] = row["file_name"]

        if doc_map:
            print(f"  [PASS] Found {len(doc_map)} matching document(s):")
            for sha_prefix, fname in doc_map.items():
                print(f"    {sha_prefix}…  →  {fname}")
        else:
            print("  [WARN] No documents found for these claim IDs in Supabase.")
    except Exception as e:
        print(f"  [FAIL] Supabase error: {e}")


# ─── Runner ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_node_counts()
    test_relationship_and_docs()
    print()
