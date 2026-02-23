
# Layer 3 (Fraud Engine) — Final Implementation Spec (Hackathon-Grade, Production-Like)

**Goal:** Implement Layer 3 as an explainable fraud scoring engine with:
- **Tier 1:** deterministic sentinel rules (high precision)
- **Tier 2:** similarity + reuse detection (Cohere text embeddings + Qdrant primary; deterministic fallback; Jina non-text optional behind strict limits)
- **Tier 3:** graph/ring detection (Neo4j primary; relational/in-memory fallback)
- **Fusion:** composite risk score, risk bands, recommended actions, top reasons
- **Diagnostics:** explicit visibility into which services were used vs fallback, with latencies

This spec is designed to be **hackathon-stable**, **fast**, **safe on free tiers**, and **frontend-ready**.

---

## 0) Non-Negotiables & Existing Integrations

### Public entrypoint and route compatibility (must preserve)
- **Function:** `run_fraud_check(claim_id: str) -> dict`
- **Input:** only `claim_id`. Inside the function, fetch the claim and related data from DB.
- **Called by:** `backend/routes/claims.py` via:
  - `POST /claims/{claim_id}/run-fraud`
  - `POST /claims/{claim_id}/run-all`

### DB writes policy (must preserve)
- `run_fraud_check` **MUST NOT** update the `claims` table directly.
- It returns `{ fraud_score, fraud_analysis }`.
- The calling route updates:
  - `claims.fraud_score`
  - `claims.fraud_analysis` (stored as JSON string)
  - `claims.status` (as per existing behavior)

### DB access pattern (must preserve)
- Use the Supabase Python client via `get_supabase()` imported from `database`.
- Use existing configuration reads from `configuration` table.

### Auditing (must preserve, must enrich payload)
- Wrap the full run inside `AuditTimer` from `services.audit` with stage `"fraud_engine"`.
  - Emits `audit_events`:
    - `"started"` at begin
    - `"completed"` on success (include scores + diagnostics)
    - `"failed"` on exception (include error payload)

### Frontend contract (must preserve)
Frontend `ClaimDetail.jsx` / `FraudTab` expects:
- `analysis.tier1.score`, `analysis.tier2.score`, `analysis.tier3.score` (mandatory)
- It iterates over additional keys in each tier object (flexible as long as `score` exists).

### Performance constraints
- Endpoints are synchronous; target typical completion under ~10 seconds.
- Optional services (Cohere/Qdrant/Neo4j/Jina) must have strict timeouts and **fail-open** fallback behavior.

---

## 1) Folder Structure Requirement (Modular, Not Monolithic)

Layer 3 MUST NOT be implemented as a single large file. Create:

```

engines/layer3/:

**init**.py
main.py            # run_fraud_check entrypoint + orchestration
tier1.py           # deterministic rules
tier2.py           # similarity + embeddings + qdrant + fallback
tier3.py           # graph intelligence + neo4j + fallback
fusion.py          # composite scoring + bands + reasons
canonical.py       # normalizers + canonical claim text builder
config.py          # config table + env loaders with defaults
diagnostics.py     # service tracking + fallbacks + latency
storage.py         # Supabase storage download helper
embeddings.py      # Cohere text + Jina non-text wrappers + budgets
qdrant_client.py   # qdrant init + ensure collection + upsert + search
neo4j_client.py    # neo4j init + upsert graph + query graph

````

Compatibility:
- If `engines/fraud_engine.py` exists and is currently imported by routes, convert it into a **thin wrapper** that calls `engines.layer3.main.run_fraud_check`.
- Do not break existing imports used by routes.

---

## 2) External Services & Providers (Final)

### Provider split (final decision)
- **Cohere:** text embeddings (Tier 2 primary)
- **Jina:** non-text embeddings (PDF/images/videos) optional, behind strict toggles and budgets
- **Qdrant:** vector DB for Tier 2 retrieval
- **Neo4j:** graph DB for Tier 3 ring detection

### Supabase Storage
- Documents bucket name: **`claim_documents`**
- Object key column: `claim_documents.storage_key`

---

## 3) Environment Variables (Exact Names)

### Cohere (text)
- `COHERE_API_KEY`
- `COHERE_EMBED_MODEL`  (e.g., `embed-english-v3.0`)

Optional (default OFF):
- `COHERE_RERANK_MODEL`

### Jina (non-text)
- `JINA_API_KEY`
- `JINA_EMBED_MODEL`

### Qdrant
- `QDRANT_URL`
- `QDRANT_API_KEY` (optional)
- `QDRANT_COLLECTION_CLAIMS` (e.g., `claims_v1`)
- `QDRANT_TIMEOUT_SECONDS` (default `5`)

### Neo4j
- `NEO4J_URI`
- `NEO4J_USER`
- `NEO4J_PASSWORD`
- `NEO4J_DATABASE` (optional, default `neo4j`)
- `NEO4J_TIMEOUT_SECONDS` (default `5`)

### Layer 3 safety toggles / budgets (required)
- `FRAUD_LAYER3_ENABLE_QDRANT` (`true/false`)
- `FRAUD_LAYER3_ENABLE_NEO4J` (`true/false`)
- `FRAUD_LAYER3_ENABLE_JINA_MEDIA` (`true/false`)   (default false)
- `FRAUD_LAYER3_ENABLE_RERANK` (`true/false`)       (default false)
- `FRAUD_LAYER3_JINA_MAX_FILES_PER_CLAIM` (default `1`)
- `FRAUD_LAYER3_MEDIA_MAX_MB` (default `8`)
- `FRAUD_LAYER3_EXTERNAL_MAX_SECONDS` (default `8`)
- `FRAUD_LAYER3_GRAPH_LOOKBACK_DAYS` (default `365`)
- `FRAUD_LAYER3_QDRANT_TOP_K` (default `5`)

---

## 4) Configuration Table Keys (Add as Rows; No Schema Change)

Layer 3 must read these `configuration` keys (use defaults if missing):

### Weights and thresholds
- `fraud.tier_weights` = JSON string, e.g. `[0.3, 0.3, 0.4]`
- `fraud.high_threshold` = `0.70`
- `fraud.medium_threshold` = `0.30`

### Tier 1 windows
- `fraud.velocity_window_days` = `7`
- `fraud.velocity_max_claims` = `5`
- `fraud.provider_velocity_window_days` = `7`
- `fraud.provider_velocity_max_claims` = `20`

### Amount anomaly
- `fraud.amount_sigma_threshold` = `3.0`

### Similarity
- `fraud.similarity_lookback_days` = `365`
- `fraud.similarity_top_k` = `5`
- `fraud.similarity_score_threshold` = `0.80`

### Graph
- `fraud.graph_lookback_days` = `365`
- `fraud.graph_hops` = `2`
- `fraud.graph_component_alert_threshold` = `6`

---

## 5) Output Contract (Layer 3 → Layer 4 + Frontend)

### Return value (must preserve existing shape)
`run_fraud_check` returns:

```python
{
  "fraud_score": float,   # 0.0–1.0 composite
  "fraud_analysis": {
    "tier1": {..., "score": float},
    "tier2": {..., "score": float},
    "tier3": {..., "score": float},
    "weights": [float, float, float],
    "composite_score": float,

    # Added but safe:
    "risk_band": "low"|"medium"|"high",
    "recommended_action": "none"|"manual_review"|"fraud_investigation",
    "top_reasons": [
      { "reason": str, "tier": "tier1|tier2|tier3", "weight": float, "contribution": float }
    ],
    "diagnostics": {...}
  }
}
````

### Layer 4 usage expectation

Layer 4 should route using:

* `claims.fraud_score`
* `claims.fraud_analysis.risk_band`
* `claims.fraud_analysis.recommended_action`
* `claims.fraud_analysis.top_reasons`

---

## 6) Diagnostics & Fallback Visibility (Mandatory)

### Why

During tests, developers must know whether Qdrant/Neo4j/Cohere/Jina were used or fallback occurred.

### Two-layer visibility (mandatory)

1. **AuditTimer `"completed"` payload** includes per-service usage + fallback + latency.
2. `fraud_analysis.diagnostics` includes the same information.

Diagnostics format:

```json
"diagnostics": {
  "primary_path": {"tier2": "qdrant", "tier3": "neo4j"},
  "services": {
    "cohere": {"used": true, "ok": true, "fallback_used": false, "latency_ms": 210},
    "qdrant": {"used": true, "ok": true, "fallback_used": false, "latency_ms": 84},
    "neo4j":  {"used": true, "ok": false, "fallback_used": true, "error": "AuthError", "latency_ms": 530},
    "jina":   {"used": false, "ok": null, "skipped_reason": "disabled"}
  },
  "fallbacks": [
    {"component": "neo4j", "fallback": "relational_graph", "reason": "connection_failed"}
  ],
  "timing_ms": {"tier1": 22, "tier2": 410, "tier3": 760, "total": 1240}
}
```

### Failure policy (hackathon-safe)

Layer 3 must **NOT** throw if optional services fail. It must degrade gracefully and still return scores.
Only throw on:

* claim not found
* core DB read failures preventing tier execution

---

## 7) Tier 1 — Deterministic Rule Sentinels (High Precision)

Tier 1 produces:

* `flags` (booleans)
* `evidence` (supporting details)
* `score` (0–1)

### Rules (skip if missing data; do not penalize missing fields)

1. Duplicate invoice (if `invoice_number` present)
2. Claimant velocity

   * prefer phone
   * fallback to name + policy_id
3. Provider velocity (if provider present)
4. Amount anomaly (if claimed_amount present)

   * compute baseline mean/std from historical claims
   * segment by policy_type if available
5. Late reporting (incident_date vs submitted_at)
6. Coverage consistency flag (incident_date vs policy_end_date) flag-only

Tier 1 score composition:

* severity-scaled weighted sum
* missing fields → skip signal, do not affect score

---

## 8) Tier 2 — Similarity + Reuse (Cohere + Qdrant Primary; Jina Non-Text Optional)

Tier 2 produces:

* `score`
* `top_matches[]` (claim_id, similarity, reasons)
* `doc_reuse[]` (sha256 collisions)
* `evidence` block with thresholds used

### Canonical claim text builder (mandatory)

Build deterministic short text from:

* incident_description
* incident_type
* provider_name
* invoice_number
* claimed_amount
* policy_type (optional)
* top 5 line items (description + amount)

### Primary path (Tier 2)

1. Embed canonical claim text with **Cohere**
2. Ensure Qdrant collection exists and is compatible (vector size/distance)
3. Upsert point with payload:

   * claim_id, submitted_at, provider_name, incident_type, policy_id
4. Search topK (default 5), apply lookback filter, ignore self
5. Produce matches and score from best similarity + supportive reuse signals

### Document reuse (always)

* Detect exact reuse by `claim_documents.sha256`
* Validate sha256 strictly:

  * 64 hex chars and not uniform placeholders like `0000...` or `aaaa...`
* Output other_claim_ids and counts

### Jina non-text embeddings (OPTIONAL, gated)

Default OFF.
If enabled:

* download file from Supabase storage (bucket `claim_documents`, key `storage_key`)
* embed at most `FRAUD_LAYER3_JINA_MAX_FILES_PER_CLAIM` files (default 1)
* skip if size > `FRAUD_LAYER3_MEDIA_MAX_MB`
* skip videos by default; if later enabled, embed only 1 frame/sample
* store non-text embeddings in a separate Qdrant namespace or payload-tagged points (do not mix unless vector sizes match)

### Tier 2 fallback path

If Cohere or Qdrant fails/unavailable:

* deterministic similarity:

  * doc reuse
  * invoice collision
  * provider + repeated line-item overlap
  * simple local string similarity (no external calls)
* still produce `top_matches` (from heuristics) with reasons
* still produce a meaningful score

---

## 9) Tier 3 — Graph / Ring Detection (Neo4j Primary; Relational Fallback)

Tier 3 produces:

* `score` (ring_score)
* `cluster_summary`
* `graph_excerpt` (nodes/edges for UI)
* `evidence` and thresholds

### Graph schema (stable canonical IDs)

Nodes:

* Claim {id}
* Provider {name_slug}
* Phone {digits_only}
* Invoice {normalized}
* Doc {sha256_valid_only}
* ClaimantName {name_slug} (optional, low weight)

Edges:

* (Claim)-[:HAS_PROVIDER]->(Provider)
* (Claim)-[:HAS_PHONE]->(Phone)
* (Claim)-[:HAS_INVOICE]->(Invoice)
* (Claim)-[:HAS_DOC]->(Doc)
* (Claim)-[:HAS_CLAIMANT_NAME]->(ClaimantName)

### Neo4j primary path

1. Upsert nodes/edges for claim
2. Query hop-limited neighborhood (hops = config/env)
3. Compute ring signals:

   * connected component size around claim
   * provider hub degree (distinct phones/names)
   * shared invoice/doc across multiple claims
   * velocity within component (claims/time)
4. Build:

   * `cluster_summary` with reasons
   * `graph_excerpt` small neighborhood for frontend

### Fallback path

If Neo4j fails/unavailable:

* fetch recent claims/docs/line items within lookback
* build in-memory graph with same semantics
* compute component size and hub signals
* return same output fields

### Threat feed support

If component signals exceed `fraud.graph_component_alert_threshold`:

* include a graph alert summary in diagnostics and audit payload:

  * cluster_id (stable hash)
  * severity
  * key shared identifiers

---

## 10) Fusion — Composite Score, Bands, Recommended Action, Reasons

### Composite score

* weights from `fraud.tier_weights`
* composite = w1*t1 + w2*t2 + w3*t3

### Risk band

* `high` if composite >= `fraud.high_threshold`
* `medium` if composite >= `fraud.medium_threshold`
* else `low`

### Recommended action

* high → `fraud_investigation`
* medium → `manual_review`
* low → `none`

### Top reasons

Return a ranked list:

* top Tier 1 flags (velocity/anomaly/etc.)
* best Tier 2 match and/or doc reuse
* Tier 3 ring reasons

---

## 11) Execution Flow (Orchestration Contract)

`run_fraud_check(claim_id)` must follow:

1. Start `AuditTimer(stage="fraud_engine")`
2. Initialize diagnostics tracker
3. Fetch:

   * claim by id
   * policy by policy_id (if exists)
   * line items by claim_id
   * documents by claim_id
4. Run Tier 1 → store output + timing
5. Run Tier 2 → store output + timing (primary or fallback)
6. Run Tier 3 → store output + timing (primary or fallback)
7. Run fusion → compute composite + band + action + reasons
8. Build `fraud_analysis` object including diagnostics
9. Emit AuditTimer `"completed"` payload containing:

   * composite and tier scores
   * diagnostics services + fallbacks + latencies
   * graph alert summary if any
10. Return `{ fraud_score, fraud_analysis }`

---

## 12) Free-Tier Safety (Mandatory)

### Global constraints

* Max total external time: `FRAUD_LAYER3_EXTERNAL_MAX_SECONDS`
* Strict per-service timeouts:

  * Qdrant: `QDRANT_TIMEOUT_SECONDS`
  * Neo4j: `NEO4J_TIMEOUT_SECONDS`
  * Cohere/Jina: short HTTP timeouts (5–8s)

### Call minimization

* Never re-embed claim text if already present in Qdrant for that claim_id
* Never re-embed same doc sha256 if media embeddings enabled and already stored
* Default `topK=5`, rerank OFF
* Default Jina media OFF; max 1 file per claim if enabled; size cap 8MB; no video by default

---

## 13) Pages.md Alignment (Backend Data Readiness)

Layer 3 outputs support:

* **Claim Detail FraudTab:** tier scores + evidence + diagnostics
* **Claims Queue:** risk_band, recommended_action, top_reasons
* **Threat Feed:** derive from audit completed payloads + graph alert summaries
* **Network Graph:** tier3.graph_excerpt per claim; later allow neighborhood expansion endpoint
* **Analytics:** aggregations on fraud_score + provider_name + exposure proxy (claim_amount * fraud_score)

---

## 14) Two-Pass Implementation Plan (To Avoid Agent Integration Failure)

To ensure high success, implement in two deliverable passes in the same build run:

### Pass 1 — Fully working MVP without external services

* Folder refactor under `engines/layer3/`
* `run_fraud_check` orchestration + AuditTimer + diagnostics + timings
* Tier 1 fully implemented
* Tier 2 fallback (sha256 reuse, invoice collision, line-item overlap, simple similarity)
* Tier 3 fallback (relational/in-memory graph)
* Fusion, risk bands, recommended action, top reasons
* Wrapper `engines/fraud_engine.py` delegates to `engines/layer3/main.py` if needed

### Pass 2 — Add external services (behind toggles; preserve fallback)

* Cohere text embeddings integration
* Qdrant upsert/search integration
* Neo4j upsert/query integration
* Jina non-text embedding integration behind strict toggles/budgets
* Ensure diagnostics clearly indicates which path was used

---

## 15) Definition of Done (Acceptance Checklist)

### Core behavior

* `POST /claims/{id}/run-fraud` returns 200 with:

  * `fraud_score` float
  * `fraud_analysis.tier1.score`, `tier2.score`, `tier3.score`
  * `fraud_analysis.diagnostics` present

### Fallback transparency

* If Qdrant disabled or misconfigured:

  * Tier 2 uses fallback
  * diagnostics shows `qdrant.ok=false` or `used=false` and records fallback
* If Neo4j disabled or misconfigured:

  * Tier 3 uses fallback
  * diagnostics shows fallback and reason
* If Cohere missing key:

  * Tier 2 uses fallback
  * diagnostics indicates cohere failure

### External usage validation (when enabled)

* If Qdrant enabled:

  * claim embedding is upserted
  * search returns topK candidates
  * diagnostics shows `qdrant.used=true, ok=true`
* If Neo4j enabled:

  * nodes/edges created for claim
  * ring query executes
  * diagnostics shows `neo4j.used=true, ok=true`
* If Jina media enabled:

  * at most 1 file is downloaded/embedded within size cap
  * diagnostics shows skipped_reason if not embedded

### Stability

* External service failures do not crash run-fraud; they cause fallback.
* Only missing claim or core DB read failure should raise an exception.

---

## 16) What Antigravity/Claude Must Do

* Refactor Layer 3 into `engines/layer3/` modular architecture.
* Preserve public `run_fraud_check(claim_id: str)` compatibility for routes.
* Preserve and enrich auditing via `AuditTimer(stage="fraud_engine")`.
* Implement tiers + fusion + diagnostics with strict timeouts, toggles, budgets, and fallbacks.
* Use Supabase storage bucket `claim_documents` and key `claim_documents.storage_key` for downloads (only when Jina media enabled).
* Ensure all outputs are frontend-safe and Layer 4-ready.

END.

