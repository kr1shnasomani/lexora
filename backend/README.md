# Lexora Backend

This acts as the **contract gateway** between the Next.js frontend and Supabase. Currently running heavily in simulated mode.

## Setup

```bash
# Provide environment variables
cp .env.example .env

# Start with UV
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

## Endpoints Reference

A complete, live Swagger UI exists when the app is running: `http://localhost:8000/docs`

| Method | Path |
| --- | --- |
| `GET` | `/health` |
| `POST` | `/api/auth/session` |
| `GET` | `/api/dashboard/summary` |
| `GET` | `/api/config` |
| `POST` | `/api/claims` |
| `GET` | `/api/claims` |
| `GET` | `/api/claims/{id}` |
| `GET` | `/api/claims/{id}/events` |
| `POST` | `/api/claims/{id}/actions` |

## Frontend Feature Map

Shows page-to-endpoint mappings:
- `DashboardPage` → `GET /api/dashboard/summary`
- `ClaimsQueuePage` → `GET /api/claims`, `GET /api/claims/{id}`
- `AuditLogPage` → `GET /api/claims/{id}/events`
- `ThreatFeedPage` → `GET /api/dashboard/summary` 
- `AnalyticsPage` → `GET /api/dashboard/summary`
- `ConfigPage` → `GET /api/config`
- `FileClaimPage` → `POST /api/claims`
- `ClaimsPage` → `GET /api/claims`
- `AuthContext` → `POST /api/auth/session`
