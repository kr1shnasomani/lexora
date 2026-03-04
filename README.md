<p align="center">
  <img src="lexora-logo.png" alt="Lexora Logo" width="120" />
</p>

<h1 align="center">Lexora</h1>
<p align="center">Intelligent Insurance Claims Processing Engine</p>

<p align="center">
  <a href="https://github.com/kr1shnasomani/lexora/actions/workflows/ci.yml">
    <img src="https://github.com/kr1shnasomani/lexora/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <img src="https://img.shields.io/badge/Python-3.14-blue?logo=python&logoColor=white" alt="Python 3.14" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v3-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

---

Lexora is an end-to-end AI-powered insurance claims platform. It automates the full claim lifecycle — from document upload through fraud detection to final decision — and surfaces results to both admin underwriters and policyholders via a live React dashboard.

---

## Architecture

```
┌──────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────┐
│ Frontend │───▶│  Backend   │───▶│  Supabase DB │    │   n8n    │
│ (React)  │    │  (FastAPI) │    │  (PostgreSQL)│    │ Layer 1  │
└──────────┘    └────────────┘    └──────────────┘    └────┬─────┘
                     │                                      │
              ┌──────┼──────┐                    Webhook ───┘
              ▼      ▼      ▼
         ┌────────┐┌──────┐┌──────┐
         │ Policy ││Fraud ││Risk  │
         │ Engine ││Engine││Fusion│
         │  (L2)  ││ (L3) ││ (L4) │
         └────────┘└──────┘└──────┘
```

| Layer | Component | Description |
|-------|-----------|-------------|
| **L1** | n8n Extraction | Multi-format AI extraction (image, PDF, audio, video) |
| **L2** | Policy Engine | Deterministic rule evaluation against versioned policy rules |
| **L3** | Fraud Engine | 3-tier: duplicate check → vector similarity → graph analysis |
| **L4** | Risk Fusion | Expected loss model with threshold-based decision routing |

---

## Project Structure

```
lexora/
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── config.py               # Pydantic settings (reads .env)
│   ├── database.py             # Supabase client singleton
│   ├── models.py               # Pydantic request/response schemas
│   ├── state_machine.py        # Claim lifecycle state validation
│   ├── requirements.txt        # Pinned Python dependencies
│   ├── routes/                 # claims, customer, dashboard, chat, webhooks
│   ├── engines/                # policy_engine, fraud_engine, risk_fusion
│   └── services/audit.py       # Append-only audit event logger
├── frontend/
│   ├── vite.config.js          # Dev proxy: /api → http://127.0.0.1:8000
│   ├── tailwind.config.js      # Design system theme
│   └── src/
│       ├── contexts/           # AuthContext
│       ├── hooks/              # useFetch (polling hook)
│       └── pages/
│           ├── admin/          # Dashboard, Claims, Analytics, ThreatFeed
│           └── customer/       # Portal, Policies, Claims, Renewal
├── database/
│   ├── schema.sql              # Tables, enums, RLS policies
│   └── seed.sql                # Demo users, policies, claims
├── tests/                      # Integration tests per layer
├── docs/                       # Architecture docs + AI agent context
├── docker-compose.yml
├── install.sh                  # First-time setup (Mac/Linux)
├── install.ps1                 # First-time setup (Windows)
└── .env.example                # Backend env template
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.14+ | `brew install python@3.14` / [python.org](https://python.org/downloads) |
| Node.js | 18+ | `brew install node` / [nodejs.org](https://nodejs.org) |
| Git | any | `brew install git` / [git-scm.com](https://git-scm.com) |
| Supabase project | — | [supabase.com](https://supabase.com) — free tier is sufficient |

> **Windows:** If `python` isn't found in PowerShell after installing, restart your terminal. You may also need: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

## Quick Start

### 1 — Clone and configure

```bash
# Mac/Linux
git clone https://github.com/kr1shnasomani/lexora.git
cd lexora
cp .env.example .env
```

```powershell
# Windows (PowerShell)
git clone https://github.com/kr1shnasomani/lexora.git
cd lexora
Copy-Item .env.example .env
```

Fill in `.env` (minimum required keys):

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
GROQ_API_KEY=your_groq_key
```

All other keys are optional — the fraud engine is fail-open and works without them.

### 2 — Set up the database

1. Go to **Supabase → SQL Editor**
2. Run `database/schema.sql` — creates all tables, enums, and RLS policies
3. Run `database/seed.sql` — inserts demo users, policies, and sample claims

### 3 — Start the backend

```bash
# Mac/Linux (from project root)
bash install.sh
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000 --reload-exclude venv
```

```powershell
# Windows (from project root)
.\install.ps1
cd backend; .\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000 --reload-exclude venv
```

> Use `install.sh` / `install.ps1` — **not** `pip install -r requirements.txt` directly. The scripts handle a known `grpcio` build issue on Python 3.12+ by installing a pre-built binary wheel first.

### 4 — Start the frontend

```bash
cd frontend
cp .env.example .env   # Windows: Copy-Item .env.example .env
npm install
npm run dev
```

### 5 — Open the app

**http://localhost:5173**

---

## Docker

The quickest path — especially on Windows:

```bash
cp .env.example .env   # fill in Supabase + Groq keys first
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| n8n | http://localhost:5678 |

---

## Demo Accounts

Enter any email below with any **6-digit OTP** to log in (mock auth).

| Role | Email |
|------|-------|
| Admin | `vikram.singh@insurer.com` |
| Underwriter | `ananya.rao@insurer.com` |
| Customer | `rahul.mehta@gmail.com` |
| Customer | `priya.s@gmail.com` |

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ | Service role key (full DB access) |
| `SUPABASE_ANON_KEY` | ✅ | Anon key (public read) |
| `GROQ_API_KEY` | ✅ | Chat assistant + audio transcription |
| `OPENROUTER_API_KEY` | optional | n8n LLM extraction fallback |
| `GOOGLE_GEMINI_API_KEY` | optional | n8n video analysis |
| `COHERE_API_KEY` | optional | L3 Tier 2 text embeddings |
| `QDRANT_URL` / `QDRANT_API_KEY` | optional | L3 Tier 2 vector store |
| `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` | optional | L3 Tier 3 graph analysis |
| `JINA_API_KEY` | optional | L3 multimodal doc embeddings |
| `FRAUD_LAYER3_ENABLE_QDRANT` | — | `true`/`false` (default `false`) |
| `FRAUD_LAYER3_ENABLE_NEO4J` | — | `true`/`false` (default `false`) |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

---

## API Reference

Interactive docs at **http://localhost:8000/docs**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/claims` | List all claims (`?status=` filter) |
| `GET` | `/api/claims/{id}` | Claim detail + audit trail + documents |
| `POST` | `/api/claims` | Create a new claim |
| `POST` | `/api/claims/{id}/run-all` | Full pipeline (L2 → L3 → L4) |
| `POST` | `/api/claims/{id}/run-policy` | Policy engine only |
| `POST` | `/api/claims/{id}/run-fraud` | Fraud engine only |
| `POST` | `/api/claims/{id}/decide` | Decision engine only |
| `POST` | `/api/claims/{id}/manual-review` | Human override |
| `GET` | `/api/dashboard/summary` | Admin KPIs, queue, alerts, fraud hotspots |
| `GET` | `/api/customer/policies` | Customer policies (`?email=`) |
| `POST` | `/api/chat` | AI chat assistant |
| `POST` | `/api/webhooks/n8n-extraction` | n8n callback endpoint |

---

## Claim State Machine

```
submitted → extracting → extracted → policy_evaluating → fraud_checking → deciding → finalized
                                                                               ↓
                                                                          under_review
                                                                               ↓
                                                                      fraud_investigation
```

---

## CI / CD

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | Push / PR → `main`, `develop` | Lint (ruff) · Layer 2 unit tests · Vite build · Docker build-check |
| `cd.yml` | Push → `main` | CI gate → build + push images to GHCR |

Images are pushed to `ghcr.io/kr1shnasomani/lexora`. No secrets needed for CI — CD uses the auto-provided `GITHUB_TOKEN`.

**Run tests locally:**

```bash
# Layer 2 — no external services needed
python tests/test_layer2.py

# Layer 3 — requires live Supabase + backend on :8000
python tests/test_layer3.py

# Layer 4 — requires live Supabase
python tests/test_layer4.py
```

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Backend owns all state transitions | n8n sends data via webhook; backend manages lifecycle |
| Audit events are append-only | Every stage logs start/complete/fail — full traceability |
| Policy rules stored in DB | Versioned JSON DSL — no hardcoded logic in code |
| Fraud engine is fail-open | If Qdrant/Neo4j/Jina are offline, Tier 1 result is used |
| Expected loss model for decisions | `fraud_score × claimed_amount` vs investigation cost |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `grpcio` install fails | Use `bash install.sh` / `.\install.ps1` — not `pip install` directly |
| PowerShell "scripts disabled" error | Run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `python` not found on Windows | Reinstall Python and tick **"Add Python to PATH"**, then restart terminal |
| Map not showing in Threat Feed | Ensure the backend is running — map pulls from `/api/dashboard/summary` |
| Frontend CORS errors | Add `http://localhost:5173` to `CORS_ORIGINS` in `.env` |

