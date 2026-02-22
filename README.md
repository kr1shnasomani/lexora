# 🏥 Lexora — Intelligent Insurance Claims Processing Engine

> End-to-end AI-powered insurance claims processing system with multi-tier fraud detection, policy engine, and risk fusion decision-making.

---

## 🏗️ Architecture

```
┌──────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────┐
│ Frontend │───▶│  Backend   │───▶│  Supabase DB │    │   n8n    │
│ (React)  │    │  (FastAPI) │    │  (PostgreSQL)│    │ Layer 1  │
└──────────┘    └────────────┘    └──────────────┘    └────┬─────┘
                     │                                      │
              ┌──────┼──────┐                               │
              ▼      ▼      ▼                               │
         ┌────────┐┌──────┐┌──────┐            Webhook ────▶│
         │ Policy ││Fraud ││Risk  │
         │ Engine ││Engine││Fusion│
         │  (L2)  ││ (L3) ││ (L4) │
         └────────┘└──────┘└──────┘
```

### Processing Pipeline

| Layer | Component | Description |
|-------|-----------|-------------|
| **L1** | n8n Extraction | Multi-format AI extraction (image, PDF, audio, video) |
| **L2** | Policy Engine | Deterministic rule evaluation against versioned policy rules |
| **L3** | Fraud Engine | 3-tier: duplicate check, similarity analysis, graph analysis |
| **L4** | Risk Fusion | Expected loss model with threshold-based decision routing |

---

## 📁 Project Structure

```
lexora2/
├── database/
│   ├── schema.sql          # Full Supabase schema (9 tables, 6 enums)
│   └── seed.sql            # Sample data for demo
├── backend/
│   ├── main.py             # FastAPI application
│   ├── config.py           # Environment-based config
│   ├── database.py         # Supabase client
│   ├── models.py           # Pydantic schemas
│   ├── state_machine.py    # Claim lifecycle enforcement
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routes/
│   │   ├── claims.py       # All claim endpoints
│   │   └── webhooks.py     # n8n webhook receiver
│   ├── engines/
│   │   ├── policy_engine.py   # Layer 2
│   │   ├── fraud_engine.py    # Layer 3 (3-tier)
│   │   └── risk_fusion.py     # Layer 4
│   └── services/
│       └── audit.py        # Audit logging
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── index.css       # Design system
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Upload.jsx
│           └── ClaimDetail.jsx
├── n8n-workflow.json           # n8n extraction workflow
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase project (already provisioned)

### 1. Setup Environment

```bash
cd lexora2
cp .env.example .env
# Edit .env with your Supabase keys
```

### 2. Setup Database

Go to your Supabase SQL Editor and run:

1. `database/schema.sql` — creates all tables
2. `database/seed.sql` — inserts demo data

### 3. Start Backend

```bash
cd backend
python -m venv venv
# On Windows CMD: venv\Scripts\activate
# On Bash/macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Open Browser

Navigate to **http://localhost:5173**

---

## 🎮 Demo Walkthrough

### What Buttons to Click

1. **Dashboard** — See all claims with status badges and fraud scores
2. **Click on "CLM-2026-000045"** — Open the extracted (but not processed) claim
3. **Click "🚀 Run Full Pipeline"** — This runs Policy → Fraud → Decision in sequence
4. **Switch tabs**: Policy, Fraud, Decision, Audit Trail — see all results
5. **Upload page** — Create a new claim
6. **If claim ends in "under_review"** — Click "👤 Manual Review" to approve/reject

### State Machine Flow

```
submitted → extracting → extracted → policy_evaluating → fraud_checking → deciding → finalized
                                                                              ↓
                                                                         under_review
                                                                              ↓
                                                                      fraud_investigation
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/claims` | List all claims (optional `?status=` filter) |
| `GET` | `/api/claims/{id}` | Get claim detail + audit trail + documents |
| `POST` | `/api/claims` | Create a new claim |
| `POST` | `/api/claims/{id}/run-policy` | Run policy engine (L2) |
| `POST` | `/api/claims/{id}/run-fraud` | Run fraud engine (L3) |
| `POST` | `/api/claims/{id}/decide` | Run decision engine (L4) |
| `POST` | `/api/claims/{id}/run-all` | Run full pipeline (L2→L3→L4) |
| `POST` | `/api/claims/{id}/manual-review` | Human override |
| `GET` | `/api/claims/{id}/audit` | Get audit trail |
| `POST` | `/api/webhooks/n8n-extraction` | n8n callback endpoint |
| `GET` | `/api/policies` | List policies |
| `GET` | `/api/users` | List users |

API docs available at **http://localhost:8000/docs** (Swagger UI)

---

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (full access) |
| `CORS_ORIGINS` | Allowed CORS origins |
| `OPENROUTER_API_KEY` | For n8n LLM extraction |
| `GROQ_API_KEY` | For audio transcription |
| `GOOGLE_GEMINI_API_KEY` | For video analysis |

---

## 🐳 Docker (Alternative)

```bash
docker-compose up --build
```

This starts backend (:8000), frontend (:5173), and n8n (:5678).

---

## 📊 Key Design Decisions

1. **Backend handles all state transitions** — n8n sends data via webhook, backend manages lifecycle
2. **Audit events are append-only** — every stage logs start/complete/fail events
3. **Policy rules are stored in DB** — versioned JSON DSL, no hardcoded logic
4. **Fraud engine uses 3 weighted tiers** — configurable weights in `configuration` table
5. **Expected loss model for decisions** — `fraud_score × claimed_amount` vs investigation cost
6. **Idempotency keys** — prevents duplicate claim creation on retries
