# Lexora API — Compressed Reference

**Base:** `http://localhost:8000` | All endpoints prefixed `/api`

---

## Health
| Method | Path | Response |
|---|---|---|
| `GET` | `/api/health` | `{ "status": "ok" }` |

---

## Dashboard
| Method | Path | Response shape |
|---|---|---|
| `GET` | `/api/dashboard/summary` | `{ kpis[], priority_queue[], threat_alerts[], analytics_kpis[], drift_metrics[], heatmap[] }` |

`threat_alerts[].level`: `Critical` | `High` | `Medium` | `Warning` | `System` | `Low`

---

## Claims
| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/claims` | Body: `{ policy_id, policy_number, claim_type, description, incident_date, holder_name }` → returns `ClaimView` (201) |
| `GET` | `/api/claims` | Query: `page`, `page_size`, `status`, `risk_band` → `{ items[], total, page, page_size }` |
| `GET` | `/api/claims/{id}` | Full `ClaimView` |
| `GET` | `/api/claims/{id}/documents/{doc_id}/download` | File stream |
| `POST` | `/api/claims/{id}/run-policy` | Trigger L2 |
| `POST` | `/api/claims/{id}/run-fraud` | Trigger L3 |
| `POST` | `/api/claims/{id}/decide` | Trigger L4 |
| `POST` | `/api/claims/{id}/run-all` | Full pipeline L2→L3→L4 |
| `POST` | `/api/claims/{id}/manual-review` | Body: `{ reviewer_id, decision, approved_amount, rationale }` |
| `GET` | `/api/claims/{id}/audit` | Array of `AuditEvent` |
| `GET` | `/api/claims/{id}/export-pdf` | Streaming PDF (ReportLab) |
| `POST` | `/api/claims/run-layer2` | Batch L2 on all `extracted` claims |
| `POST` | `/api/claims/process-pending` | Re-trigger stalled claims (also called by sweeper) |

**`ClaimView` shape:**
```json
{
  "id": "uuid", "claim_number": "CLM-XXXX", "policy_id": "...", "holder_name": "...",
  "claim_type": "medical", "status": "fraud_checking", "final_decision": null,
  "fraud_score": 0.34, "risk_band": "medium", "submitted_at": "ISO8601",
  "description": "...", "flags": [], "layers": {}
}
```

---

## Webhooks
| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/webhooks/n8n-extraction` | n8n L1 payload — see `LAYER_CONTRACTS.md` for schema |
| `POST` | `/api/webhooks/n8n/claim-upload` | Direct file upload via n8n |

---

## Customer
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/customer/policies` | Query: `email=`, `status=`, `page=` → `{ items[], total }` |
| `GET` | `/api/customer/policies/{id}` | Query: `email=` — full policy detail |
| `GET` | `/api/customer/claims` | Query: `email=` → `{ items[] }` |
| `GET` | `/api/customer/claims/{id}` | Customer claim detail |
| `GET` | `/api/customer/claims/download/{doc_id}` | Document download |
| `GET` | `/api/customer/dashboard-stats` | `{ total_coverage, active_claims, pending_amount }` |
| `GET` | `/api/user/profile` | `{ id, name, email, avatar_url, member_since, policy_count, active_claim_count }` |
| `GET` | `/api/notifications` | Array of `{ id, icon, color, title, desc, time, unread }` |
| `GET` | `/api/notifications/prefs` | Array of `{ key, label, enabled }` |
| `PUT` | `/api/notifications/prefs` | Body: `{ key, enabled }` → returns full prefs array |

---

## Analytics
| Method | Path | Response shape |
|---|---|---|
| `GET` | `/api/analytics/summary` | `{ kpi_cards[], drift_metrics[], heatmap_rows[], trajectory[], retraining_alert }` |

`heatmap_rows[].cells[].intensity`: `0`=green, `1`=amber, `2`=red

---

## Network Graph
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/network/graph` | Query: `claim_id=` (optional) → `{ claim_id, nodes[], edges[] }` |

`node.type`: `target` | `connected` | `vendor` | `provider`  
`node.x`/`node.y`: percentage 0–100 for SVG positioning

---

## Config
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/config` | `{ thresholds[], flags[], health }` |
| `PUT` | `/api/config/{key}` | Body: `{ key, value, description, version }` → updated config entry |
| `GET` | `/api/policies` | Admin list of all policies |
| `GET` | `/api/users` | Admin list of all users |

---

## Audit
| Method | Path | Response shape |
|---|---|---|
| `GET` | `/api/claims/{id}/audit` | Array: `{ id, claim_id, actor, action, timestamp, metadata }` |

---

## Chat
| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/chat/message` | Admin — body: `{ session_id, message, ui_context }` |
| `POST` | `/api/chat/customer/message` | Customer — body: `{ session_id, message, email, ui_context }` |
| `GET` | `/api/chat/sessions` | List sessions |
| `GET` | `/api/chat/session/{session_id}` | Messages in session |

---

## Auth
| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/auth/verify-email` | Body: `{ email }` → `{ exists, role, name }` |

Auth is mock. Demo OTP = any 6 digits. See `FRONTEND.md` for demo accounts.

---

## Status Codes
| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request |
| `404` | Not found |
| `409` | Invalid state transition |
| `500` | Server error |
