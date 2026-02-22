# Lexora — Project Context & Handoff

> Tag this file in a new agent chat with `@CONTEXT.md` or paste its contents.
> Last updated: 2026-02-22

---

## 1. What Is This Project?

**Lexora** is an AI-powered insurance claim management platform with two portals:
- **Admin Portal** — for insurance company staff to view claims, analytics, fraud network, audit logs, and system config.
- **Customer Portal** — for policyholders to file claims, view policies, track status, manage notifications, and renew policies.

The product has been carefully designed with a **dark, premium, glassmorphism UI** and is production-ready on the frontend. The backend is currently running in simulation mode — the API contracts are all defined and all frontend pages are wired up; you just need to plug in real Supabase queries when the database is seeded.

---

## 2. Repository Structure

```

-── lexora/
    ├── backend/                  # Python / FastAPI
    │   ├── app/
    │   │   ├── main.py           # FastAPI entrypoint, all routers registered
    │   │   ├── core/
    │   │   │   ├── settings.py   # ← simulation_mode flag here
    │   │   │   └── logging.py
    │   │   ├── contracts/        # Pydantic schemas (the API contract)
    │   │   │   ├── claims.py
    │   │   │   ├── dashboard.py
    │   │   │   ├── user.py
    │   │   │   ├── analytics.py
    │   │   │   ├── network.py
    │   │   │   └── notifications.py
    │   │   ├── routes/           # All FastAPI route handlers
    │   │   │   ├── health.py
    │   │   │   ├── auth.py
    │   │   │   ├── dashboard.py  → GET /api/dashboard/summary
    │   │   │   ├── claims.py     → POST /api/claims, GET /api/claims, GET /api/claims/{id}
    │   │   │   ├── config.py     → GET /api/config, PUT /api/config
    │   │   │   ├── audit.py      → GET /api/audit/{claim_id}
    │   │   │   ├── user.py       → GET /api/user/profile, GET /api/policies, GET /api/policies/{id}
    │   │   │   ├── analytics.py  → GET /api/analytics/summary
    │   │   │   ├── network.py    → GET /api/network/graph
    │   │   │   └── notifications.py → GET /api/notifications, GET/PUT /api/notifications/prefs
    │   │   ├── db/
    │   │   │   └── queries.py    # Supabase query functions (currently returns mock data)
    │   │   ├── gateway/
    │   │   │   └── dashboard_view.py  # Assembles dashboard summary
    │   │   └── layers/           # AI/ML layer stubs (orchestration, fraud detection, etc.)
    │   └── .env                  # SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
    │
    ├── frontend/                 # React + Vite
    │   ├── src/
    │   │   ├── lib/
    │   │   │   ├── api.js        # Central HTTP client (all fetch calls go through this)
    │   │   │   └── supabase.js   # Supabase client (initialized, not yet used for auth)
    │   │   ├── hooks/
    │   │   │   └── useFetch.js   # Data fetching hook — skeleton on first load, silent poll after
    │   │   ├── components/
    │   │   │   ├── admin/        # Sidebar, TopHeader
    │   │   │   ├── customer/     # Header, BottomNav
    │   │   │   └── shared/
    │   │   │       ├── Skeleton.jsx    # Reusable loading skeletons
    │   │   │       └── ErrorToast.jsx  # Red themed error toast (bottom-right)
    │   │   ├── pages/
    │   │   │   ├── ModeSelectionPage.jsx        ✅ Routing altered → points to /login
    │   │   │   ├── LoginPage.jsx                ✅ Active (Demo credentials flow)
    │   │   │   ├── admin/
    │   │   │   │   ├── DashboardPage.jsx        ✅ API wired → GET /api/dashboard/summary
    │   │   │   │   ├── ClaimsQueuePage.jsx      ⚠️  Still uses some mock data
    │   │   │   │   ├── AuditLogPage.jsx         ⚠️  Still uses some mock data
    │   │   │   │   ├── ConfigPage.jsx           ⚠️  Still uses some mock data
    │   │   │   │   ├── AnalyticsPage.jsx        ✅ API wired → GET /api/analytics/summary
    │   │   │   │   ├── NetworkGraphPage.jsx     ✅ API wired → GET /api/network/graph
    │   │   │   │   └── ThreatFeedPage.jsx       ⚠️  Still uses some mock data
    │   │   │   └── customer/
    │   │   │       ├── HomePage.jsx             ✅ API wired
    │   │   │       ├── FileClaimPage.jsx        ✅ API wired (POST + GET policies)
    │   │   │       ├── ClaimResultPage.jsx      ✅ API wired
    │   │   │       ├── ClaimsPage.jsx           ⚠️  Still uses mock data
    │   │   │       ├── PoliciesPage.jsx         ✅ API wired
    │   │   │       ├── PolicyDetailPage.jsx     ✅ API wired
    │   │   │       ├── ProfilePage.jsx          ✅ API wired
    │   │   │       ├── NotificationsPage.jsx    ✅ API wired (GET + PUT prefs)
    │   │   │       ├── DocsPage.jsx             ✅ API wired (docs derived from policies)
    │   │   │       ├── RenewalPage.jsx          ✅ API wired
    │   │   │       ├── ExplorePage.jsx          ✅ Static marketing — intentionally no API
    │   │   │       ├── ChatPage.jsx             ✅ Static — Dify integration track (separate)
    │   │   │       └── SecurityPage.jsx         ✅ Static — pending Auth implementation
    │   │   └── index.css         # Tailwind base, custom CSS variables, keyframe animations
    │   ├── .env                  # VITE_API_URL=http://localhost:8000
    │   └── vite.config.js
    │
    └── SCHEMA.md                 # Full Supabase database schema (source of truth)
```

---

## 3. Key Architecture Rules

### API-Shape-First Strategy
The backend runs in **simulation mode** — every route returns perfectly-shaped mock data matching the Pydantic schema, but without touching the real database. This means:

- All frontend API calls are **real HTTP requests** beating against `http://localhost:8000`
- When you flip `simulation_mode = False` in `backend/app/core/settings.py`, **the frontend changes nothing** — you only add the actual Supabase queries in the Python backend

### The One Switch
```python
# backend/app/core/settings.py
simulation_mode: bool = True   # ← flip to False when Supabase is seeded
```

### Frontend Data Flow
```
Page Component
  → useFetch('/api/some-endpoint', pollIntervalMs?)
    → api.js (fetch wrapper, base URL from VITE_API_URL)
      → FastAPI backend
        → simulation data (or Supabase when mode = False)
      → returns JSON
    → { data, loading, error, refetch }
  → Skeleton shown while loading=true on first load
  → ErrorToast shown if error
  → Data rendered into UI
```

---

## 4. All Backend API Endpoints (Current)

| Method | Path | Status | Purpose |
|--------|------|--------|---------|
| GET | `/api/health` | ✅ Live | Health check |
| GET | `/api/dashboard/summary` | ✅ Sim | Admin dashboard KPIs, priority queue, threat alerts |
| POST | `/api/claims` | ✅ Sim | Submit a new claim |
| GET | `/api/claims` | ✅ Sim | List all claims (admin) |
| GET | `/api/claims/{id}` | ✅ Sim | Get single claim detail |
| POST | `/api/claims/{id}/action` | ✅ Sim | Approve / reject / escalate claim |
| GET | `/api/audit/{claim_id}` | ✅ Sim | Get audit trail for a claim |
| GET | `/api/config` | ✅ Sim | System config + feature flags |
| PUT | `/api/config` | ✅ Sim | Update config values |
| GET | `/api/user/profile` | ✅ Sim | Logged-in user's profile |
| GET | `/api/policies` | ✅ Sim | List policies (supports `?status=active`, `?page_size=N`) |
| GET | `/api/policies/{id}` | ✅ Sim | Policy detail |
| GET | `/api/analytics/summary` | ✅ Sim | KPIs, drift metrics, heatmap, trajectory |
| GET | `/api/network/graph` | ✅ Sim | Fraud network nodes + edges |
| GET | `/api/notifications` | ✅ Sim | Notification feed |
| GET | `/api/notifications/prefs` | ✅ Sim | Notification preferences |
| PUT | `/api/notifications/prefs` | ✅ Sim | Update notification preference |

---

## 5. What Is NOT Done Yet (Immediate Next Steps)

### Priority 1 — Database / Backend
- [ ] Seed Supabase schema (refer to `lexora/SCHEMA.md`)
- [ ] Set `simulation_mode = False` in `settings.py`
- [ ] Write real Supabase queries in `backend/app/db/queries.py` for each route
- [ ] Scope `GET /api/policies` and `GET /api/claims` by the logged-in user's ID once auth tokens are available

### Priority 2 — Authentication (Real Supabase Flow)
Currently, `LoginPage.jsx` and `AuthContext.jsx` provide a **demo login flow** using predefined emails (`customer@lexora.demo`, `admin@lexora.demo`) and fake OTP (`123456`), saving to `sessionStorage`. To make this real:

- [ ] Wire `LoginPage.jsx` to Supabase Auth OTP calls
  - **Send OTP:** `supabase.auth.signInWithOtp({ email })`
  - **Verify OTP:** `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- [ ] Ensure `<ProtectedRoute>` (already active) pulls `user` and `role` correctly from the real Supabase session in `AuthContext`
- [ ] Update `api.js` to inject the Supabase `access_token` as `Authorization: Bearer <token>` header on every request
- [ ] Update FastAPI backend to read and verify the JWT token from request headers (so routes know which user is calling)

### Priority 3 — Admin Pages with Remaining Mock Data
These pages still need API wiring (lower priority, they work fine for demo):
- `ClaimsQueuePage.jsx` — needs `GET /api/claims` with pagination + filtering
- `AuditLogPage.jsx` — needs `GET /api/audit/{claim_id}`
- `ConfigPage.jsx` — save button needs to call `PUT /api/config`
- `ThreatFeedPage.jsx` — needs a `GET /api/threats` endpoint (not yet built)

### Priority 4 — Customer ClaimsPage
- `ClaimsPage.jsx` — still uses mock claim list; needs `GET /api/claims?user_id={me}` once auth scoping is done

---

## 6. How to Run the App

```bash
# Terminal 1 — Backend
cd lexora/backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd lexora/frontend
npm run dev          # runs on http://localhost:5173
```

The backend `.env` file needs (currently empty stubs, just set if Supabase is seeded):
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The frontend `.env` file already has:
```
VITE_API_URL=http://localhost:8000
```

---

## 7. Design System Tokens (Important for any new UI work)

| Token | Value | Usage |
|---|---|---|
| `bg-background-dark` | `#0A0A0C` | Page background |
| `bg-surface-dark` | `#111115` | Admin card bg |
| `bg-surface-dark-customer` | `#18181b` | Customer card bg |
| `border-surface-border` | `#27272a` | All card borders |
| `text-primary` / `bg-primary` | `#E83049` | Brand red / CTA |
| Font | `Inter` (display) | Loaded via Google Fonts |
| Icons | `Material Symbols Outlined` | Loaded via Google Fonts |

---

## 8. Database Schema Reference

The full schema is in `lexora/SCHEMA.md`. Key tables:
- `users` — policyholder profiles
- `policies` — insurance policies linked to users
- `claims` — submitted claims linked to policies and users
- `audit_events` — immutable log of all actions taken on claims
- `notifications` — per-user notification feed items
- `notification_prefs` — per-user notification preference settings

---

## 9. AI / Layer Architecture (Backend)

The `backend/app/layers/` directory contains stubs for:
- **Layer 1** — Claim ingestion and initial validation
- **Layer 2** — Feature extraction and risk scoring
- **Layer 3** — Fraud detection ML model inference
- **Layer 4** — Decision recommendation (approve/reject/escalate)
- **Layer 5** — Audit trail writing and active learning feedback loop

These are currently stubbed out. The orchestrator in `backend/app/orchestrator/` ties them together and is called by the claims route when a claim is submitted.

---

## 10. Key Design Decisions (Do Not Break These)

1. **Never hardcode data in the frontend.** All data must come from `useFetch()` or `api.post()`.
2. **The Pydantic schema is the contract.** Adding a new field to a page means first adding it to the Pydantic model in `backend/app/contracts/`, then the route, then the frontend.
3. **Skeleton-first loading.** Use `<Skeleton>` components from `src/components/shared/Skeleton.jsx` while `loading` is true. Never show empty content during load.
4. **All errors use `<ErrorToast>`.** Import from `src/components/shared/ErrorToast.jsx`. Never use `alert()` or plain text error messages.
5. **`simulation_mode` is the only switch.** When ready for real data, flip this and write Supabase queries. Do NOT change any frontend file.
