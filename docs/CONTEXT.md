# Lexora — Project Context Guide

> **Important**: This document serves as the absolute source of truth for the Lexora project. Any LLM analyzing this codebase MUST base its understanding on these architectural decisions, schemas, and nuances.

## 1. Project Overview
**Lexora** is a 5-layer neuro-symbolic AI-powered insurance claims processing engine. It replaces traditional manual claims investigation with an automated, deterministic pipeline capable of extracting data from multi-modal sources (images, PDFs, audio, video), checking it against codified policy logic, scoring it for fraud, and making a fused final risk decision (`auto_approve`, `manual_review`, `fraud_investigation`).

## 2. Tech Stack & Environment
- **Frontend**: React 18+, Vite, React Router DOM, **Tailwind CSS v4** (using `index.css` with `@theme` and `@import "tailwindcss";`), Lucide React.
  - *Location*: `/frontend/`
- **Backend**: Python 3.11+, FastAPI, Pydantic, SQLAlchemy/Supabase Client.
  - *Location*: `/backend/`
- **Database**: Supabase PostgreSQL (utilizing the `pgcrypto` extension for UUIDs). All schemas and seed data are in `/database/`.
- **Orchestration**: n8n workflows (`n8n-workflow.json`), routing webhooks to FastAPI.
- **AI Models**: OpenRouter (GPT/Claude), Groq (Transcription), Google Gemini.

## 3. The 5-Layer Neuro-Symbolic Engine
The system enforces a strict state machine (`submitted` -> `extracting` -> `extracted` -> `policy_evaluating` -> `fraud_checking` -> `deciding` -> `finalized`).
1. **Layer 1 (L1) - Perception & Extraction**: n8n orchestrates incoming files/claims, uses LLMs to parse unstructured data into structured outputs, and hits the FastAPI webhook `/api/webhooks/n8n-extraction`.
2. **Layer 2 (L2) - Policy Engine**: Evaluates the canonical fields against deterministic JSON/YAML rules (`policy_rules` table) tied to the policyholder's contract.
3. **Layer 3 (L3) - Fraud Engine**: Generates a normalized `fraud_score` (0.0 to 1.0) using 3 tiers: Database heuristics (duplicates), Semantic similarity, and Entity Graph Analysis.
4. **Layer 4 (L4) - Risk Fusion**: Reaches a final outcome combining L2 & L3 outcomes with financial impact matrices (Expected Loss). Outcomes are: `auto_approve`, `manual_review`, `fraud_investigation`, `auto_reject`.
5. **Layer 5 (L5) - Feedback Loop (Continuous Learning)**: Human reviewers correct/override decisions, saving append-only logs via `audit_events` and signals via `feedback`.

## 4. Crucial Implementation Details & Nuances

### Database & Identifiers
- `claims.id` (UUID format via `gen_random_uuid()`) is the **ONLY** internal identifier you should use across PostgreSQL relations, API routes, or Vector Stores. Do NOT use `claim_number` or `policy_number` as keys.
- The `claims.status` column strictly dictates the pipeline's lifecycle stage. The `claims.final_decision` column indicates the eventual outcome. They are strictly separate.

### Authentication & Routing
- *There is NO real Supabase Auth currently implemented.* Authentication is intentionally mocked in `frontend/src/context/AuthContext.jsx` for ease of development. 
- You can log into roles using predefined emails: 
  - Admin/Reviewer: `admin@lexora.com`
  - Customer: `johndoe@example.com` (has active demo policies) or `customer@demo.com` (empty state).
- The routing strictly separates Admin portal (`/admin/*`) and Customer portal (`/customer/*`).

### Frontend Connections
- The frontend has recently undergone a massive layout modernization (fixing overlaps, migrating to Tailwind v4, utilizing responsive grids).
- **No Mock Data**: All frontend numeric summaries, policies, and claims lists are heavily coupled to actual database state. For instance, the Customer Portal gets its numbers from `/api/customer/dashboard-stats`, `/api/customer/policies`, and `/api/customer/claims`.
- When rendering UI elements (like "Total Protection Value"), dynamically compute it off backend feeds via standard React `.reduce()` rather than hardcoding static numbers.

### Workflow & Local Execution
- Standard boot procedure involves:
  1. FastAPI running via `uvicorn main:app --reload --port 8000`.
  2. React running via `npm run dev` (Port 5173).
  3. Optionally, n8n handling webhooks (Port 5678) syncing directly to the FastAPI `/api/webhooks/n8n-extraction` proxy.

---
**Summary**: When modifying Lexora, respect the state machine, rely exclusively on `claims.id` for cross-cutting logic, ensure frontend elements reflect live Supabase data via FastAPI endpoints, and adhere to the mock-routing setup defined in `AuthContext.jsx`.
