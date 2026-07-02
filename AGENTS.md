<p align="center">
  <img src="frontend/public/lexora-logo.png" alt="Lexora Logo" width="100" />
</p>

# Lexora — Agent Quickstart

**Lexora** is a 5-layer neuro-symbolic AI insurance claims processing engine. It takes raw claim documents (via n8n), extracts structured data (L1), validates against policy rules (L2), scores for fraud with vector + graph AI (L3), applies economic decision logic (L4), and stores everything in Supabase with full audit trails. The frontend is a React 18 + Vite admin and customer portal.

---

## Architecture at a Glance

| Layer | Name | Entry Point | Output |
|---|---|---|---|
| L1 | Perception | `POST /api/webhooks/n8n-extraction` | Claim created, status=`extracted` |
| L2 | Policy Engine | `evaluate_policy(claim_id)` | `claims.policy_decision` JSONB |
| L3 | Fraud Detection | `run_fraud_check(claim_id)` | `claims.fraud_score` + `fraud_analysis` |
| L4 | Risk Fusion | `run_decision(claim_id)` | `claims.final_decision` + `decision_output` |
| L5 | Feedback Loop | Manual review endpoints | `feedback` table, retraining signals |

Pipeline triggers automatically: L1 webhook → `trigger_pipeline()` → L2 → L3 → L4.

---

## Codebase Map

```
backend/
  main.py              FastAPI app, router mounts, startup sweeper
  config.py            pydantic_settings (reads .env)
  database.py          get_supabase() singleton
  models.py            All Pydantic schemas
  state_machine.py     validate_transition() / enforce_transition()
  routes/
    claims.py          /api/claims — CRUD + pipeline triggers
    webhooks.py        /api/webhooks — n8n L1 intake
    customer.py        /api/customer/* — customer-scoped endpoints
    dashboard.py       /api/dashboard/summary
    auth.py            /api/auth/verify-email
    chat.py            /api/chat/* — Groq tool-calling chat
    analytics.py       /api/analytics/summary
    network.py         /api/network/graph (Neo4j)
    settings.py        /api/config, /api/policies, /api/users
    pdf_export.py      /api/claims/{id}/export-pdf
  engines/
    layer2/            policy_engine.py + rule_registry.py
    layer3/            13-file modular fraud engine (main, tier1-3, fusion, clients)
    fraud_engine.py    Thin wrapper → engines/layer3/main.py
    risk_fusion.py     Layer 4 decision engine
    llm_engine.py      GroqEngine (chat tool-calling)
  services/
    audit.py           log_audit_event(), AuditTimer
  scripts/
    run_layer2_batch.py
    run_layer3_batch.py

frontend/src/
  App.jsx              Router (/ /login /admin/* /customer/*)
  index.css            Tailwind v3 base/components/utilities directives
  contexts/
    AuthContext.jsx    Mock auth (localStorage), useAuth() hook
  hooks/
    useFetch.js        GET hook → { data, loading, error, refetch }
  pages/admin/         DashboardPage ClaimsQueuePage AnalyticsPage NetworkGraphPage
                       ThreatFeedPage AuditLogPage ConfigPage
  pages/customer/      HomePage PoliciesPage PolicyDetailPage ClaimsPage ClaimStatus
                       FileClaimPage ChatPage NotificationsPage ProfilePage RenewalPage
  components/admin/    Sidebar TopHeader ChatAssistant AdminGlobalOverlay
  components/customer/ Header BottomNav CustomerAssistant CustomerClaimsPanel
  components/shared/   ProtectedRoute ErrorToast Skeleton

database/
  schema.sql           All DDL (9 tables, 6 ENUMs, triggers)
  seed.sql             Demo data

docs/
  SOLUTION.md          Full architecture + Mermaid diagrams (deep dives)
  context/
    STACK.md           Tech stack, env vars, ports, boot commands
    PIPELINE.md        Claim lifecycle, state machine, sweeper, n8n
    LAYER_CONTRACTS.md L1–L4 integration contracts (I/O schemas, DB writes)
    FRONTEND.md        Page→endpoint map, auth model, design tokens
    API.md             All endpoints compressed to tables
    SCHEMA.md          All tables/columns (no examples), ENUMs, state machine
```

---

## Critical Invariants

| Rule | Detail |
|---|---|
| **UUID only** | `claims.id` is the sole cross-cutting identifier. Never use `claim_number` or `policy_number` as keys. |
| **State machine** | All `claims.status` transitions go through `state_machine.py`. Invalid transitions raise HTTP 409. |
| **Status ≠ decision** | `claims.status` = lifecycle stage. `claims.final_decision` = outcome. Never conflate. |
| **Audit is immutable** | `audit_events` — no updates, no deletes. |
| **No hardcoded data** | Frontend computes all values from API responses. Use `.reduce()` not static numbers. |
| **Customer scoping** | All `/api/customer/*` endpoints require `?email=` query param from `user.email`. |
| **API base URL** | `VITE_API_URL` is baked into the bundle as a Docker build-arg. For local dev outside Docker, it falls back to `'http://localhost:8000'`. Never hardcode. |
| **Tailwind v3** | Config in `tailwind.config.js`. Custom tokens (colors, fonts, shadows) live there under `theme.extend`. `index.css` uses `@tailwind base/components/utilities` directives. |
| **Mock auth** | `AuthContext.jsx` + `localStorage` (key: `lexora_demo_session`). No Supabase JS SDK. `useAuth()` for `{ user, role }`. |
| **L3 fail-open** | If cloud services fail, fraud engine falls back to local Pass 1. Never blocks pipeline. |

---

## Demo Accounts & Boot
```
vikram.singh@insurer.com  → Admin portal (/admin/*)
ananya.rao@insurer.com    → Admin portal (Underwriter)
rahul.mehta@gmail.com     → Customer portal (has demo data)
priya.s@gmail.com         → Customer portal
OTP: any 6 digits
```

**Start (one command):**
```bash
docker compose up --build
# Frontend → http://localhost:3001
# Backend  → http://localhost:8000
# n8n      → http://localhost:5678
```

**Dev mode (hot-reload):**
```bash
docker compose --profile dev up --build
```

**Individual services:**
```bash
docker compose up backend     # backend only
docker compose up frontend    # frontend only
docker compose up n8n         # n8n only
```

---

## Where to Look for What

| Task | Read |
|---|---|
| Add/modify an API endpoint | `context/API.md` + the relevant `routes/*.py` file |
| Change DB schema | `context/SCHEMA.md` + `database/schema.sql` |
| Modify a pipeline layer | `context/LAYER_CONTRACTS.md` + the engine file |
| Add a frontend page | `context/FRONTEND.md` + `context/API.md` |
| Change config thresholds | `context/SCHEMA.md` (`configuration` table) + `context/LAYER_CONTRACTS.md` L4 |
| Full architecture understanding | `SOLUTION.md` |
| Stack/env/infra | `context/STACK.md` |
