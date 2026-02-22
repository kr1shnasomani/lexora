"""Layer 3 — Tier 3: Graph / Ring Detection
Pass 2:
  - Uses Neo4j Cloud for upserting claim/entities and querying n-hop neighborhood.
  - Falls back to Pass 1 local computation (relational_graph) if disabled or errors/timeouts.

Returns:
    {
        "score": float,
        "cluster_summary": {...},
        "graph_excerpt": {
            "nodes": [...],
            "edges": [...],
        },
        "evidence": {...},
    }
"""
import time
from collections import defaultdict
from datetime import datetime, timedelta

from engines.layer3.canonical import (
    normalize_phone,
    normalize_name,
    normalize_invoice,
    is_valid_sha256,
)
from engines.layer3.neo4j_client import Neo4jConnector
from engines.layer3.diagnostics import DiagnosticsTracker


def run_tier3(
    db,
    claim: dict,
    documents: list[dict],
    cfg: dict,
    diag: DiagnosticsTracker
) -> dict:
    """Entry point for Tier 3."""
    tier3_start = int(time.time() * 1000)
    enable_neo4j = cfg.get("enable_neo4j", False)
    
    if enable_neo4j:
        try:
            return _run_tier3_cloud(db, claim, documents, cfg, diag, tier3_start)
        except Exception as e:
            diag.record_fallback("tier3", "fallback_relational", f"Cloud unexpected error: {str(e)}")
            # Fall through to local
    else:
        diag.record_service("neo4j", used=False, skipped_reason="disabled")
        diag.record_fallback("tier3", "fallback_relational", "disabled")
        
    return _run_tier3_local(db, claim, documents, cfg, diag)


def _run_tier3_cloud(
    db, claim: dict, documents: list[dict], cfg: dict, diag: DiagnosticsTracker, start_ms: int
) -> dict:
    """Pass 2 Cloud Implementation."""
    claim_id = claim.get("id", "")
    nc = Neo4jConnector(cfg)
    
    target_phone = normalize_phone(claim.get("claimant_phone") or "")
    target_provider = normalize_name(claim.get("provider_name") or "")
    target_invoice = normalize_invoice(claim.get("invoice_number") or "")
    target_name = normalize_name(claim.get("claimant_name") or "")
    target_sha256s = {doc["sha256"] for doc in documents if is_valid_sha256(doc.get("sha256"))}
    
    entities = []
    if target_phone: entities.append({"type": "phone", "value": target_phone})
    if target_provider: entities.append({"type": "provider", "value": target_provider})
    if target_invoice: entities.append({"type": "invoice", "value": target_invoice})
    if target_name: entities.append({"type": "name", "value": target_name})
    for h in target_sha256s: entities.append({"type": "doc", "value": h[:32]}) # 32-char doc hash for graph identity
    
    u_ok, u_err, u_lat = nc.upsert_claim_graph(claim_id, entities)
    if not u_ok:
        diag.record_service("neo4j", used=True, ok=False, error=u_err, latency_ms=u_lat)
        diag.record_fallback("tier3", "fallback_relational", f"upsert failed: {u_err}")
        nc.close()
        return _run_tier3_local(db, claim, documents, cfg, diag)
        
    # Check max external time
    max_ext_ms = cfg.get("external_max_seconds", 8) * 1000
    if (int(time.time() * 1000) - start_ms) > max_ext_ms:
        diag.record_service("neo4j", used=True, ok=True, latency_ms=u_lat)
        diag.record_fallback("tier3", "fallback_relational", "budget exceeded after upsert")
        nc.close()
        return _run_tier3_local(db, claim, documents, cfg, diag)
        
    max_hops = cfg.get("graph_hops", 2)
    res, q_err, q_lat = nc.find_claim_neighborhood(claim_id, max_hops)
    nc.close()
    
    if q_err:
        diag.record_service("neo4j", used=True, ok=False, error=q_err, latency_ms=u_lat+q_lat)
        diag.record_fallback("tier3", "fallback_relational", f"query failed: {q_err}")
        return _run_tier3_local(db, claim, documents, cfg, diag)
        
    diag.record_service("neo4j", used=True, ok=True, latency_ms=u_lat+q_lat)
    diag.set_primary_path("tier3", "neo4j")
    
    component_size = res.get("component_size", 1)
    alert_threshold = cfg.get("graph_component_alert_threshold", 6)
    score = 0.0
    
    if component_size >= alert_threshold:
        score = 1.0
    elif component_size >= 4:
        score = 0.8
    elif component_size >= 3:
        score = 0.5
    elif component_size >= 2:
        score = 0.2
        
    score = round(min(1.0, max(0.0, score)), 4)
    
    cluster_summary = {
        "size": component_size,
        "provider_hub": "unknown"
    }
    
    top_hubs = res.get("hub_entities", [])
    if top_hubs:
        for h in top_hubs:
            if h.startswith("provider:"):
                cluster_summary["provider_hub"] = h.split(":", 1)[1]
                break

    evidence = {
        "method": "neo4j",
        "component_size": component_size,
        "direct_connections": res.get("edges_count", 0),
        "query_latency_ms": q_lat,
        "upsert_latency_ms": u_lat,
        "hops_used": max_hops,
        "provider_hub": cluster_summary["provider_hub"]
    }
    
    graph_excerpt = {
        "nodes": [], 
        "edges": res.get("edges_excerpt", [])
    }
    
    return {
        "score": score,
        "cluster_summary": cluster_summary,
        "graph_excerpt": graph_excerpt,
        "evidence": evidence
    }


def _run_tier3_local(
    db, claim: dict, documents: list[dict], cfg: dict, diag: DiagnosticsTracker
) -> dict:
    """Fallback-only Tier 3: bipartite in-memory graph, O(n) build, multi-hop BFS."""
    diag.set_primary_path("tier3", "fallback_relational")
    
    lookback_days = cfg.get("graph_lookback_days", 365)
    alert_threshold = cfg.get("graph_component_alert_threshold", 6)

    score = 0.0
    cluster_summary: dict = {}
    evidence: dict = {
        "method": "fallback_relational",
        "lookback_days": lookback_days,
    }

    claim_id = claim.get("id", "")
    cutoff = (datetime.utcnow() - timedelta(days=lookback_days)).isoformat()

    target_phone = normalize_phone(claim.get("claimant_phone") or "")
    target_provider = normalize_name(claim.get("provider_name") or "")
    target_invoice = normalize_invoice(claim.get("invoice_number") or "")
    target_name = normalize_name(claim.get("claimant_name") or "")
    target_sha256s = {
        doc["sha256"] for doc in documents if is_valid_sha256(doc.get("sha256"))
    }

    try:
        result = (
            db.table("claims")
            .select(
                "id, claim_number, claimant_phone, claimant_name, provider_name, "
                "invoice_number, policy_id, submitted_at"
            )
            .neq("id", claim_id)
            .gte("submitted_at", cutoff)
            .execute()
        )
        candidates = result.data or []
    except Exception as exc:
        evidence["fetch_error"] = str(exc)
        candidates = []

    all_sha256_map: dict[str, set[str]] = defaultdict(set)
    for h in target_sha256s:
        all_sha256_map[claim_id].add(h)

    if candidates:
        try:
            cand_id_set = {c["id"] for c in candidates}
            docs_result = (
                db.table("claim_documents")
                .select("claim_id, sha256")
                .gte("created_at", cutoff)
                .execute()
            )
            for d in (docs_result.data or []):
                cid = d.get("claim_id")
                sha = d.get("sha256")
                if cid in cand_id_set and is_valid_sha256(sha):
                    all_sha256_map[cid].add(sha)
        except Exception as exc:
            evidence["doc_fetch_error"] = str(exc)

    all_claims_lookup: dict[str, dict] = {claim_id: claim}
    for c in candidates:
        all_claims_lookup[c["id"]] = c

    adj: dict[str, set[str]] = defaultdict(set)

    def _add_claim_entity_edge(cid: str, entity_id: str):
        adj[cid].add(entity_id)
        adj[entity_id].add(cid)

    def _index_claim(cid: str, c: dict):
        p = normalize_phone(c.get("claimant_phone") or "")
        if p:
            _add_claim_entity_edge(cid, f"phone:{p}")
        prov = normalize_name(c.get("provider_name") or "")
        if prov:
            _add_claim_entity_edge(cid, f"provider:{prov}")
        inv = normalize_invoice(c.get("invoice_number") or "")
        if inv:
            _add_claim_entity_edge(cid, f"invoice:{inv}")
        nm = normalize_name(c.get("claimant_name") or "")
        if nm:
            _add_claim_entity_edge(cid, f"name:{nm}")
        for h in all_sha256_map.get(cid, set()):
            _add_claim_entity_edge(cid, f"doc:{h}")

    _index_claim(claim_id, claim)
    for other in candidates:
        _index_claim(other["id"], other)

    component: set[str] = set()
    frontier = {claim_id}
    while frontier:
        node = frontier.pop()
        if node in component:
            continue
        component.add(node)
        for neighbor in adj.get(node, set()):
            if neighbor not in component:
                frontier.add(neighbor)

    claim_ids_in_comp = [n for n in component if not (":" in n and n.split(":")[0] in ("phone", "provider", "name", "invoice", "doc"))]
    entity_ids_in_comp = [n for n in component if (":" in n and n.split(":")[0] in ("phone", "provider", "name", "invoice", "doc"))]

    cluster_size = len(claim_ids_in_comp)
    hub_provider = "unknown"
    max_degree = 0

    for ent in entity_ids_in_comp:
        if ent.startswith("provider:"):
            deg = len(adj[ent])
            if deg > max_degree:
                max_degree = deg
                hub_provider = ent.split(":", 1)[1]

    if cluster_size >= alert_threshold:
        score = 1.0
    elif cluster_size >= 4:
        score = 0.8
    elif cluster_size >= 3:
        score = 0.5
    elif cluster_size >= 2:
        score = 0.2

    direct_connections = []
    for cid in claim_ids_in_comp:
        if cid == claim_id:
            continue
        shared = adj[claim_id] & adj[cid]
        if shared:
            shared_keys = list({s.split(":")[0] for s in shared})
            direct_connections.append(
                {
                    "other_claim_id": cid,
                    "shared_keys": shared_keys,
                    "via_entities": list(shared),
                }
            )

    cluster_summary = {
        "size": cluster_size,
        "provider_hub": hub_provider,
    }
    evidence["component_size"] = cluster_size
    evidence["direct_connections"] = len(direct_connections)
    evidence["connection_details"] = direct_connections

    nodes = []
    for c_id in claim_ids_in_comp:
        nodes.append({"id": c_id, "type": "Claim"})
    for e_id in entity_ids_in_comp:
        nodes.append({"id": e_id, "type": "Entity"})

    edges_out = []
    edges_added = 0
    for node, neighbors in adj.items():
        if node in component:
            for nb in neighbors:
                if node < nb:
                    edges_out.append({"source": node, "target": nb})
                    edges_added += 1
                if edges_added > 100:
                    break
        if edges_added > 100:
            break

    score = round(min(1.0, max(0.0, score)), 4)
    evidence["provider_hub"] = hub_provider

    return {
        "score": score,
        "cluster_summary": cluster_summary,
        "graph_excerpt": {"nodes": nodes, "edges": edges_out},
        "evidence": evidence,
    }
