# Lexora — Comprehensive API Architecture Documentation

This document explicitly maps the data exchange between the Frontend, the Backend, and the Database. It outlines their structures, purposes, what is currently fully functional, and what remains disconnected or missing.

---

## 1. Frontend API Entry Points (What the UI Expects)

The Lexora React frontend relies heavily on the `api.js` client wrapper around the standard `fetch` API. It expects the following endpoints to serve structured JSON data.

### Customer Portal Calls
*   **`GET /api/user/profile`**: Renders customer profile information, policy count, and member since dates.
*   **`GET /api/policies`**: Used across multiple pages to fetch all policies. Occasionally filtered via queries (`?status=active&page_size=2`).
*   **`GET /api/claims?page_size=20`**: Fetches claims to display in the customer's claim history table.
*   **`GET /api/notifications`** & **`GET /api/notifications/prefs`**: Grabs customer notification feeds and user preference settings.
*   **`PUT /api/notifications/prefs`**: Toggles specific notification types.
*   **`POST /api/claims`**: Form submission for a brand new claim containing policy info, incident details.

### Admin Portal Calls
*   **`GET /api/dashboard/summary`**: Serves the primary Admin Dashboard KPIs, priority queues, and threat alerts.
*   **`GET /api/analytics/summary`**: Serves detailed metrics, model drift stats, and trajectory data natively to the admin analytics page.
*   **`GET /api/network/graph`**: Expected to return network nodes/edges representing fraud rings for visualization.
*   **`GET /api/config`**: Gets simulation and engine thresholds, flags, and health metrics.
*   **`PUT /api/config/{key}`**: Updates a threshold rule on the fly.
*   **`GET /api/claims?page_size=50`**: Renders the complete Claims Queue for adjusters.
*   **`POST /api/claims/{claimId}/actions`**: Expected boundary for admins triggering simulation actions (approve/reject). *(Note: Replaced by manual-review in new backend).*

---

## 2. Backend APIs (What is Actually Implemented)

The FastAPI backend has transitioned from a pure UI *simulation mode* to a real execution engine hooked into Supabase. The current live routes are:

### Real-Time Execution (Functional)
*   **`GET /` & `GET /health`**: Simple pulse checks.
*   **`GET /api/policies`**: Returns a raw table dump of the `policies` table (in `main.py`).
*   **`GET /api/configuration`**: Returns a raw table dump of the `configuration` table (in `main.py`).
*   **`GET /api/users`**: Returns a raw table dump of the `users` table (in `main.py`).

### Active Claims Management (`/api/claims`)
*   **`POST /api/claims`**: Fully functional endpoint that stores claims securely in the database. Checks for idempotency keys.
*   **`GET /api/claims`** & **`GET /api/claims/{id}`**: Fully retrieves claim history directly from the `claims` database table, joining with document storage references.
*   **`GET /api/claims/{id}/documents/{doc_id}/download`**: Secure proxy to generate signed Supabase storage URLs for uploaded documents.
*   **`POST /api/claims/{id}/manual-review`**: Designed for human intervention. Bypasses the system and marks a final decision in the database, inserting an audit log and RLHF feedback row.
*   **`GET /api/claims/{id}/audit`**: Lists immutable history of a claim's lifecycle stages.

### AI Engine Chaining
*   **`POST /api/claims/{id}/run-policy`**: Triggers Layer 2 (Policy Engine) on a submitted claim.
*   **`POST /api/claims/{id}/run-fraud`**: Triggers Layer 3 (Fraud Check) on an evaluated claim.
*   **`POST /api/claims/{id}/decide`**: Triggers Layer 4 (Risk Fusion) on a fraud-checked claim.
*   **`POST /api/claims/{id}/run-all`**: Convenience wrapper; forcibly cascades a claim through Layer 2 -> Layer 3 -> Layer 4 sequentially.

### Dedicated Customer Extension
*   **`GET /api/customer/policies`**: Scopes retrieval strictly by `holder_email`.
*   **`GET /api/customer/claims`**: Recursively maps claims against scoped policy IDs.
*   **`GET /api/customer/dashboard-stats`**: Custom aggregator fetching coverage limits, in-progress claims, and recent activity.

### Webhook Reception
*   **`POST /api/webhooks/n8n-extraction`**: Receives multi-modal parsed payloads directly from an external n8n AI workflow, creates a claim natively, and automatically fires the `trigger_pipeline` background task.

---

## 3. Database Side (Supabase Integration)

The backend natively queries and inserts into a robustly modeled SQL Schema. The application acts as a direct conduit to these tables:

*   **`public.users`**: Maintains internal organization (Adjusters, SIU, Underwriters). *Note: Does not yet handle custom authentication via RLS or Supabase Auth properly.*
*   **`public.policies`**: Tracks user policies, coverage limits. Tied explicitly by `holder_email` constraint.
*   **`public.claims`**: The massive central ledger. Tracks everything from `incident_description` to L1 `extraction_raw` JSON blocks, Layer 2 `policy_decision` JSON blocks, to `fraud_score` decimals. Every state transition triggers PostgreSQL timestamps (`processed_at`, `updated_at`).
*   **`public.claim_documents`**: Bridges metadata mappings to secure objects stored in the Supabase Storage Bucket `claim_documents`.
*   **`public.audit_events`**: Immutable ledger table appended strictly during lifecycle transitions.
*   **`public.configuration`**: Houses engine weights and thresholds to decouple ML variables from the source code.

---

## 4. Gap Analysis: Functional vs Disconnected

### What is 100% Functional ✅
*   **The L1 to L4 Pipeline**: n8n extraction hitting the webhook, automatically propagating through Policy/Fraud/Decision engines, and writing natively into PostgreSQL is entirely functional and battle-tested.
*   **Backend SQL Operations**: The backend successfully executes queries on all core operations—reading claims, mutating states, and appending audit events natively.
*   **Basic Form Submissions**: `POST /api/claims` exactly aligns with what the `FileClaimPage` sends.

### What is Disconnected / Needs Fixing ❌

**1. The "Simulation" Admin Gap**
The frontend was originally built heavily against a mock `API.md`. When the backend moved to real engines and real SQL, the simulation routes were deleted (they do not exist in the FASTAPI router).  
*Result:* The Admin Portal natively breaks. `DashboardPage.jsx`, `AnalyticsPage.jsx`, `NetworkGraphPage.jsx`, and `ConfigPage.jsx` all try to hit endpoints (`/api/dashboard/summary`, `/api/analytics/summary`, `/api/network/graph`) that yield `404 Not Found`.
*   *Solution:* We must either (a) rebuild these complex aggregation queries natively in `routes/dashboard.py` and `routes/analytics.py` interacting with Supabase, or (b) re-insert the old simulation routes explicitly for the UI hackathon.

**2. Authentication Void**
The frontend currently uses SessionStorage for demo logins, whereas the API specification notes that we intend to use Supabase Auth (OTP). Furthermore, backend endpoints like `/api/claims` are completely lacking `user_id` context filtering. The database has a `public.users` table, but there is no verification bridging the frontend JWT token to backend query filters yet.
*   *Solution:* Wire up `supabase.auth.signInWithOtp` in React, pass the JWT `Authorization: Bearer` header, and implement user parsing via FastAPI `Depends()`.

**3. Action Route Mismatch**
The `ClaimsQueuePage.jsx` attempts to approve/reject claims using `POST /api/claims/{claimId}/actions`, while the backend now uses a dedicated rigorous `POST /api/claims/{claim_id}/manual-review` route demanding different structural arguments (like `reviewer_id`, `decision`).

### Summary
The **Backend/Database core works perfectly** as an engine. The **Frontend Customers forms** are aligned. However, the **Frontend Admin Aggregations are completely orphaned** due to the architectural pivot away from mock data.
