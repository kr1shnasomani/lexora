"""Layer 3 — Tier 2: Similarity & Reuse Detection

Pass 2:
  - Text embeddings via Cohere + Qdrant search.
  - Image/PDF embeddings via Jina + Qdrant (optional, up to 1 per claim).
  - Falls back to Pass 1 local computation if disabled, times out, or errors.

Returns:
    {
        "score": float,
        "top_matches": [...],
        "doc_reuse": [...],
        "evidence": {...},
    }
"""
import time
from datetime import datetime, timedelta
from typing import Any, Dict

from engines.layer3.canonical import (
    build_canonical_text,
    is_valid_sha256,
    normalize_invoice,
)
from engines.layer3.diagnostics import DiagnosticsTracker
from engines.layer3.embeddings import get_media_embedding, get_text_embedding
from engines.layer3.qdrant_client import QdrantConnector


def run_tier2(
    db,
    claim: dict,
    line_items: list[dict],
    documents: list[dict],
    cfg: dict,
    diag: DiagnosticsTracker
) -> dict:
    """Entry point for Tier 2."""
    
    tier2_start = int(time.time() * 1000)
    enable_qdrant = cfg.get("enable_qdrant", False)
    
    if enable_qdrant:
        try:
            return _run_tier2_cloud(db, claim, line_items, documents, cfg, diag)
        except Exception as e:
            diag.record_fallback("tier2", "fallback_local", f"Cloud unexpected error: {e!s}")
            # Fall through to local
    else:
        diag.record_service("cohere", used=False, skipped_reason="disabled")
        diag.record_service("qdrant", used=False, skipped_reason="disabled")
        diag.record_service("jina", used=False, skipped_reason="disabled")
        diag.record_fallback("tier2", "fallback_local", "disabled")
        
    return _run_tier2_local(db, claim, line_items, documents, cfg, diag)


def _run_tier2_cloud(
    db, claim: dict, line_items: list[dict], documents: list[dict], cfg: dict, diag: DiagnosticsTracker
) -> dict:
    """Pass 2 Cloud Implementation."""
    claim_id = claim.get("id", "")
    qc = QdrantConnector(cfg)
    
    # Check max external time
    ext_time_start = int(time.time() * 1000)
    max_ext_ms = cfg.get("external_max_seconds", 8) * 1000
    
    text_col = cfg.get("qdrant_collection_text", "claims_v1_text")
    media_col = cfg.get("qdrant_collection_media", "claims_v1_media")
    top_k = cfg.get("qdrant_top_k", 5)
    
    diag.set_primary_path("tier2", "qdrant")
    
    # ── JINA MEDIA EMBEDDING (Optional) ─────────────────────────
    jina_enabled = cfg.get("enable_jina_media", False)
    media_sha_embedded = None
    media_vector = None
    if jina_enabled:
        # find 1 valid doc
        valid_media = []
        max_size = cfg.get("media_max_mb", 8) * 1024 * 1024
        for d in documents:
            sz = int(d.get("size_bytes", 0))
            ctype = d.get("content_type", "")
            sha = d.get("sha256", "")
            if sz <= max_size and (ctype.startswith("image/") or ctype == "application/pdf") and is_valid_sha256(sha):
                valid_media.append(d)
                
        if valid_media:
            target_doc = valid_media[0]
            sha256 = target_doc.get("sha256")
            
            # Idempotency check 
            exists, err, lat = qc.point_exists(media_col, sha256)
            if exists:
                diag.record_service("jina", used=False, skipped_reason="already embedded")
                media_sha_embedded = sha256
            else:
                try:
                    res = db.storage.from_("claim_documents").download(target_doc["storage_key"])
                    vec, j_err, j_lat = get_media_embedding(res, target_doc["content_type"], cfg)
                    diag.record_service("jina", used=True, ok=not j_err, latency_ms=j_lat, error=j_err)
                    
                    if vec:
                        qc.upsert_point(media_col, sha256, vec, {"claim_id": claim_id, "file_name": target_doc["file_name"]})
                        media_sha_embedded = sha256
                        media_vector = vec
                except Exception as e:
                    diag.record_service("jina", used=True, ok=False, error=str(e))
        else:
            diag.record_service("jina", used=False, skipped_reason="no valid media")
    else:
        diag.record_service("jina", used=False, skipped_reason="disabled")
        
    # Check time budget
    if (int(time.time() * 1000) - ext_time_start) > max_ext_ms:
        diag.record_fallback("tier2", "fallback_local", "budget exceeded after media")
        return _run_tier2_local(db, claim, line_items, documents, cfg, diag)

    # ── COHERE TEXT EMBEDDING + QDRANT SEARCH ───────────────────
    canonical_text = build_canonical_text(claim, line_items)
    exists, err, lat = qc.point_exists(text_col, claim_id)
    
    text_vector = None
    if exists:
        diag.record_service("cohere", used=False, skipped_reason="already embedded")
        vec, payload, r_err, r_lat = qc.retrieve_point(text_col, claim_id)
        if vec:
            text_vector = vec
        else:
            diag.record_fallback("tier2", "fallback_local", "failed to retrieve existing text embedding")
            return _run_tier2_local(db, claim, line_items, documents, cfg, diag)
    else:
        vec, c_err, c_lat = get_text_embedding(canonical_text, cfg)
        diag.record_service("cohere", used=True, ok=not c_err, latency_ms=c_lat, error=c_err)
        
        if c_err or not vec:
            diag.record_fallback("tier2", "fallback_local", f"cohere failed: {c_err}")
            return _run_tier2_local(db, claim, line_items, documents, cfg, diag)
            
        text_vector = vec
        payload = {"claim_id": claim_id, "provider_name": claim.get("provider_name"), "invoice_number": claim.get("invoice_number")}
        u_ok, u_err, u_lat = qc.upsert_point(text_col, claim_id, text_vector, payload)
        
    # Check budget
    if (int(time.time() * 1000) - ext_time_start) > max_ext_ms:
        diag.record_fallback("tier2", "fallback_local", "budget exceeded after text embed")
        return _run_tier2_local(db, claim, line_items, documents, cfg, diag)

    # Search similar claims
    results, s_err, s_lat = qc.search_points(text_col, text_vector, top_k + 1)
    diag.record_service("qdrant", used=True, ok=not s_err, latency_ms=s_lat, error=s_err)
    
    if s_err:
        diag.record_fallback("tier2", "fallback_local", f"qdrant search failed: {s_err}")
        return _run_tier2_local(db, claim, line_items, documents, cfg, diag)
        
    # Process results
    candidate_matches = []
    for hit in results:
        hit_cid = hit.get("id")
        if hit_cid == claim_id:
            continue
            
        sim = hit.get("score", 0.0)
        reasons = []
        if sim > 0.8:
            reasons.append("high_text_similarity")
            
        payload = hit.get("payload", {})
        if str(payload.get("invoice_number")).strip() == str(claim.get("invoice_number")).strip() and payload.get("invoice_number"):
            reasons.append("invoice_match")

        candidate_matches.append({
            "claim_id": hit_cid,
            "similarity": round(sim, 4),
            "reasons": reasons
        })
        
    candidate_matches.sort(key=lambda x: x["similarity"], reverse=True)
    top_matches = candidate_matches[:top_k]

    # Calculate score
    score = 0.0
    sim_threshold = cfg.get("similarity_score_threshold", 0.80)
    if top_matches:
        best_sim = top_matches[0]["similarity"]
        if best_sim >= sim_threshold:
            score += 0.40
        elif best_sim >= 0.50:
            score += 0.20
        elif best_sim >= 0.30:
            score += 0.10
            
    # Mix in document reuse (fast local relational check for the valid hashes)
    doc_reuse = _check_doc_reuse(db, claim_id, documents, cfg, diag)
    if doc_reuse:
        score += min(0.5, 0.25 * len(doc_reuse))

    score = round(min(1.0, max(0.0, score)), 4)
    
    evidence = {
        "method": "qdrant",
        "candidates_evaluated": len(candidate_matches),
        "top_match_similarity": top_matches[0]["similarity"] if top_matches else 0.0,
        "query_latency_ms": s_lat
    }

    return {
        "score": score,
        "top_matches": top_matches,
        "doc_reuse": doc_reuse,
        "evidence": evidence,
    }

def _check_doc_reuse(db, claim_id: str, documents: list[dict], cfg: dict, diag: DiagnosticsTracker) -> list[dict]:
    """Helper to do relational doc reuse check, used by both implementations."""
    valid_hashes = [doc["sha256"] for doc in documents if is_valid_sha256(doc.get("sha256"))]
    doc_reuse = []
    
    if valid_hashes:
        try:
            lookback_days = cfg.get("similarity_lookback_days", 365)
            cutoff = (datetime.utcnow() - timedelta(days=lookback_days)).isoformat()
            
            other_docs_result = (
                db.table("claim_documents")
                .select("sha256, claim_id")
                .neq("claim_id", claim_id)
                .gte("created_at", cutoff)
                .execute()
            )
            other_docs = other_docs_result.data or []
            other_hash_map: dict[str, list[str]] = {}
            for od in other_docs:
                h = od.get("sha256")
                cid = od.get("claim_id")
                if h and cid:
                    other_hash_map.setdefault(h, []).append(cid)

            for h in valid_hashes:
                if h in other_hash_map:
                    doc_reuse.append(
                        {
                            "sha256": h,
                            "other_claim_ids": list(set(other_hash_map[h])),
                        }
                    )
        except Exception:
            pass
            
    return doc_reuse


def _run_tier2_local(
    db, claim: dict, line_items: list[dict], documents: list[dict], cfg: dict, diag: DiagnosticsTracker
) -> dict:
    """Fallback-only Tier 2: deterministic similarity checks."""
    diag.set_primary_path("tier2", "fallback_local")
    
    lookback_days = cfg.get("similarity_lookback_days", 365)
    top_k = cfg.get("similarity_top_k", 5)
    sim_threshold = cfg.get("similarity_score_threshold", 0.80)

    score = 0.0
    evidence: dict = {
        "method": "fallback_local",
        "lookback_days": lookback_days,
        "similarity_threshold": sim_threshold,
    }

    claim_id = claim.get("id", "")
    cutoff = (datetime.utcnow() - timedelta(days=lookback_days)).isoformat()

    doc_reuse = _check_doc_reuse(db, claim_id, documents, cfg, diag)
    if doc_reuse:
        evidence["doc_reuse_count"] = len(doc_reuse)
        score += min(0.5, 0.25 * len(doc_reuse))

    canonical_text = build_canonical_text(claim, line_items)
    invoice = normalize_invoice(claim.get("invoice_number") or "")
    claimed_amount = float(claim.get("claimed_amount") or 0)

    # Fetch candidate claims within lookback window
    candidate_matches: list[dict] = []
    try:
        candidates_result = (
            db.table("claims")
            .select(
                "id, incident_description, incident_type, provider_name, "
                "invoice_number, claimed_amount, submitted_at"
            )
            .neq("id", claim_id)
            .gte("submitted_at", cutoff)
            .execute()
        )
        candidates = candidates_result.data or []

        for other in candidates:
            reasons: list[str] = []

            # Invoice collision
            other_invoice = normalize_invoice(other.get("invoice_number") or "")
            if invoice and other_invoice and invoice == other_invoice:
                reasons.append("invoice_match")

            # Canonical text similarity (Jaccard on words)
            other_line_items: list[dict] = []  # skip line items for candidates to save DB calls
            other_text = build_canonical_text(other, other_line_items)
            sim = _jaccard_similarity(canonical_text, other_text)

            # Amount similarity
            other_amount = float(other.get("claimed_amount") or 0)
            amount_close = False
            if claimed_amount > 0 and other_amount > 0:
                ratio = min(claimed_amount, other_amount) / max(claimed_amount, other_amount)
                if ratio > 0.90:
                    amount_close = True

            combined_score = sim
            if amount_close:
                combined_score = min(1.0, combined_score + 0.15)
            if "invoice_match" in reasons:
                combined_score = min(1.0, combined_score + 0.30)

            if sim > 0.30 or reasons:
                candidate_matches.append(
                    {
                        "claim_id": other["id"],
                        "similarity": round(combined_score, 4),
                        "text_sim": round(sim, 4),
                        "reasons": reasons + (["high_text_similarity"] if sim > 0.60 else []),
                    }
                )
    except Exception as exc:
        evidence["similarity_error"] = str(exc)

    # Sort by similarity and take top_k
    candidate_matches.sort(key=lambda x: x["similarity"], reverse=True)
    top_matches = candidate_matches[:top_k]

    if top_matches:
        best_sim = top_matches[0]["similarity"]
        if best_sim >= sim_threshold:
            score += 0.40
        elif best_sim >= 0.50:
            score += 0.20
        elif best_sim >= 0.30:
            score += 0.10

    evidence["candidates_evaluated"] = len(candidate_matches)
    evidence["top_match_similarity"] = top_matches[0]["similarity"] if top_matches else 0.0

    score = round(min(1.0, max(0.0, score)), 4)

    return {
        "score": score,
        "top_matches": top_matches,
        "doc_reuse": doc_reuse,
        "evidence": evidence,
    }


def _jaccard_similarity(text1: str, text2: str) -> float:
    w1 = set(text1.lower().split())
    w2 = set(text2.lower().split())
    if not w1 or not w2:
        return 0.0
    return len(w1 & w2) / len(w1 | w2)
