# Layer 4: Economic Decision & Risk Fusion Engine

## Overview
The **Layer 4 Decision Engine** is the final mathematical step in the Lexora autonomous pipeline. It does not look at the raw claim context. Instead, it fuses the mathematical outputs of **Layer 1 (Perception)**, **Layer 2 (Policy)**, and **Layer 3 (Fraud)** to calculate the Expected Loss trajectory and route the claim to its final state.

This layer uses pure mathematical thresholds based on a strict Flowchart implementation. It balances the cost of human investigation versus the probability-weighted financial risk of auto-approving a fraudulent claim.

---

## 🧮 Core Formula

The engine's fundamental decision is rooted in **Expected Loss**:
`Expected Loss = Fraud Score (from Layer 3) × Claimed Amount (from Layer 1/2)`

If the `Expected Loss` exceeds the cost of paying a human investigator (e.g., $5,000), it makes financial sense to manually investigate rather than blindly auto-paying.

---

## 📥 Inputs & Dependencies

The engine is triggered at the absolute end of the backend pipeline via `run_decision(claim_id)`. It depends exclusively on data synthesized by previous layers stored in the `claims` table:

1. **`fraud_score`**: (Layer 3) Float probability marking risk level.
2. **`claimed_amount`**: (Layer 1) The original dollar value.
3. **`extraction_confidence`**: (Layer 1) How confident the AI was in parsing the receipts.
4. **`policy_decision`**: (Layer 2) JSON Object containing exactly what the coverage terms approve (and specific `$ recommended_amount`).

### Dynamic Threshold Configurations
Layer 4 does not hardcode numbers. It fetches configuration variables dynamically from the Supabase `configuration` table, allowing live tuning by executives without deploying code.

* `fraud.investigation_cost`: (Default: 5000)
* `fraud.high_threshold`: (Default: 0.70)
* `fraud.low_threshold`: (Default: 0.30)
* `routing.min_confidence`: (Default: 0.60)
* `routing.auto_approve_confidence`: (Default: 0.85)

---

## 🔀 Decision Flowchart (Routing Logic)

Layer 4 strictly executes the following cascading flow:

1. **Data Quality Sufficient?**
   - If `extraction_confidence < min_confidence` 
   - ➔ **Route:** `manual_review` (Failsafe for messy OCR)

2. **Policy Rules Result?**
   - If Layer 2 flagged the claim as `eligible: false`
   - ➔ **Route:** `auto_reject` (Strictly denies un-covered events)

3. **Fraud Score Branching**
   - If `fraud_score >= critical_fraud_threshold` (e.g., 0.70+)
   - ➔ **Route:** `fraud_investigation` (Sent immediately to SIU Team)

4. **Economic Threshold (Medium Risk Branch)**
   - If `fraud_score` is medium (between `low_threshold` and `critical_threshold`)
   - Calculates `Expected Loss`. If `Expected Loss > investigation_cost`
   - ➔ **Route:** `manual_review` (Makes financial sense to pay an underwriter to check it)
   - Otherwise, drops down into Low Risk workflow.

5. **Decision Safe Harbor (Low Risk Branch)**
   - If `fraud_score < low_threshold` AND `extraction_confidence >= auto_approve_confidence`
   - ➔ **Route:** `auto_approve` (Perfect claim, pay it instantly)
   - If confidence is medium, it routes to `manual_review` just to be safe.

---

## 📤 Output Payload & Database Updates

Layer 4 returns a master `decision_output` routing dictionary back to the `run_full_pipeline` wrapper, which subsequently updates the `claims.status` database property one final time, completely resolving the lifecycle of the claim.

### Sample Return Object (`risk_fusion.py`)
```json
{
    "final_decision": "auto_approve",
    "decision_rationale": "Decision Safe Harbor: Low fraud risk (0.12 < 0.30). Proceeding to confidence check. High extraction confidence (0.95 >= 0.85). Auto-approved.",
    "approved_amount": 40000.0,
    "decision_output": {
        "route": "auto_approve",
        "metrics": {
            "expected_loss": 5400.0,
            "fraud_score": 0.12,
            "extraction_confidence": 0.95,
            "claimed_amount": 45000.0,
            "recommended_policy_amount": 40000.0
        },
        "thresholds": {
            "investigation_cost": 5000.0,
            "critical_fraud": 0.7,
            "low_fraud": 0.3,
            "min_confidence": 0.6,
            "auto_approve_confidence": 0.85
        }
    }
}
```

It additionally inserts an `audit_events` row logging `stage="decision"` containing these exact expected loss metrics and the routing outcome.
