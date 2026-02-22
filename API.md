# Lexora API Reference

> **Base URL:** `http://localhost:8000`  
> **All endpoints are prefixed with `/api`**  
> **Current Mode:** Simulation (`simulation_mode = True` in `backend/app/core/settings.py`) — all responses are structured mock data. Flip to `False` when Supabase is seeded.

---

## Table of Contents
1. [Health](#1-health)
2. [Dashboard](#2-dashboard)
3. [Claims](#3-claims)
4. [User Profile](#4-user-profile)
5. [Policies](#5-policies)
6. [Analytics](#6-analytics)
7. [Network Graph](#7-network-graph)
8. [Notifications](#8-notifications)
9. [Config](#9-config)
10. [Audit](#10-audit)
11. [Auth (Stub)](#11-auth-stub)

---

## 1. Health

### `GET /api/health`
Simple liveness check. No auth required.

**Response `200`:**
```json
{ "status": "ok" }
```

---

## 2. Dashboard

### `GET /api/dashboard/summary`
Returns everything the Admin Dashboard needs in a single call. Polled every 30 seconds by `DashboardPage.jsx`.

**Response `200`:**
```json
{
  "kpis": [
    {
      "label": "Risk Exposure",
      "value": "$14.2M",
      "delta": "+2.4%",
      "icon": "currency_exchange"
    }
    // ... more KPI objects
  ],
  "priority_queue": [
    {
      "id": "abc12345",
      "holder": "Sarah Jenkins",
      "amount": "$1,250.00",
      "risk_score": 92,
      "status": "under_review"
    }
    // ...
  ],
  "threat_alerts": [
    {
      "id": "syndicate",
      "icon": "skull",
      "title": "Syndicate Cluster #992",
      "detected": "2m ago",
      "level": "Critical",
      "score": 98,
      "description": "High-velocity claim pattern detected matching known organized fraud signature."
    },
    {
      "id": "identity",
      "icon": "identity_platform",
      "title": "Identity Mismatch",
      "detected": "15m ago",
      "level": "High",
      "score": 84,
      "description": "SSN provided appears on dark web breach list."
    }
  ],
  "analytics_kpis": [
    {
      "label": "Total Prevented Loss",
      "value": "$12.4M",
      "change": "+12%",
      "sub": "Vs. $11.1M expected"
    }
    // ...
  ],
  "drift_metrics": [
    {
      "label": "Input Drift (PSI)",
      "value": "0.04",
      "bar_width": "15%"
    }
    // ...
  ],
  "heatmap": [
    { "day": 1, "hour": 12, "value": 45 }
    // ...
  ]
}
```

**Field reference:**
| Field | Type | Description |
|---|---|---|
| `kpis` | `KPI[]` | Top-line metrics for admin overview |
| `priority_queue` | `PriorityQueueItem[]` | High-risk claims needing immediate review |
| `threat_alerts` | `ThreatAlert[]` | Active fraud signals — `level` is one of `Critical`, `High`, `Medium`, `Warning`, `System`, `Low` |
| `analytics_kpis` | `AnalyticsKPI[]` | Summary metrics for mini analytics panel |
| `drift_metrics` | `DriftMetric[]` | Model drift indicators |
| `heatmap` | `HeatmapCell[]` | Fraud frequency by day/hour |

---

## 3. Claims

### `POST /api/claims`
Submit a new insurance claim. Front-end sends this on the final step of `FileClaimPage`. Returns the full claim view.

**Request Body:**
```json
{
  "policy_id": "pol-h-001",
  "policy_number": "H-992-883",
  "claim_type": "medical",
  "description": "Hospitalisation due to appendicitis on Feb 15, 2025",
  "incident_date": "2025-02-15",
  "holder_name": "Kumud Sharma"
}
```
| Field | Type | Required | Notes |
|---|---|---|---|
| `policy_id` | string | ✅ | ID from `/api/policies` |
| `policy_number` | string | ✅ | Human-readable policy number |
| `claim_type` | string | ✅ | `medical`, `accident`, `delay`, `baggage`, `other` |
| `description` | string | ✅ | Free-text incident description |
| `incident_date` | string | ✅ | ISO date `YYYY-MM-DD` |
| `holder_name` | string | ✅ | Will come from user profile once auth is wired |

**Response `201`** — returns a `ClaimView`:
```json
{
  "id": "clm-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "claim_number": "CLM-XXXX",
  "policy_id": "pol-h-001",
  "policy_number": "H-992-883",
  "holder_name": "Kumud Sharma",
  "claim_type": "medical",
  "status": "pending",
  "final_decision": null,
  "fraud_score": 0.12,
  "risk_band": "low",
  "submitted_at": "2025-02-22T00:00:00Z",
  "description": "Hospitalisation due to appendicitis...",
  "flags": [],
  "layers": {}
}
```

---

### `GET /api/claims`
List all claims (admin view). Supports pagination and filtering.

**Query Parameters:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | int | `1` | Page number |
| `page_size` | int | `10` | Max 100 per page |
| `status` | string | `null` | Filter by status: `pending`, `approved`, `denied`, `under_review` |
| `risk_band` | string | `null` | Filter by risk: `low`, `medium`, `high` |

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "claim_number": "CLM-9803",
      "holder_name": "Sarah Jenkins",
      "type": "Medical",
      "amount": "$1,250.00",
      "risk_score": 84.0,
      "status": "under_review",
      "final_decision": null,
      "date": "Feb 20, 2025",
      "flags": []
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 10
}
```

---

### `GET /api/claims/{claim_id}`
Get the full detail view of a single claim. Used by `ClaimResultPage` after submission.

**Path Parameter:** `claim_id` — UUID string

**Response `200`** — Same shape as the `ClaimView` above (from `POST /api/claims`).

**Response `404`:**
```json
{ "detail": "Claim not found" }
```

---

### `POST /api/claims/{claim_id}/actions`
Trigger an admin action on a claim.

**Request Body:**
```json
{
  "action": "approve"
}
```
| `action` value | Effect |
|---|---|
| `simulate` | Runs the full AI pipeline in dry-run mode |
| `approve` | Sets claim status to `approved` |
| `reject` | Sets claim status to `denied` |
| `escalate` | Sets claim status to `under_review` |

**Response `200`** — Returns updated `ClaimView`.

**Response `400`:**
```json
{ "detail": "Invalid action" }
```

---

### `POST /api/claims/{claim_id}/documents`
Mock document upload. Returns a document ID and hash.

**Response `200`:**
```json
{
  "document_id": "doc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "sha256": "mockedhashval"
}
```

---

## 4. User Profile

### `GET /api/user/profile`
Returns the logged-in user's profile. Used by `HomePage` and `ProfilePage`. When auth is wired, this will extract user ID from the JWT token.

**Response `200`:**
```json
{
  "id": "usr-001",
  "name": "Kumud Sharma",
  "email": "kumud.sharma@example.com",
  "avatar_url": null,
  "member_since": "2021",
  "policy_count": 2,
  "active_claim_count": 1
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | User UUID (matches Supabase `auth.users.id`) |
| `name` | string | Full name |
| `email` | string | Email address |
| `avatar_url` | string \| null | Profile photo URL (Supabase Storage) |
| `member_since` | string | Year the user joined |
| `policy_count` | int | Total number of policies owned |
| `active_claim_count` | int | Number of currently pending/in-review claims |

---

## 5. Policies

### `GET /api/policies`
Returns a paginated list of the user's policies. Used by `PoliciesPage`, `HomePage`, `FileClaimPage`, `DocsPage`, and `RenewalPage`.

**Query Parameters:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `status` | string | `null` | Comma-separated: `active`, `expired`. Example: `?status=active` |
| `page` | int | `1` | Page number |
| `page_size` | int | `20` | Max 100 per page. `HomePage` requests `?page_size=2` |

**Response `200`:**
```json
{
  "items": [
    {
      "id": "pol-h-001",
      "policy_number": "H-992-883",
      "name": "Health Shield Premier",
      "type": "health",
      "status": "active",
      "icon": "cardiology",
      "coverage_amount": "$500,000",
      "premium": "$420",
      "premium_suffix": "/mo",
      "renewal_date": "Oct 24, 2025",
      "since": "2021",
      "extra_stats": {
        "deductible": "$250",
        "network": "PPO Gold"
      }
    },
    {
      "id": "pol-a-002",
      "policy_number": "A-110-442",
      "name": "Auto Drive Secure",
      "type": "auto",
      "status": "active",
      "icon": "directions_car",
      "coverage_amount": "$50,000",
      "premium": "$182",
      "premium_suffix": "/mo",
      "renewal_date": "Nov 01, 2025",
      "since": "2023",
      "extra_stats": {
        "vehicle": "Tesla Model 3",
        "deductible": "$500"
      }
    },
    {
      "id": "pol-t-003",
      "policy_number": "T-332-901",
      "name": "Global Travel Plus",
      "type": "travel",
      "status": "expired",
      "icon": "flight",
      "renewal_date": "Sep 15, 2024",
      "since": "2022",
      "extra_stats": null
    }
  ],
  "total": 4,
  "page": 1,
  "page_size": 20
}
```

**`type` values:** `health`, `auto`, `travel`, `pet`, `life`  
**`status` values:** `active`, `expired`  
**`extra_stats`:** Freeform dict — varies by policy type. May include `vehicle`, `deductible`, `network`, etc.

---

### `GET /api/policies/{policy_id}`
Full detail view of a single policy. Used by `PolicyDetailPage` when navigating with `?id=pol-h-001`.

**Path Parameter:** `policy_id`

**Response `200`** — Extends the Policy Summary with:
```json
{
  "id": "pol-h-001",
  "policy_number": "H-992-883",
  "name": "Health Shield Premier",
  "type": "health",
  "status": "active",
  "icon": "cardiology",
  "coverage_amount": "$500,000",
  "premium": "$420",
  "premium_suffix": "/mo",
  "renewal_date": "Oct 24, 2025",
  "since": "2021",
  "extra_stats": { "deductible": "$250", "network": "PPO Gold" },
  "documents": [
    "Policy Certificate",
    "Terms & Conditions",
    "Schedule of Benefits"
  ],
  "beneficiaries": [
    "Kumud Sharma (Primary)",
    "Priya Sharma (Secondary)"
  ],
  "deductible": "$250",
  "description": "Comprehensive health coverage with 24/7 support and fast claims processing."
}
```

**Response `404`:**
```json
{ "detail": "Policy not found" }
```

---

## 6. Analytics

### `GET /api/analytics/summary`
Returns all data for the Admin Analytics page. Polled every 60 seconds by `AnalyticsPage.jsx`.

**Response `200`:**
```json
{
  "kpi_cards": [
    {
      "label": "Total Prevented Loss",
      "value": "$12.4M",
      "change": "+12%",
      "change_icon": "trending_up",
      "change_color": "text-emerald-500",
      "sub": "Vs. $11.1M expected",
      "icon": "monetization_on"
    },
    {
      "label": "Current Model Accuracy",
      "value": "94.2%",
      "change": "+0.8%",
      "change_icon": "arrow_upward",
      "change_color": "text-emerald-500",
      "sub": "Top percentile performance",
      "icon": "model_training"
    },
    {
      "label": "Active Fraud Alerts",
      "value": "23",
      "change": "-5%",
      "change_icon": "arrow_downward",
      "change_color": "text-emerald-500",
      "sub": "Requires immediate review",
      "icon": "notification_important"
    }
  ],
  "drift_metrics": [
    {
      "label": "Input Drift (PSI)",
      "value": "0.04",
      "color": "text-emerald-500",
      "bar_color": "bg-emerald-500",
      "bar_pct": 15,
      "sub": "Distribution remains stable within expected bounds.",
      "warn": false
    },
    {
      "label": "Concept Drift (KL)",
      "value": "0.12",
      "color": "text-amber-500",
      "bar_color": "bg-amber-500",
      "bar_pct": 45,
      "sub": "Minor shifts detected in Property claims data.",
      "warn": false
    },
    {
      "label": "Output Stability",
      "value": "0.21",
      "color": "text-primary",
      "bar_color": "bg-primary",
      "bar_pct": 75,
      "sub": "Warning: Casualty model predictions deviating.",
      "warn": true
    }
  ],
  "heatmap_rows": [
    {
      "archetype": "Medical",
      "cells": [
        { "value": "98%", "intensity": 0, "tooltip": null },
        { "value": "82%", "intensity": 1, "tooltip": "Review discrepancy" }
      ]
    },
    {
      "archetype": "Property",
      "cells": [
        { "value": "52%", "intensity": 2, "tooltip": "Critical Drift" }
      ]
    }
  ],
  "trajectory": [
    { "week": "Week 1", "expected": 9.2,  "prevented": 8.8  },
    { "week": "Week 2", "expected": 10.1, "prevented": 10.5 },
    { "week": "Week 3", "expected": 11.3, "prevented": 11.8 },
    { "week": "Week 4", "expected": 11.8, "prevented": 12.4 }
  ],
  "retraining_alert": "Casualty v4.1 showing signs of degradation."
}
```

**`intensity` values for heatmap cells:** `0` = green (good), `1` = amber (warning), `2` = red (critical)

---

## 7. Network Graph

### `GET /api/network/graph`
Returns the fraud entity relationship graph for `NetworkGraphPage.jsx`. Optionally scoped to a single claim.

**Query Parameters:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `claim_id` | string | `null` | If provided, scopes graph to claim. Returns full graph for now (production: filter by claim). |

**Response `200`:**
```json
{
  "claim_id": "clm-xxx-yyy",
  "nodes": [
    {
      "id": "N1",
      "label": "Sarah M.",
      "x": 50,
      "y": 25,
      "type": "target",
      "risk": 94
    },
    {
      "id": "N2",
      "label": "James P.",
      "x": 20,
      "y": 55,
      "type": "connected",
      "risk": 72
    },
    {
      "id": "N4",
      "label": "Body Shop A",
      "x": 50,
      "y": 75,
      "type": "vendor",
      "risk": 76
    },
    {
      "id": "N5",
      "label": "Dr. Martinez",
      "x": 30,
      "y": 20,
      "type": "provider",
      "risk": 55
    }
  ],
  "edges": [
    {
      "from_node": "N1",
      "to_node": "N2",
      "label": "Shared Address"
    },
    {
      "from_node": "N1",
      "to_node": "N4",
      "label": "Repair Vendor"
    }
  ]
}
```

**`node.type` values:** `target` (primary subject), `connected` (linked individual), `vendor` (business), `provider` (medical/service provider)  
**`node.x` / `node.y`:** Percentage-based positions `0–100` used for SVG rendering.

---

## 8. Notifications

### `GET /api/notifications`
Returns the user's notification feed. Polled every 60 seconds by `NotificationsPage.jsx`.

**Response `200`** — Array of `Notification`:
```json
[
  {
    "id": "uuid",
    "icon": "check_circle",
    "color": "text-emerald-400",
    "title": "Claim CLM-9803 Approved",
    "desc": "$1,240 reimbursement is being processed to your account.",
    "time": "2 days ago",
    "unread": false
  },
  {
    "id": "uuid",
    "icon": "upcoming",
    "color": "text-yellow-400",
    "title": "Renewal Reminder",
    "desc": "Your health policy H-992-883 renews in 23 days.",
    "time": "3 days ago",
    "unread": true
  }
]
```

**`icon`:** A Material Symbols icon name string.  
**`color`:** A Tailwind text color class applied to the icon.

---

### `GET /api/notifications/prefs`
Returns the user's notification preferences.

**Response `200`** — Array of `NotificationPref`:
```json
[
  { "key": "claims",   "label": "Claim Updates",          "enabled": true  },
  { "key": "payments", "label": "Payment Confirmations",  "enabled": true  },
  { "key": "renewals", "label": "Renewal Reminders",      "enabled": true  },
  { "key": "promos",   "label": "Promotional Offers",     "enabled": false }
]
```

---

### `PUT /api/notifications/prefs`
Toggle a single notification preference. Called by `NotificationsPage.jsx` when the user flips a toggle.

**Request Body:**
```json
{
  "key": "promos",
  "enabled": true
}
```

**Response `200`** — Returns the full updated preferences list (same shape as `GET /api/notifications/prefs`).

---

## 9. Config

### `GET /api/config`
Returns system thresholds, feature flags, and health metrics. Used by `ConfigPage.jsx`.

**Response `200`:**
```json
{
  "thresholds": [
    {
      "key": "fraud.high_threshold",
      "value": "0.85",
      "description": "Critical limit for immediate rejection",
      "modified": "2 mins ago",
      "version": "v2.1",
      "highlight": true
    },
    {
      "key": "fraud.auto_reject_score",
      "value": "0.92",
      "description": "Score triggering auto-reject workflow",
      "modified": "14 hrs ago",
      "version": "v2.0",
      "highlight": false
    },
    {
      "key": "claims.review_queue_limit",
      "value": "250",
      "description": "Max claims held in the adjudication queue",
      "modified": "3 days ago",
      "version": "v1.4",
      "highlight": false
    },
    {
      "key": "sanctions.fuzzy_match_tolerance",
      "value": "0.80",
      "description": "Minimum similarity for sanctions list matches",
      "modified": "1 week ago",
      "version": "v1.1",
      "highlight": false
    }
  ],
  "flags": [
    {
      "key": "graph",
      "label": "Tier 3 Graph Analysis",
      "description": "Enables deep-link network parsing for organized fraud detection",
      "enabled": true,
      "badge_icon": "bolt",
      "badge_color": "text-amber-400"
    },
    {
      "key": "auto",
      "label": "Auto-Approval Engine",
      "description": "Automatically adjudicates low-risk claims without human review",
      "enabled": false,
      "badge_icon": null,
      "badge_color": null
    },
    {
      "key": "rag",
      "label": "RAG Evidence Retrieval",
      "description": "Augments fraud analysis with retrieved case precedents via vector store",
      "enabled": true,
      "badge_icon": "electric_bolt",
      "badge_color": "text-indigo-400"
    },
    {
      "key": "drift_alerts",
      "label": "Model Drift Alerts",
      "description": "Sends alerts when fraud model accuracy deviates beyond threshold",
      "enabled": true,
      "badge_icon": null,
      "badge_color": null
    }
  ],
  "health": {
    "latency": "24ms",
    "error_rate": "0.01%",
    "uptime": "99.99%",
    "active_nodes": "12/12"
  }
}
```

---

### `PUT /api/config/{key}`
Update a single config threshold value.

**Path Parameter:** `key` — the config key, e.g. `fraud.high_threshold`

**Request Body** — Full `ConfigEntry` object:
```json
{
  "key": "fraud.high_threshold",
  "value": "0.90",
  "description": "Critical limit for immediate rejection",
  "modified": "just now",
  "version": "v2.2",
  "highlight": false
}
```

**Response `200`** — Returns the updated `ConfigEntry` with `highlight: true`.

---

## 10. Audit

### `GET /api/audit/{claim_id}`
Returns the immutable audit trail for a specific claim. Used by `AuditLogPage.jsx`.

**Path Parameter:** `claim_id`

**Response `200`** — Array of audit events:
```json
[
  {
    "id": "evt-001",
    "claim_id": "clm-xxx",
    "actor": "system",
    "action": "claim_created",
    "timestamp": "2025-02-22T09:00:00Z",
    "metadata": {}
  },
  {
    "id": "evt-002",
    "claim_id": "clm-xxx",
    "actor": "layer_3_fraud",
    "action": "fraud_score_computed",
    "timestamp": "2025-02-22T09:00:03Z",
    "metadata": { "score": 0.84 }
  }
]
```

---

## 11. Auth (Stub)

### `POST /api/auth/login`
Placeholder. In production this will be handled by the Supabase SDK directly on the frontend. See below.

### Current Demo Authentication Flow
Currently, the application uses a mock authentication flow in `LoginPage.jsx` and `AuthContext.jsx`. It intercepts the login and sets the session in `sessionStorage` without contacting a backend.

**Valid Demo Accounts:**
- `customer@lexora.demo` (Customer role)
- `admin@lexora.demo` (Admin role)
- `demo@lexora.com` (Customer role)

**Demo OTP:** Any 6 digits (e.g., `123456`)

### Planned OTP Auth Flow (Frontend → Supabase Direct)

When real authentication is implemented, **no backend route is needed** for login. The frontend will use the Supabase JS SDK directly to send and verify an OTP:

```javascript
// Step 1: Send OTP to email
await supabase.auth.signInWithOtp({ email: 'user@example.com' })

// Step 2: User enters the 6-digit code
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456',
  type: 'email'
})
// data.session.access_token is now available
```

Once the user is logged in, every backend request should include:
```
Authorization: Bearer <supabase_access_token>
```

The FastAPI backend will then validate this JWT using the Supabase JWT secret to identify the user and scope database queries accordingly (e.g., `WHERE user_id = <decoded_user_id>`).

---

## Common Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request (invalid action, malformed body) |
| `404` | Resource not found |
| `500` | Server error (check backend logs) |

## Claim Status Values

| Value | Meaning |
|---|---|
| `pending` | Just submitted, awaiting pipeline |
| `under_review` | Flagged for human review |
| `approved` | Claim approved and being processed |
| `denied` | Claim rejected |
