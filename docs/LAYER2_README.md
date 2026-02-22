# Layer 2: Policy Governance Engine

## Overview
The Layer 2 Policy Governance Engine is a purely deterministic, rule-based system responsible for validating claims against policy rules. It does **not** use any LLMs or external AI services. Its primary responsibilities are:
1. Ensuring the claim is eligible under the active policy terms.
2. Computing financials (calculating deductibles, copays, per-incident limits, and annual limits).
3. Routing the claim appropriately based on the outcome (Fast Track, Auto Review, or Manual Review).

---

## 📥 Inputs & Dependencies

The engine is triggered via a single function call: `evaluate_policy(claim_id: str)`. It depends purely on the state of the database at the time of execution.

### Tables Read (No mutations)
1. `claims`: Reads claim details (`incident_type`, `claimed_amount`, `incident_date`, `incident_description`).
2. `policies`: Reads policy details (`policy_type`, `is_active`, `policy_start_date`, `policy_end_date`, `annual_limit`).
3. `policy_rules`: Looks up the correct RulePack (`rules_definition`) by matching `policy_type` and ensuring the `effective_from` date covers the `incident_date`.
4. `claim_documents`: Reads metadata about uploaded documents (used for checking if mandatory documents like FIRs or invoices are present, if required).

---

## 🗄️ RulePack Format (`policy_rules.rules_definition`)

The core logic of Layer 2 is driven by JSON payloads stored in `policy_rules`. The engine expects the RulePack to use `category_mapping` and `coverage_categories`. 

**Sample Structure:**
```json
{
  "category_mapping": {
    "accident": "damage",
    "illness": "medical",
    "theft": "loss"
  },
  "coverage_categories": {
    "medical": {
      "covered": true,
      "exclusions": ["cosmetic", "experimental", "pre-existing"],
      "deductible": 1000,
      "copay_percentage": 10,
      "per_incident_limit": 100000,
      "annual_limit": 500000,
      "waiting_period_days": 30
    }
  }
}
```

**How it works:** 
1. The claim's `incident_type` (e.g., `illness`) is mapped to a coverage category via `category_mapping` (e.g., `medical`).
2. The rules for that specific category (`coverage_categories.medical`) are then applied (waiting periods, exclusions, and financial limits).

---

## 📤 Output & Database Changes

Layer 2 modifies exactly two tables upon completion.

### 1. `claims` Table (Mutated)
- **`policy_decision`**: Updated with a strict, 9-section native JSONB object containing the full evaluation trace.
- **`processed_at`**: Updated with the current UTC timestamp (ISO 8601 string).

### 2. `audit_events` Table (Inserted)
- Inserts an immutable audit log (`stage = "policy_engine"`) for execution start, completion, and any runtime failures, capturing execution duration.

---

## 📄 Output Schema (`claims.policy_decision`)

The engine outputs a massive JSONB payload containing the full context of the decision. This is highly important for Layer 3, frontend visualisations, and auditing.

### Sample Output
```json
{
  "layer": 2,
  "policy": {
    "policy_id": "807d584e-cfa1-45a8-8ad7-3fbd8a8a29b3",
    "policy_type": "auto",
    "ruleset_id": "92a18f4a-4b9e-4e81-...",
    "ruleset_version": "1.0",
    "effective_from": "2024-01-01T00:00:00"
  },
  "classification": {
    "incident_type": "accident",
    "coverage_category": "damage",
    "covered": true
  },
  "outcome": {
    "status": "APPROVE", 
    "eligible": true,
    "recommended_amount": 40000,
    "currency": "INR"
  },
  "financials": {
    "claimed_amount": 45000,
    "deductible": 5000,
    "copay_percent": 0,
    "per_incident_limit": 100000,
    "annual_limit": 500000,
    "annual_used": 0,
    "annual_remaining": 500000,
    "payable_before_limits": 40000,
    "payable_after_limits": 40000,
    "recommended_amount": 40000,
    "calculation_trace": [
      "Deductible ₹5,000.00 applied → ₹40,000.00 remaining",
      "Annual limit check: ₹40,000.00 within remaining ₹500,000.00"
    ],
    "currency": "INR"
  },
  "rules": {
    "passed": ["POLICY_ACTIVE", "DATE_WITHIN_TERM", "AMOUNT_POSITIVE", "NO_EXCLUSION_MATCH"],
    "failed": [],
    "flagged": []
  },
  "reasons": [],
  "routing": {
    "queue": "FAST_TRACK",
    "priority": "LOW",
    "next_action": "Eligible for straight-through processing."
  },
  "analytics_tags": {
    "policy_violation_count": 0,
    "doc_gaps_count": 0,
    "hard_reject": false,
    "review_required": false
  }
}
```

### Possible Statuses
- `APPROVE`: All rules passed. Passes to Layer 3 or financial processing.
- `REVIEW`: A soft rule was flagged (e.g. unknown coverage category mapping). Requires human examination.
- `REJECT`: A hard rule failed (e.g. policy inactive, out of date bounds, explicit exclusion keywords found in description). Claim is denied.

---

## 🛠️ Execution Methods

- **Single Claim (Code):** `from engines.layer2 import evaluate_policy` → `evaluate_policy(claim_id)`
- **Batch Processing:** Run `python scripts/run_layer2_batch.py` from the root backend directory to process all claims with `status='extracted'` and `policy_decision IS NULL`.
- **API Endpoint:** `POST /claims/run-layer2` (Available for admin dashboard invocation).
