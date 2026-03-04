# Lexora — Layer Integration Contracts (L1–L4)

---

## Layer 1 — Perception & Extraction

**Entry point:** `POST /api/webhooks/n8n-extraction` (`routes/webhooks.py`)

**Inputs — `N8NExtractionPayload`:**
```json
{
  "execution_id": "n8n-exec-9b32fa",
  "policy_number": "POL-123456",
  "claimant_name": "John Doe",
  "claimant_phone": "+1234567890",
  "incident_date": "2024-02-15T10:00:00Z",
  "incident_type": "accident",
  "incident_description": "...",
  "claimed_amount": 15000.00,
  "provider_name": "City General Hospital",
  "invoice_number": "INV-00129",
  "extraction_raw": { "doctor_notes": "..." },
  "extraction_confidence": 0.92,
  "extraction_warnings": ["Could not verify provider phone"],
  "needs_review": false
}
```

**DB writes:**
- `claims`: creates row with `status = extracted` (or `under_review` if `needs_review=true`)
- `audit_events`: `stage="layer1"`, `action="completed"`, fields_extracted count, confidence

**Post-write:** Fires `BackgroundTask → trigger_pipeline(claim_id)` → chains L2 → L3 → L4.

---

## Layer 2 — Policy Governance

**Entry point:** `evaluate_policy(claim_id)` — `engines/layer2/policy_engine.py`

**DB reads:** `claims`, `policies`, `policy_rules` (RulePack by `policy_type` + date), `claim_documents`

**RulePack format (`policy_rules.rules_definition`):**
```json
{
  "category_mapping": { "accident": "damage", "illness": "medical" },
  "coverage_categories": {
    "medical": {
      "covered": true,
      "exclusions": ["cosmetic", "pre-existing"],
      "deductible": 1000,
      "copay_percentage": 10,
      "per_incident_limit": 100000,
      "annual_limit": 500000,
      "waiting_period_days": 30
    }
  }
}
```

**DB writes:**
- `claims.policy_decision` — full 9-section JSONB (see output schema below)
- `claims.processed_at` — UTC timestamp
- `audit_events`: `stage="policy_engine"`

**Output shape (`claims.policy_decision`):**
```json
{
  "layer": 2,
  "policy": { "policy_id": "...", "policy_type": "auto", "ruleset_version": "1.0" },
  "classification": { "incident_type": "accident", "coverage_category": "damage", "covered": true },
  "outcome": { "status": "APPROVE", "eligible": true, "recommended_amount": 40000 },
  "financials": {
    "claimed_amount": 45000, "deductible": 5000, "copay_percent": 0,
    "payable_after_limits": 40000, "recommended_amount": 40000,
    "calculation_trace": ["Deductible ₹5,000 applied → ₹40,000"]
  },
  "rules": { "passed": ["POLICY_ACTIVE", "DATE_WITHIN_TERM"], "failed": [], "flagged": [] },
  "routing": { "queue": "FAST_TRACK", "priority": "LOW" },
  "analytics_tags": { "hard_reject": false, "review_required": false }
}
```

**Outcome statuses:** `APPROVE` | `REVIEW` | `REJECT`  
**Routing queues:** `FAST_TRACK` | `AUTO_REVIEW` | `MANUAL_REVIEW`

---

## Layer 3 — Fraud Detection

**Entry point:** `run_fraud_check(claim_id)` — `engines/fraud_engine.py` → `engines/layer3/main.py`  
(Also: `POST /api/claims/{claim_id}/run-fraud`)

**Prerequisite:** Claim must exist with `status = fraud_checking`.

**DB reads:** `claims`, `claim_line_items`, `claim_documents`

**Does NOT modify:** claim details, documents, line items.

**DB writes:**
- `claims.fraud_score` — float 0.0–1.0
- `claims.fraud_analysis` — JSONB with tier breakdown + diagnostics
- `claims.status` → transitions per score

**Output shape (`claims.fraud_analysis`):**
```json
{
  "fraud_score": 0.67,
  "risk_band": "medium",
  "recommended_action": "manual_review",
  "top_reasons": ["Duplicate invoice hash found", "Provider velocity > threshold"],
  "tier_scores": { "tier1": 0.55, "tier2": 0.70, "tier3": 0.60 },
  "diagnostics": {
    "latency_ms": 1240,
    "services": {
      "cohere": { "used": true, "ok": true, "latency_ms": 320 },
      "jina":   { "used": false, "ok": null },
      "qdrant": { "used": true, "ok": true, "latency_ms": 90 },
      "neo4j":  { "used": true, "ok": false, "error": "timeout" }
    },
    "fallbacks": { "tier3": "local_sql_rings" }
  }
}
```

**Three tiers:**
- **Tier 1 (deterministic):** velocity checks, duplicate invoice, amount anomaly, late reporting
- **Tier 2 (vector AI):** sha256 hash reuse (local) + Cohere text embed → Qdrant + Jina image (gated)
- **Tier 3 (graph):** SQL ring joins (local) + Neo4j entity graph traversal (gated)

**Fail-open design:** If any cloud service fails/times out, gracefully falls back to local Pass 1 logic. Never blocks the pipeline.

**Feature flags** (env or `configuration` table):
```
FRAUD_LAYER3_ENABLE_QDRANT=true/false      (default: false)
FRAUD_LAYER3_ENABLE_NEO4J=true/false       (default: false)
FRAUD_LAYER3_ENABLE_JINA_MEDIA=true/false  (default: false)
```

---

## Layer 4 — Economic Decision & Risk Fusion

**Entry point:** `run_decision(claim_id)` — `engines/risk_fusion.py`  
(Also: `POST /api/claims/{claim_id}/decide`)

**Inputs (reads from `claims`):** `fraud_score`, `claimed_amount`, `extraction_confidence`, `policy_decision`

**Core formula:** `Expected Loss = fraud_score × claimed_amount`

**Dynamic thresholds** (from `configuration` table):
| Key | Default |
|---|---|
| `fraud.investigation_cost` | `5000` |
| `fraud.high_threshold` | `0.70` |
| `fraud.low_threshold` | `0.30` |
| `routing.min_confidence` | `0.60` |
| `routing.auto_approve_confidence` | `0.85` |

**Decision cascade (in order):**
1. `extraction_confidence < min_confidence` → `manual_review`
2. `policy_decision.eligible == false` → `auto_reject`
3. `fraud_score >= high_threshold` → `fraud_investigation`
4. `fraud_score` in medium range AND `Expected Loss > investigation_cost` → `manual_review`
5. `fraud_score < low_threshold` AND `extraction_confidence >= auto_approve_confidence` → `auto_approve`; else → `manual_review`

**4 outcomes:** `auto_approve` | `auto_reject` | `manual_review` | `fraud_investigation`

**DB writes:**
- `claims.final_decision`, `claims.decision_rationale`, `claims.approved_amount`, `claims.decision_output`
- `audit_events`: `stage="decision"` with expected loss metrics

**Output shape (`decision_output`):**
```json
{
  "final_decision": "auto_approve",
  "decision_rationale": "Low fraud risk (0.12 < 0.30). High confidence (0.95). Auto-approved.",
  "approved_amount": 40000.0,
  "decision_output": {
    "route": "auto_approve",
    "metrics": { "expected_loss": 5400.0, "fraud_score": 0.12, "extraction_confidence": 0.95 },
    "thresholds": { "investigation_cost": 5000, "critical_fraud": 0.7, "low_fraud": 0.3 }
  }
}
```
