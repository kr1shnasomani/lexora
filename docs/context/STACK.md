# Lexora — Stack & Infrastructure

## Frontend
| Concern | Detail |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 — `/admin/*` and `/customer/*` |
| Styling | **Tailwind CSS v3** — `@tailwind base/components/utilities` directives in `index.css`. Config in `tailwind.config.js` with custom `colors.primary`, `colors.surface-dark`, etc. |
| Icons | Lucide React |
| API calls | `useFetch` hook (`frontend/src/hooks/useFetch.js`) for GET; `fetch()` directly for POST/PUT |
| Base URL | `VITE_API_URL` — baked into the bundle as a Docker build-arg. Falls back to `'http://localhost:8000'` for local dev outside Docker. |
| Auth | Mock only — `AuthContext.jsx` using `sessionStorage`. No Supabase JS SDK in use. |

## Backend
| Concern | Detail |
|---|---|
| Framework | FastAPI + Uvicorn |
| Python | 3.12 (multi-stage Docker image — no venv required) |
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

## Ports (Docker)
| Service | Host Port |
|---|---|
| React frontend (nginx) | `80` |
| FastAPI backend | `8000` |
| n8n | `5678` |

## Boot Commands
```bash
# Full stack — production mode (one command)
docker compose up --build

# Dev mode — backend hot-reload (source mounted)
docker compose --profile dev up --build

# Individual services
docker compose up backend     # backend only
docker compose up frontend    # frontend only
docker compose up n8n         # n8n only
```

## CI / CD
| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push / PR → `main`, `develop` | Orchestrator — gates lint, test, build |
| `cd.yml` | Push → `main` | Orchestrator — CI gate → Docker publish |
| `lint-backend.yml` | via `ci.yml` | Ruff linting on `backend/` |
| `test-backend.yml` | via `ci.yml` | Layer 2 unit tests inside Docker |
| `build-frontend.yml` | via `ci.yml` | Vite production build |
| `docker-build.yml` | via `ci.yml` (PRs only) | Build-check both Docker images |
| `docker-publish.yml` | via `cd.yml` | Push `ghcr.io/kr1shnasomani/lexora` |
| `release.yml` | Tag `v*` / manual | Versioned image + GitHub Release |
| `codeql.yml` | Push / PR / weekly | CodeQL security scan |
| `dependabot.yml` | Weekly Monday | Automated dep PRs (pip, npm, actions) |

Only **Layer 2** tests run in CI (mocked — no external services needed). Layer 3/4 integration tests require live Supabase, Qdrant, Neo4j and must be run locally or via a separate job with secrets.

## Dependency Notes
- `grpcio>=1.62.0` is installed from a **pre-built binary wheel** in the Docker builder stage to avoid multi-minute source compilation.
- No `venv` needed — Docker handles all Python dependencies inside the container.
