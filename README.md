<p align="center">
  <img src="lexora-logo.png" alt="Lexora Logo" width="120" />
</p>

# Lexora — Intelligent Insurance Claims Processing Engine

![CI](https://github.com/YOUR_ORG/lexora/actions/workflows/ci.yml/badge.svg)

Lexora is an end-to-end AI-powered insurance claims processing platform. It automates the full lifecycle from document upload through fraud detection to final decision, surfacing results to both admin underwriters and policyholders through a live React dashboard.

**Tech stack at a glance:** React 18 + Vite (frontend) · FastAPI + Python (backend) · Supabase PostgreSQL (database) · n8n (L1 AI extraction workflow) · Groq (chat assistant) · Tailwind CSS v3

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
| **L3** | Fraud Engine | 3-tier: duplicate check, vector similarity, graph analysis |
| **L4** | Risk Fusion | Expected loss model with threshold-based decision routing |

---

## Project Structure

```
lexora/
├── database/
│   ├── schema.sql              # Full Supabase schema (tables, enums, RLS)
│   └── seed.sql                # Demo data for local testing
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Pydantic settings (reads .env)
│   ├── database.py             # Supabase client singleton
│   ├── models.py               # All Pydantic request/response schemas
│   ├── state_machine.py        # Claim lifecycle state validation
│   ├── requirements.txt        # Python dependencies (all pinned)
│   ├── routes/
│   │   ├── claims.py           # Claim CRUD + pipeline triggers
│   │   ├── customer.py         # Customer-facing policy + claim endpoints
│   │   ├── dashboard.py        # Admin dashboard summary + fraud hotspots
│   │   ├── chat.py             # AI chat assistant (Groq tool-calling)
│   │   └── webhooks.py         # n8n extraction webhook receiver
│   ├── engines/
│   │   ├── policy_engine.py    # Layer 2
│   │   ├── fraud_engine.py     # Layer 3 (3-tier, fail-open)
│   │   └── risk_fusion.py      # Layer 4
│   └── services/
│       └── audit.py            # Append-only audit event logger
├── frontend/
│   ├── package.json
│   ├── vite.config.js          # Dev server + proxy: /api → http://127.0.0.1:8000
│   ├── tailwind.config.js      # Tailwind CSS v3 theme (colors, fonts)
│   ├── .env.example            # Frontend env template
│   └── src/
│       ├── index.css           # Design system (Tailwind directives + CSS vars)
│       ├── hooks/useFetch.js   # Polling GET hook (auto-refresh every N ms)
│       ├── context/AuthContext.jsx
│       └── pages/
│           ├── admin/          # Dashboard, Claims, ThreatFeed, Chat, Settings
│           └── customer/       # Portal, Renewal
├── docs/
│   ├── SOLUTION.md             # Architecture & product overview
│   ├── AGENTS.md               # AI agent entry point
│   └── context/                # Compressed reference docs for AI agents
├── tests/                      # Integration test scripts
├── docker-compose.yml
├── install.sh                  # First-time backend setup (Mac/Linux)
├── install.ps1                 # First-time backend setup (Windows PowerShell)
├── .env.example                # Backend env template
└── README.md
```

---

## Prerequisites

| Tool | Version | Mac/Linux | Windows |
|------|---------|-----------|---------|
| **Python** | 3.11 or 3.12 | `brew install python@3.12` | [python.org/downloads](https://python.org/downloads) — tick "Add to PATH" during install |
| **Node.js** | 18+ | `brew install node` | [nodejs.org](https://nodejs.org) — LTS installer |
| **Git** | Any | `brew install git` | [git-scm.com](https://git-scm.com) |
| **Supabase project** | — | [supabase.com](https://supabase.com) — free tier is enough | same |

> **Windows users:** If `python` isn't recognised in PowerShell after installing, restart your terminal. You may also need to set the execution policy once: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

## Quick Start

### 1. Clone and configure environment

**Mac/Linux**
```bash
git clone https://github.com/kr1shnasomani/lexora.git
cd lexora
cp .env.example .env
```

**Windows (PowerShell)**
```powershell
git clone https://github.com/kr1shnasomani/lexora.git
cd lexora
Copy-Item .env.example .env
```

Open `.env` and fill in at minimum:
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
GROQ_API_KEY=your_groq_key
```
All other keys are optional — the fraud engine is fail-open and works without them.

---

### 2. Set up the database

1. Go to your **Supabase project → SQL Editor**
2. Paste and run `database/schema.sql` — creates all tables, enums, and RLS policies
3. Paste and run `database/seed.sql` — inserts demo users, policies, and sample claims

---

### 3. Install and start the backend

**Mac/Linux** (run from project root)
```bash
bash install.sh
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 --reload-exclude venv
```

**Windows** (run from project root in PowerShell)
```powershell
.\install.ps1
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000 --reload-exclude venv
```

> `install.sh` / `install.ps1` creates a virtual environment in `backend/venv` and handles a known `grpcio` build issue on Python 3.12+ by installing it as a pre-built binary wheel before the rest of the dependencies. Do **not** run a plain `pip install -r requirements.txt` — it will fail on most machines for this reason.

---

### 4. Install and start the frontend

**Mac/Linux**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

**Windows (PowerShell)**
```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

---

### 5. Open the app

Navigate to **http://localhost:5173**

---

## Docker (Easiest — same on all platforms)

If you have Docker Desktop installed this is the quickest path, especially on Windows:

```bash
cp .env.example .env   # fill in Supabase + Groq keys
docker-compose up --build
```

This starts:
- Backend at `http://localhost:8000`
- Frontend at `http://localhost:5173`
- n8n at `http://localhost:5678`

---

## Demo Accounts

Authentication is mock-only. Enter any of the emails below with any **6-digit OTP** to log in.

| Role | Email |
|------|-------|
| Admin | `vikram.singh@insurer.com` |
| Underwriter | `ananya.rao@insurer.com` |
| Customer | `rahul.mehta@gmail.com` |
| Customer | `priya.s@gmail.com` |

---

## Environment Variables

### Backend (`backend/.env` or root `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ | Service role key (full DB access) |
| `SUPABASE_ANON_KEY` | ✅ | Anon key (public read) |
| `GROQ_API_KEY` | ✅ | Chat assistant + audio transcription |
| `OPENROUTER_API_KEY` | Optional | n8n LLM extraction fallback |
| `GOOGLE_GEMINI_API_KEY` | Optional | n8n video analysis |
| `COHERE_API_KEY` | Optional | L3 Tier 2 text embeddings |
| `QDRANT_URL` | Optional | L3 Tier 2 vector store |
| `QDRANT_API_KEY` | Optional | Qdrant authentication |
| `NEO4J_URI` | Optional | L3 Tier 3 graph analysis |
| `NEO4J_USER` | Optional | Neo4j username |
| `NEO4J_PASSWORD` | Optional | Neo4j password |
| `JINA_API_KEY` | Optional | L3 multimodal doc embeddings |
| `FRAUD_LAYER3_ENABLE_QDRANT` | — | `true`/`false` — default `false` |
| `FRAUD_LAYER3_ENABLE_NEO4J` | — | `true`/`false` — default `false` |
| `FRAUD_LAYER3_ENABLE_JINA_MEDIA` | — | `true`/`false` — default `false` |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/claims` | List all claims (`?status=` filter) |
| `GET` | `/api/claims/{id}` | Claim detail + audit trail + documents |
| `POST` | `/api/claims` | Create a new claim |
| `POST` | `/api/claims/{id}/run-all` | Full pipeline (L2→L3→L4) |
| `POST` | `/api/claims/{id}/run-policy` | Run policy engine only |
| `POST` | `/api/claims/{id}/run-fraud` | Run fraud engine only |
| `POST` | `/api/claims/{id}/decide` | Run decision engine only |
| `POST` | `/api/claims/{id}/manual-review` | Human override |
| `GET` | `/api/dashboard/summary` | Admin KPIs, queue, alerts, fraud hotspots |
| `GET` | `/api/customer/policies` | Customer policies (`?email=`) |
| `POST` | `/api/chat` | AI chat assistant message |
| `POST` | `/api/webhooks/n8n-extraction` | n8n callback endpoint |

Interactive API docs: **http://localhost:8000/docs**

---

## Docker (Alternative)

```bash
# From repo root
cp .env.example .env  # fill in values first
docker-compose up --build
```

Starts backend (:8000), frontend (:5173), and n8n (:5678).

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

## Key Design Decisions

1. **Backend owns all state transitions** — n8n sends data via webhook; backend manages lifecycle
2. **Audit events are append-only** — every stage logs start/complete/fail events
3. **Policy rules stored in DB** — versioned JSON DSL, no hardcoded logic in code
4. **Fraud engine is fail-open** — if Qdrant/Neo4j/Jina are offline, Tier 1 result is used
5. **Expected loss model for decisions** — `fraud_score × claimed_amount` vs investigation cost
6. **Idempotency keys** — prevents duplicate claim creation on retries

---

## CI / CD

Two GitHub Actions workflows live in `.github/workflows/`.

| Workflow | Trigger | What it does |
|----------|---------|---------------|
| `ci.yml` | Push / PR → `main`, `develop` | Lint backend (ruff) · Run Layer 2 unit tests (fully mocked, no external services) · Build frontend (Vite) · Docker build-check on PRs |
| `cd.yml` | Push → `main` | Runs CI gate, then builds and pushes `backend` and `frontend` images to **GitHub Container Registry** (`ghcr.io/YOUR_ORG/lexora`) |

> **Replace `YOUR_ORG`** in the badge URL at the top of this file and in `cd.yml` `IMAGE_BASE` with your actual GitHub username / organisation once the repo is created.

### Secrets required

No secrets are needed for the CI jobs (L2 tests are mocked). The CD job uses `GITHUB_TOKEN` (auto-provided by GitHub) to push images to GHCR. To enable the optional deployment step in `cd.yml`, add `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_SSH_KEY` as repository secrets.

### Running tests locally

```bash
# Layer 2 — fully mocked, no services needed
python tests/test_layer2.py

# Layer 3 — requires live Supabase + FastAPI server running on :8000
python tests/test_layer3.py

# Layer 3 staged cloud integration (Qdrant / Neo4j / Jina)
python tests/test_layer3.py --pass2

# Layer 4 — requires live Supabase
python tests/test_layer4.py
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `grpcio` install fails | Run `bash install.sh` (Mac/Linux) or `.\install.ps1` (Windows) from the **project root**, not `pip install` directly |
| PowerShell says "cannot be loaded because running scripts is disabled" | Run once: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `python` not found on Windows | Reinstall Python and tick "Add Python to PATH", then restart terminal |
| Map not showing in Threat Feed | Ensure the backend is running — the map pulls live data from `/api/dashboard/summary` |
| Frontend shows CORS errors | Check `CORS_ORIGINS` in `.env` includes `http://localhost:5173` |
| OTP login not working | Any 6-digit code is accepted — auth is mock-only |
| Supabase queries return 0 rows | Re-run `database/seed.sql` in the Supabase SQL Editor |
| `venv` activation fails on Windows | Use PowerShell, not CMD: `.\venv\Scripts\Activate.ps1` |
