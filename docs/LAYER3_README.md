# Layer 3: Fraud Detection Engine

This directory contains the AI-driven Fraud Detection Engine (Layer 3) of the Lexora Backend. 

## System Status
**Layer 3 is fully implemented and production-ready.** It runs via a two-pass architecture (Local Fallback + Cloud AI Integration) ensuring it meets strict hackathon constraints while demonstrating state-of-the-art unstructured analytics. 

It is designed to be **fail-open**. If any external API fails, times out, or misses configuration keys, the system gracefully aborts cloud processing and resolves the fraud check locally using Pass 1 baseline logic.

## Integration Context (For Other Layers)
If you are developing Layer 1 (Intake), Layer 2 (Policy Rules), or the Frontend, here is how you interact with Layer 3:

### Input
Layer 3 expects a single trigger from the API or worker via `/api/claims/{claim_id}/run-fraud`.
- It reads data directly from the Supabase tables: `claims`, `claim_line_items`, and `claim_documents`.
- **Pre-requisite:** The claim must exist in the database and have the status `fraud_checking` (or `deciding` which it will force-update).

### Output
Layer 3 **does not modify the claim details, documents, or line items**. It only appends its findings to the claim record:
1. `fraud_score` (Float `0.0` - `1.0`)
2. `fraud_analysis` (JSONB): Contains the evidence, diagnostics, and tier breakdown.
3. Automatically transitions the claim status to `approved` (if score < 0.30) or `investigation` (if score > 0.70). 

### Diagnostics Tracking
Every run outputs a `diagnostics` block inside `fraud_analysis`. This is crucial for the Frontend/Auditors to prove the Hackathon AI actually ran. It contains:
- `latency_ms`: Time taken for the entire run.
- `services`: Status of Cohere, Jina, Qdrant, and Neo4j (`used: true`, `ok: true`, or an `error` string).
- `fallbacks`: Information on whether a tier was forced to use local logic due to timeouts.

---

## Technical Architecture

The engine runs a composite score across three independent tiers, bound by a global timeout `FRAUD_LAYER3_EXTERNAL_MAX_SECONDS` (default: 8s).

### Tier 1: Velocity & Rules (Deterministic)
Analyzes tabular historical data from Supabase.
- **Provider Velocity:** Flags providers submitting too many claims in a short window.
- **Patient Velocity:** Flags users submitting multiple claims rapidly.
- **Statistical Outliers:** Flags line items exceeding 3 standard deviations from the historical average for their specific billing code.

### Tier 2: Unstructured Similarity (Vector AI)
Analyzes the semantic meaning of the claim and its attached documents (PDF/Images).
- **Pass 1 (Local):** Looks for identical `sha256` document hashes already attached to different claims.
- **Pass 2 (Cloud):** 
  - Uses **Cohere** to embed the textual "story" of the claim.
  - Uses **Jina (Clip-v2)** to process multimodal embeddings for receipt images and PDFs.
  - Submits vectors to **Qdrant** to find semantically identical (but textually altered) historical claims.

### Tier 3: Graph Rings (Topology)
Analyzes the relational connections between entities.
- **Pass 1 (Local):** Executes hardcoded SQL joins to find overlaps in providers, users, and documents.
- **Pass 2 (Cloud):** 
  - Upserts entities (Claim, Provider, User, Document) as nodes into a **Neo4j Aura** graph.
  - Traverses the graph to detect "Rings" (e.g., 2 different users submitting claims to the same bad provider using the same compromised document hash).

---

## Configuration & Feature Flags
Layer 3 uses a hybrid configuration model. By default, **all cloud features are disabled (Pass 1 mode)**. 

To enable AI (Pass 2), you must provide the API keys in your `.env` (see `.env.example`) and toggle the feature flags. Flags can be set dynamically via the Supabase `configuration` table (`config_type=feature_flag`) or statically in the `.env` file:

```env
FRAUD_LAYER3_ENABLE_QDRANT=true
FRAUD_LAYER3_ENABLE_NEO4J=true
FRAUD_LAYER3_ENABLE_JINA_MEDIA=true
```

## Testing
Always run these scripts in `backend/` to ensure you haven't broken the pipeline:
1. **Local Logic Test:** `venv/Scripts/python test_layer3_realdata.py` (Must run cleanly with ZERO cloud dependencies).
2. **AI Integration Test:** `venv/Scripts/python test_layer3_pass2_realdata.py` (Proves failovers, API connections, idempotency, and cache evictions).
