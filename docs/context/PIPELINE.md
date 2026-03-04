# Lexora — Pipeline & State Machine

## Claim Lifecycle (End-to-End)

```
User / n8n
    │
    ├─ POST /api/webhooks/n8n-extraction   ← n8n posts structured extraction
    │       (routes/webhooks.py)
    │       → Creates/updates claim, status = extracted
    │       → Fires BackgroundTask: trigger_pipeline(claim_id)
    │
    └─ POST /api/claims                    ← direct customer submission
            (routes/claims.py)
            → Creates claim, status = submitted

trigger_pipeline(claim_id):
    L2: evaluate_policy(claim_id)      engines/layer2/policy_engine.py
    L3: run_fraud_check(claim_id)      engines/fraud_engine.py → engines/layer3/main.py
    L4: run_decision(claim_id)         engines/risk_fusion.py
```

## State Machine

| From | To | Who transitions |
|---|---|---|
| `submitted` | `extracting` | `webhooks.py` on n8n receipt |
| `extracting` | `extracted` | `webhooks.py` on extraction complete |
| `extracted` | `policy_evaluating` | `evaluate_policy()` start |
| `policy_evaluating` | `fraud_checking` | `evaluate_policy()` complete |
| `fraud_checking` | `deciding` | `run_fraud_check()` complete |
| `deciding` | `finalized` | `run_decision()` → auto_approve / auto_reject |
| `deciding` | `under_review` | `run_decision()` → manual_review |
| `deciding` | `fraud_investigation` | `run_decision()` → fraud_investigation |
| any | `error` | Any layer on unrecoverable exception |

Enforced by `state_machine.py` — raises `HTTP 409` on invalid transition.

**Critical invariant:** `claims.status` = pipeline lifecycle. `claims.final_decision` = outcome. Never mix them.

## Background Sweeper

- Runs every 30s via `asyncio.create_task(claim_sweeper())` on startup (`main.py`).
- Calls `POST /api/claims/process-pending` → `routes/claims.py` → re-triggers stalled claims.
- Logs only when `processed_count > 0`.

## Manual Pipeline Triggers (Admin)

| Endpoint | Effect |
|---|---|
| `POST /api/claims/{id}/run-policy` | Trigger L2 only |
| `POST /api/claims/{id}/run-fraud` | Trigger L3 only |
| `POST /api/claims/{id}/decide` | Trigger L4 only |
| `POST /api/claims/{id}/run-all` | Full L2 → L3 → L4 |
| `POST /api/claims/{id}/manual-review` | Human override (body: `reviewer_id`, `decision`, `approved_amount`, `rationale`) |
| `POST /api/claims/run-layer2` | Batch: all `extracted` claims → L2 |

## n8n Layer 1 Workflow

n8n workflow (`n8n-workflow.json`) runs at port 5678:
1. Receives raw documents from user upload.
2. OCR → multi-modal LLM extraction (Gemini/GPT-4V).
3. Scores `extraction_confidence` + collects `extraction_warnings`.
4. POSTs `N8NExtractionPayload` to `POST /api/webhooks/n8n-extraction`.
