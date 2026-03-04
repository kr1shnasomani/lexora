# Lexora — Stack & Infrastructure

## Frontend
| Concern | Detail |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 — `/admin/*` and `/customer/*` |
| Styling | **Tailwind CSS v3** — `@tailwind base/components/utilities` directives in `index.css`. Config in `tailwind.config.js` with custom `colors.primary`, `colors.surface-dark`, etc. |
| Icons | Lucide React |
| API calls | `useFetch` hook (`frontend/src/hooks/useFetch.js`) for GET; `fetch()` directly for POST/PUT |
| Base URL | `import.meta.env.VITE_API_URL \|\| 'http://localhost:8000'` — set in `.env` |
| Auth | Mock only — `AuthContext.jsx` using `sessionStorage`. No Supabase JS SDK in use. |

## Backend
| Concern | Detail |
|---|---|
| Framework | FastAPI + Uvicorn |
| Python | 3.11 / 3.12 (venv at `backend/venv/`) |
| Settings | `backend/config.py` — `pydantic_settings.BaseSettings`, reads `.env` |
| DB client | `backend/database.py` — `get_supabase()` singleton (Supabase Python client) |
| Models | `backend/models.py` — all Pydantic request/response schemas |
| State machine | `backend/state_machine.py` — `validate_transition()` / `enforce_transition()` |
| Audit | `backend/services/audit.py` — `log_audit_event()`, `AuditTimer` |

## Infrastructure Services
| Service | Purpose | Key env vars |
|---|---|---|
| **Supabase** | PostgreSQL + Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| **Groq** | LLM (chat tool-calling) + Whisper | `GROQ_API_KEY` |
| **Cohere** | Text embeddings (L3 Tier 2) | `COHERE_API_KEY` |
| **Jina AI** | Multimodal doc embeddings (L3 Tier 2, gated) | `JINA_API_KEY` |
| **Qdrant** | Vector store (L3 Tier 2) | `QDRANT_URL`, `QDRANT_API_KEY` |
| **Neo4j Aura** | Fraud entity graph (L3 Tier 3) | `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` |
| **n8n** | L1 orchestration (OCR + LLM extraction) | `N8N_WEBHOOK_URL` |
| **OpenRouter** | Optional LLM fallback | `OPENROUTER_API_KEY` |

## L3 Feature Flags (env or `configuration` table)
```
FRAUD_LAYER3_ENABLE_QDRANT=true
FRAUD_LAYER3_ENABLE_NEO4J=true
FRAUD_LAYER3_ENABLE_JINA_MEDIA=true
```
Default: all `false` (Pass 1 / local-only mode).

## Ports
| Service | Port |
|---|---|
| FastAPI backend | `8000` |
| Vite frontend | `5173` |
| n8n | `5678` |

## CI / CD
| Workflow | File | Trigger |
|---|---|---|
| Lint + unit tests + frontend build | `.github/workflows/ci.yml` | Push / PR → `main`, `develop` |
| Docker build & push to GHCR | `.github/workflows/cd.yml` | Push → `main` |

Only **Layer 2** tests run in CI (mocked — no external services needed). Layer 3/4 integration tests require live Supabase, Qdrant, Neo4j and must be run locally or via a separate job with secrets.

## Boot Commands
```bash
# Backend (from backend/)
source venv/bin/activate
uvicorn main:app --reload --port 8000 --reload-dir ./ --reload-exclude venv

# Frontend (from frontend/)
npm run dev
```

## Dependency Notes
- `grpcio>=1.62.0` must be pinned **before** `jina` in `requirements.txt` (Python 3.14 build fix).
- Use `install.sh` for first-time setup — it handles `--no-build-isolation` for grpcio.
