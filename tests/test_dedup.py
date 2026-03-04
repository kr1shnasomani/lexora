"""Lexora — Deduplication Hash Tests

Validates that the Supabase `claim_documents` table can be queried
by sha256 hash using both:
  1. ilike prefix matching  (used for partial lookups)
  2. exact eq matching       (used for dedup enforcement)
  3. OR filter syntax        (used for batch multi-hash lookups)

Usage (backend venv active):
    python tests/test_dedup.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from dotenv import load_dotenv  # type: ignore[import]
load_dotenv(_backend_dir.parent / ".env")

from database import get_supabase  # type: ignore[import]  # noqa: E402

# SHA-256 hashes from seed data — update these if the DB is re-seeded
TEST_HASHES = [
    "b55e08095469e90d6bddb70ffee9e408e3b4d4dbab8b0f82e92e741b1bb9fc56",
    "51cf19255caf4486df0bb771c2edfbb1a3dce71d09f22e77cc52f8c6c8e58a3",
]


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  SECTION 1 — ilike Prefix + Exact eq Lookups                       ║
# ╚══════════════════════════════════════════════════════════════════════╝

def test_hash_lookups():
    print("\n" + "=" * 60)
    print("  SECTION 1: ilike prefix + exact eq hash lookups")
    print("=" * 60)

    db = get_supabase()

    print("\n  ilike prefix matches:")
    for h in TEST_HASHES:
        try:
            res = (
                db.table("claim_documents")
                .select("claim_id, sha256, file_name")
                .ilike("sha256", f"{h}%")
                .execute()
            )
            print(f"  {h[:16]}…:  {res.data}")
        except Exception as e:
            print(f"  [FAIL] ilike error: {e}")

    print("\n  exact eq matches:")
    for h in TEST_HASHES:
        try:
            res = (
                db.table("claim_documents")
                .select("claim_id, sha256, file_name")
                .eq("sha256", h)
                .execute()
            )
            print(f"  {h[:16]}…:  {res.data}")
        except Exception as e:
            print(f"  [FAIL] eq error: {e}")


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  SECTION 2 — Supabase .or_() Batch Filter Syntax                   ║
# ╚══════════════════════════════════════════════════════════════════════╝

def test_or_filter_syntax():
    """
    Verify that Supabase .or_() accepts the comma-separated ilike filter
    string used in the dedup engine to look up multiple hashes at once.
    """
    print("\n" + "=" * 60)
    print("  SECTION 2: Supabase .or_() batch hash filter")
    print("=" * 60)

    db = get_supabase()

    or_filter = ",".join([f"sha256.ilike.{h}%" for h in TEST_HASHES])
    print(f"\n  Filter string: {or_filter[:80]}...")

    try:
        result = (
            db.table("claim_documents")
            .select("sha256, file_name, claim_id")
            .or_(or_filter)
            .execute()
        )
        print(f"  Result rows: {len(result.data or [])}")
        for row in (result.data or []):
            print(f"    {row}")
        print("  [PASS] .or_() filter executed without error.")
    except Exception as e:
        print(f"  [FAIL] .or_() error: {e}")


# ─── Runner ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_hash_lookups()
    test_or_filter_syntax()
    print()
