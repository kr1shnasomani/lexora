# LEXORA: Definitive Implementation Guide
## For LLM Code Generation

---

## Document Purpose

**This is a requirements specification, not a code tutorial.**

After reading this document, you (the LLM implementer) should know:
- WHAT to build (exact requirements)
- WHY it's built that way (design decisions)
- WHAT to avoid (anti-patterns)
- HOW to validate it works (acceptance criteria)

**You choose HOW to implement it** (frameworks, patterns, optimizations) as long as requirements are met.

---

## Day-0 Fixes (Apply Before Writing Any Code)

> These are **blocking structural corrections** to the original plan. Every item below MUST be resolved in your first migration and first code review pass before any layer implementation begins.

### A · Claim Data Shape — One Canonical Form

- **Problem:** The original plan mixes normalized columns (`invoice_number`, `claimed_amount`, `provider_name`) with JSON path reads (`financial->>'invoice_number'`) in the same SQL queries. These are contradictory.
- **Fix:** Canonical claim fields are **normalized columns** on the `claims` table (see Component 1 DDL). The full Layer-1 AI output is stored verbatim in `claims.extraction_raw JSONB` for audit and replay purposes only.
- **Rule:** All SQL — Tier-1 fraud checks, policy evaluation, reporting — reads **normalized columns only**. JSON path operators (`->`, `->>`) are never used in WHERE clauses or business logic. `extraction_raw` is written once, never queried for logic.

### B · Identifier Consistency — One Claim ID Everywhere

- **Problem:** The original plan uses `policy_number` as a claim identifier in Qdrant payloads. `policy_number` is an external, human-readable, potentially reusable string — it must never be a system ID.
- **Fix:** `claims.id` (UUID v4) is the **sole claim identifier** across every subsystem: Postgres, Qdrant, Neo4j, and all audit records.
- **Rule:** `policy_number` is a plain VARCHAR field on `claims`. It appears in display and external comms only. Qdrant payloads store `claim_id` (the UUID). Neo4j `Claim` nodes merge exclusively on `{id: $claim_id}`.

### C · Audit Design — Append-Only Event Log

- **Problem:** The original `audit_logs` table has one wide row per claim (`layer_1_output`, `layer_2_output` columns). This breaks on retries (which row is updated?), makes partial progress invisible, and cannot represent multiple events per stage.
- **Fix:** `audit_logs` is replaced by `audit_events` — an append-only table with one row per processing event. Schema: `id, claim_id, stage, event_type, payload, model_versions, duration_ms, created_at`.
- **Rule:** `audit_events` is INSERT-only. No UPDATE, no DELETE, ever. Every retry, error, and success is a new row. Replaying all rows for a `claim_id` ordered by `created_at` must reproduce the full processing history.

### D · Canonical Status & Decision Enums — Separated

- **Problem:** The original plan conflates lifecycle position and decision outcome into a single status field, using inconsistent casing and values across DB and code.
- **Fix:** Two strictly separated fields: `claims.status` (lifecycle position) and `claims.final_decision` (outcome, set only when a terminal status is reached).
- **Canonical status values:** `submitted → extracting → extracted → policy_evaluating → fraud_checking → deciding → finalized` (terminal happy path), plus `under_review`, `fraud_investigation`, `error` as terminal states.
- **Canonical final_decision values:** `auto_approve | auto_reject | manual_review | fraud_investigation`
- **Rule:** Code, queries, and tests must use these exact lowercase snake_case values. No uppercase, no synonyms. `final_decision` is NULL until a terminal status is set.

### E · Postgres Hardening

- **Fix 1:** `CREATE EXTENSION IF NOT EXISTS pgcrypto;` must be the first statement in the baseline migration so `gen_random_uuid()` is available.
- **Fix 2:** All timestamp columns use `TIMESTAMPTZ` (not `TIMESTAMP`). Timezone-naive timestamps are banned.
- **Fix 3:** `CHECK` constraints on all monetary fields (`> 0`) and all 0..1 float fields (`BETWEEN 0.0 AND 1.0`).
- **Fix 4:** `policy_rules` uniqueness is `UNIQUE (policy_type, version)` — not a global `UNIQUE` on `version` alone, which would prevent the same version string across different policy types.
- **Fix 5:** `effective_to` enforced by `CHECK (effective_to IS NULL OR effective_to > effective_from)`.

---

## Critical Principles (Non-Negotiable)

### 1. Configuration Over Code
**Rule:** Business logic parameters MUST be in database, NEVER hardcoded.

**Examples:**
- ❌ WRONG: `if fraud_score > 0.7: investigate`
- ✅ RIGHT: `if fraud_score > config.get('fraud.investigation_threshold'): investigate`

**Why:** Rules change. Different insurance products have different thresholds. Code deployment for config changes is unacceptable.

**Enforcement:** Code review fails if ANY numeric threshold, weight, or business rule is hardcoded.

---

### 2. Explainability First
**Rule:** Every decision MUST have a complete, reproducible audit trail.

**Requirements:**
- Store exact inputs used
- Store exact rule/model versions used
- Store exact outputs produced
- Store calculation steps (for policy decisions)
- Store reasoning (for fraud flags)

**Test:** Given an audit log from 6 months ago, can you reproduce the EXACT same decision?

**Why:** Legal compliance. Fraud accusations must be defensible. Claim denials must be justified.

---

### 3. Fail-Safe Defaults
**Rule:** When uncertain, route to human review. NEVER auto-approve questionable claims.

**Decision Tree:**
```
If (low confidence OR missing data OR layer failure OR unknown pattern):
    → final_decision = 'manual_review', status = 'under_review'
Else if (high fraud):
    → final_decision = 'fraud_investigation', status = 'fraud_investigation'
Else if (policy violation):
    → final_decision = 'auto_reject', status = 'finalized'
Else if (low fraud AND high confidence AND policy approved):
    → final_decision = 'auto_approve', status = 'finalized'
Else:
    → final_decision = 'manual_review', status = 'under_review'  (default)
```

**Why:** False negatives (paying fraudulent claims) are costly. False positives (flagging valid claims) are recoverable through review.

---

### 4. Deterministic Decisions
**Rule:** Layers 2 and 4 MUST be pure functions (same input = same output).

**NO randomness, NO AI model calls in:**
- Policy rule execution
- Benefit calculation
- Decision routing logic

**Why:** Legal defensibility requires reproducibility.

---

### 5. Idempotency
**Rule:** Same claim submitted twice = Same result returned.

**Requirements:**
- Use idempotency keys (request_id or hash of claim data)
- Check for duplicates BEFORE processing
- Return existing result if duplicate detected

**Why:** Users retry. Networks fail. Webhooks retry. We must handle it gracefully.

---

### 6. Proper Entity Relationships
**Rule:** Use correct IDs for correct purposes.

**Critical:**
- Claim has its own UUID (claim.id)
- Policy has its own UUID (policy.id)
- claim.policy_id is a foreign key to policy.id
- NEVER use policy_number as claim.id
- NEVER use policy_number as graph node ID

**Why:** Policy numbers are external identifiers. They can be reused, changed, or non-unique. Internal IDs must be UUIDs.

---

### 7. Schema Enforcement
**Rule:** Extracted data MUST conform to strict schema before proceeding.

**Requirements:**
- Define JSON schema for extraction output
- Validate ALL fields (type, format, constraints)
- If validation fails → Retry extraction with enhanced prompt
- If still fails → Manual review (do NOT guess/fix data)

**Why:** Garbage in = garbage out. Invalid data corrupts downstream processing.

---

### 8. Separation of Concerns
**Rule:** AI for perception, Code for decisions.

**Layer 1 (AI):** Extract data, assess confidence
**Layer 2 (Code):** Apply rules, calculate benefits
**Layer 3 (Hybrid):** Detect patterns (rules + vectors + graph)
**Layer 4 (Code):** Route decision
**Layer 5 (Code):** Log + Learn

**Why:** Legal liability. AI can be uncertain; policy application cannot be.

---

## Anti-Patterns (What NOT to Do)

### ❌ Anti-Pattern 1: Trusting AI Output Without Validation
```
# WRONG
extracted_data = gemini.extract(document)
policy_engine.evaluate(extracted_data)  # What if data is malformed?

# RIGHT
extracted_data = gemini.extract(document)
validated_data = validate_schema(extracted_data)
if not validated_data.is_valid:
    retry_or_manual_review()
policy_engine.evaluate(validated_data)
```

---

### ❌ Anti-Pattern 2: Hardcoded Business Logic
```
# WRONG
if fraud_score > 0.7:
    decision = "investigate"

# RIGHT
threshold = config.get("fraud.investigation_threshold", default=0.7)
if fraud_score > threshold:
    decision = "investigate"
```

---

### ❌ Anti-Pattern 3: Using Wrong IDs
```
# WRONG
graph.add_node("Claim", id=claim.policy_number)

# RIGHT
graph.add_node("Claim", id=claim.id)  # claim.id is UUID
```

---

### ❌ Anti-Pattern 4: Missing Timeout Handling
```
# WRONG
response = external_api.call(data)

# RIGHT
response = external_api.call(data, timeout=30)
if response.timeout:
    retry_with_backoff()
```

---

### ❌ Anti-Pattern 5: No Idempotency Check
```
# WRONG
def submit_claim(files, policy_number):
    claim = create_new_claim()
    process(claim)

# RIGHT
def submit_claim(files, policy_number, request_id):
    existing = find_claim_by_idempotency_key(request_id)
    if existing:
        return existing
    claim = create_new_claim(idempotency_key=request_id)
    process(claim)
```

---

### ❌ Anti-Pattern 6: Incomplete Audit Trail
```
# WRONG
audit_log.save({
    "claim_id": claim.id,
    "decision": "approved"
})

# RIGHT
audit_log.save({
    "claim_id": claim.id,
    "decision": "approved",
    "policy_version": policy.version,
    "fraud_weights": [0.3, 0.3, 0.4],
    "thresholds": {...},
    "model_versions": {...},
    "calculation_trail": [...]
})
```

---

### ❌ Anti-Pattern 7: Sequential Layer Calls in API Endpoint
```
# WRONG (blocking, no retry, no state tracking)
@app.post("/claims")
def process_claim(files):
    layer1_result = layer1.extract(files)
    layer2_result = layer2.evaluate(layer1_result)
    layer3_result = layer3.analyze(layer1_result)
    layer4_result = layer4.decide(...)
    return layer4_result

# RIGHT (async, state machine, retryable)
@app.post("/claims")
def submit_claim(files, request_id):
    claim = create_claim_record(status="submitted", idempotency_key=request_id)
    queue_for_processing(claim.id)
    return {"claim_id": claim.id, "status": "submitted"}
```

---

### ❌ Anti-Pattern 8: Assuming API Calls Always Succeed
```
# WRONG
embedding = cohere.embed(text)

# RIGHT
try:
    embedding = cohere.embed(text, timeout=30)
except Timeout:
    retry_with_backoff()
except RateLimitError:
    queue_for_later()
except APIError as e:
    log_error(e)
    manual_review()
```

---

## Component Specifications

---

## Component 1: Database Schema Design

### Goal
Define data structures that support all requirements without introducing anomalies.

### Critical Requirements

#### 1.1 Claims Table
**Purpose:** Primary entity representing an insurance claim.

> **Day-0 patch applied:** normalized columns only, `extraction_raw` added, `TIMESTAMPTZ` throughout, canonical status/decision enums, corrected CHECK constraints. See Day-0 Fix A, D, E.

**DDL:**
```sql
-- Must be first statement in baseline migration (Day-0 Fix E)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Lifecycle position of a claim in the processing pipeline
CREATE TYPE claim_status AS ENUM (
    'submitted',           -- Initial state after upload
    'extracting',          -- Layer 1 in progress
    'extracted',           -- Layer 1 complete
    'policy_evaluating',   -- Layer 2 in progress
    'fraud_checking',      -- Layer 3 in progress
    'deciding',            -- Layer 4 in progress
    'finalized',           -- Layer 4 complete; see claims.final_decision for outcome
    'under_review',        -- Routed to manual underwriter queue
    'fraud_investigation', -- Routed to SIU
    'error'                -- Permanent failure; requires manual intervention
);

-- Final ruling — set only when status transitions to 'finalized', 'under_review', or 'fraud_investigation'
CREATE TYPE claim_final_decision AS ENUM (
    'auto_approve',
    'auto_reject',
    'manual_review',
    'fraud_investigation'
);

CREATE TYPE incident_type_enum AS ENUM (
    'accident', 'illness', 'theft', 'damage', 'other'
);

CREATE TYPE policy_type_enum AS ENUM (
    'health', 'auto', 'property', 'life'
);

CREATE TABLE claims (
    -- Identity
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number          VARCHAR(100)  NOT NULL UNIQUE,  -- e.g. CLM-2024-001234
    policy_id             UUID          NOT NULL REFERENCES policies(id),
    idempotency_key       VARCHAR(255)  NOT NULL UNIQUE,

    -- Lifecycle: status = where it is now; final_decision = what was ruled (set together with terminal status)
    status                claim_status        NOT NULL DEFAULT 'submitted',
    final_decision        claim_final_decision,        -- NULL until terminal status reached
    current_state_context JSONB               NOT NULL DEFAULT '{}',

    -- Claimant info (normalized columns — populated after Layer 1 validation)
    claimant_name         VARCHAR(255),
    claimant_phone        VARCHAR(50),
    incident_date         DATE,
    incident_type         incident_type_enum,
    incident_description  TEXT,

    -- Financial (normalized columns)
    claimed_amount        NUMERIC(12,2)  CHECK (claimed_amount IS NULL OR claimed_amount > 0),
    approved_amount       NUMERIC(12,2)  CHECK (approved_amount IS NULL OR approved_amount > 0),
    provider_name         VARCHAR(255),
    invoice_number        VARCHAR(255),

    -- Layer-1 verbatim AI output.
    -- Initialized to '{}' on claim creation (submitted status).
    -- Updated exactly once when status transitions extracting → extracted.
    -- Never queried for business logic — for audit/replay only.
    extraction_raw        JSONB          NOT NULL DEFAULT '{}',

    -- Layer-1 metadata
    extraction_confidence FLOAT          CHECK (extraction_confidence IS NULL OR extraction_confidence BETWEEN 0.0 AND 1.0),
    extraction_warnings   JSONB          NOT NULL DEFAULT '[]',

    -- Layer-2 output
    policy_decision       JSONB,

    -- Layer-3 output
    fraud_score           FLOAT          CHECK (fraud_score IS NULL OR fraud_score BETWEEN 0.0 AND 1.0),
    fraud_analysis        JSONB,

    -- Layer-4 output
    decision_rationale    TEXT,
    decision_output       JSONB,

    -- Review tracking
    reviewed_by           UUID           REFERENCES users(id),
    reviewed_at           TIMESTAMPTZ,

    -- Timestamps (all TIMESTAMPTZ — no naive timestamps permitted)
    submitted_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    processed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_approved_lte_claimed
        CHECK (approved_amount IS NULL OR claimed_amount IS NULL OR approved_amount <= claimed_amount)
);
```

**Indexes Required:**
```sql
CREATE INDEX idx_claims_status      ON claims(status);
CREATE INDEX idx_claims_policy      ON claims(policy_id);
CREATE INDEX idx_claims_idempotency ON claims(idempotency_key);
CREATE INDEX idx_claims_submitted   ON claims(submitted_at);
CREATE INDEX idx_claims_invoice     ON claims(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX idx_claims_claimant    ON claims(claimant_name);
CREATE INDEX idx_claims_fraud_score ON claims(fraud_score) WHERE status = 'finalized';
```

---

#### 1.2 Missing Referenced Tables (Full DDL)

> **Patch 6 applied:** The original guide referenced `users`, `policies`, `claim_documents`, and a `feedback` table without defining them. Every table `claims` joins or references must be defined in the baseline migration. All timestamps are `TIMESTAMPTZ`. Enum approach is Postgres `CREATE TYPE` throughout — no mixing with `CHECK` constraints.

```sql
-- -------------------------------------------------------
-- USERS
-- -------------------------------------------------------
CREATE TYPE user_role AS ENUM ('underwriter', 'admin', 'auditor', 'siu');

CREATE TABLE users (
    id           UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    email        VARCHAR(255) NOT NULL UNIQUE,
    full_name    VARCHAR(255) NOT NULL,
    role         user_role  NOT NULL DEFAULT 'underwriter',
    is_active    BOOLEAN    NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- POLICIES
-- Fields required by Layer-2 rule loading:
--   policy_number, policy_type, rules_version, start/end dates
-- -------------------------------------------------------
CREATE TABLE policies (
    id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_number    VARCHAR(100)      NOT NULL UNIQUE,
    policy_type      policy_type_enum  NOT NULL,
    rules_version    VARCHAR(50)       NOT NULL,   -- FK-like ref into policy_rules.version
    holder_name      VARCHAR(255)      NOT NULL,
    holder_email     VARCHAR(255),
    policy_start_date DATE             NOT NULL,
    policy_end_date   DATE             NOT NULL,
    annual_limit     NUMERIC(12,2)     NOT NULL CHECK (annual_limit > 0),
    is_active        BOOLEAN           NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_policy_dates CHECK (policy_end_date > policy_start_date)
);

CREATE INDEX idx_policies_number ON policies(policy_number);
CREATE INDEX idx_policies_type   ON policies(policy_type);

-- -------------------------------------------------------
-- CLAIM DOCUMENTS
-- Stores file metadata + sha256 for cross-claim dedupe.
-- Storage key is the path in S3/local (never raw file data).
-- -------------------------------------------------------
CREATE TABLE claim_documents (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id         UUID         NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    storage_provider TEXT         NOT NULL DEFAULT 'local', -- 'local' | 's3'
    storage_key      TEXT         NOT NULL,
    sha256           CHAR(64)     NOT NULL,   -- hex SHA-256 of raw file bytes
    file_name        VARCHAR(255) NOT NULL,
    content_type     VARCHAR(100) NOT NULL,
    size_bytes       BIGINT       NOT NULL CHECK (size_bytes > 0),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claim_documents_claim  ON claim_documents(claim_id);
CREATE INDEX idx_claim_documents_sha256 ON claim_documents(sha256);
-- Cross-claim duplicate doc detection: query sha256 across different claim_ids

-- -------------------------------------------------------
-- CLAIM LINE ITEMS (optional — for partial approvals)
-- If final_decision supports per-line adjudication, use this.
-- -------------------------------------------------------
CREATE TABLE claim_line_items (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        UUID          NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    line_no         INTEGER       NOT NULL,
    description     TEXT          NOT NULL,
    claimed_amount  NUMERIC(12,2) NOT NULL CHECK (claimed_amount > 0),
    approved_amount NUMERIC(12,2) CHECK (approved_amount IS NULL OR approved_amount >= 0),
    line_decision   TEXT          CHECK (line_decision IN ('approved','rejected','partial')),
    reason          TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_claim_line UNIQUE (claim_id, line_no)
);

CREATE INDEX idx_line_items_claim ON claim_line_items(claim_id);

-- -------------------------------------------------------
-- FEEDBACK
-- Captures human reviewer overrides for retraining.
-- -------------------------------------------------------
CREATE TABLE feedback (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id          UUID        NOT NULL REFERENCES claims(id),
    reviewed_by       UUID        NOT NULL REFERENCES users(id),
    system_decision   claim_final_decision NOT NULL,
    human_decision    claim_final_decision NOT NULL,
    feedback_category TEXT        NOT NULL,  -- e.g. 'fraud_missed', 'false_positive', 'policy_error'
    feedback_notes    TEXT,
    flagged_for_retraining BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_claim ON feedback(claim_id);
CREATE INDEX idx_feedback_retraining ON feedback(flagged_for_retraining) WHERE flagged_for_retraining = TRUE;
```

---

#### 1.3 Configuration Table
**Purpose:** Store ALL business logic parameters.

```sql
CREATE TYPE config_type_enum AS ENUM ('threshold', 'weight', 'feature_flag', 'rule');

CREATE TABLE configuration (
    id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key   VARCHAR(255)      NOT NULL UNIQUE,
    config_value JSONB             NOT NULL,
    config_type  config_type_enum  NOT NULL,
    description  TEXT,
    version      INTEGER           NOT NULL DEFAULT 1,
    updated_by   UUID              REFERENCES users(id),
    updated_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_config_key ON configuration(config_key);
```

**Required Initial Configurations:**
```
INSERT INTO configuration (config_key, config_value, config_type, description) VALUES
('fraud.tier1.velocity_threshold', '5', 'threshold', 'Max claims per claimant in 7 days'),
('fraud.tier2.image_similarity_threshold', '0.95', 'threshold', 'Image similarity cutoff'),
('fraud.tier2.text_similarity_threshold', '0.90', 'threshold', 'Text similarity cutoff'),
('fraud.fusion.weights', '[0.3, 0.3, 0.4]', 'weight', 'Tier 1, 2, 3 weights'),
('fraud.high_threshold', '0.7', 'threshold', 'Score above this → investigation'),
('fraud.low_threshold', '0.2', 'threshold', 'Score below this → safe'),
('decision.investigation_cost', '150.0', 'threshold', 'Cost of manual review USD'),
('extraction.min_confidence', '0.85', 'threshold', 'Min confidence to proceed'),
('features.fraud_tier3.enabled', 'true', 'feature_flag', 'Enable graph analysis');
```

---

#### 1.4 Audit Events Table
**Purpose:** Complete, immutable, append-only trail of every processing event across all layers.

> **Day-0 patch applied:** Replaces the original wide `audit_logs` table. The wide-column design (one row per claim with `layer_1_output`, `layer_2_output` columns) cannot handle retries or partial progress. See Day-0 Fix C.

**DDL:**
```sql
CREATE TABLE audit_events (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id       UUID        NOT NULL REFERENCES claims(id),

    -- Which processing stage emitted this event
    stage          TEXT        NOT NULL,  -- e.g. 'layer_1', 'layer_2', 'layer_3_tier1', 'layer_4'
    -- What happened at this stage
    event_type     TEXT        NOT NULL,  -- e.g. 'started', 'succeeded', 'failed', 'retried', 'manual_review_routed'

    -- Full input/output snapshot for this event (enables exact replay)
    payload        JSONB       NOT NULL DEFAULT '{}',

    -- Exact model/rule versions active at the time of this event
    model_versions JSONB       NOT NULL DEFAULT '{}',

    -- How long this event took
    duration_ms    INTEGER,

    -- TIMESTAMPTZ is mandatory — ordering by this column reconstructs processing history
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_events_claim_time ON audit_events(claim_id, created_at);
CREATE INDEX idx_audit_events_stage      ON audit_events(stage);
CREATE INDEX idx_audit_events_payload    ON audit_events USING GIN(payload);
```

**Usage pattern:**
```python
# Every layer emits events — never updates a single row
audit_events.insert({
    "claim_id": claim.id,
    "stage": "layer_1",
    "event_type": "succeeded",
    "payload": {
        "extracted_fields": {...},       # exact AI output
        "field_confidences": {...},
        "overall_confidence": 0.92,
        "warnings": [],
        "prompt_used": "...",            # exact prompt sent to AI
        "source_files": [...]
    },
    "model_versions": {"extraction_model": "gemma-3-27b"},
    "duration_ms": 3420
})

# On retry, insert a new row — do NOT update the failed row
audit_events.insert({
    "claim_id": claim.id,
    "stage": "layer_1",
    "event_type": "retried",
    "payload": {"attempt": 2, "error": "timeout", "retry_reason": "..."},
    "model_versions": {"extraction_model": "gemma-3-27b"},
    "duration_ms": 60000
})
```

**Critical:** This table is **INSERT-ONLY**. Never UPDATE or DELETE rows. Replay any past decision by selecting all `audit_events` for a `claim_id` ordered by `created_at`.

---

---

#### 1.5 Policy Rules Table
**Purpose:** Version-controlled policy definitions.

> **Day-0 patch applied:** `version` is no longer globally UNIQUE — uniqueness is scoped to `(policy_type, version)` so different product lines can share version strings. All timestamps are TIMESTAMPTZ. See Day-0 Fix E.

**Required Columns:**
```sql
CREATE TABLE policy_rules (
    id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_type      policy_type_enum NOT NULL,   -- e.g. 'health', 'auto'
    version          VARCHAR(50)      NOT NULL,   -- e.g. 'v2.3'
    rules_definition JSONB            NOT NULL,
    effective_from   DATE             NOT NULL,
    effective_to     DATE,                        -- NULL = currently active
    approved_by      UUID             REFERENCES users(id),
    approved_at      TIMESTAMPTZ,
    is_active        BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    -- Uniqueness is per product line, not global
    CONSTRAINT uq_policy_rules_type_version UNIQUE (policy_type, version),
    -- No ambiguity: effective_to must be after effective_from
    CONSTRAINT chk_policy_rules_dates
        CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX idx_policy_rules_type_active ON policy_rules(policy_type, is_active);
CREATE INDEX idx_policy_rules_effective   ON policy_rules(effective_from, effective_to);
```

**Example rules_definition Structure:**
```json
{
  "coverage_categories": {
    "medical": {
      "covered": true,
      "annual_limit": 50000.00,
      "copay_percentage": 20,
      "waiting_period_days": 30,
      "exclusions": ["cosmetic", "experimental"]
    }
  },
  "validation_rules": [
    {"check": "incident_date >= policy_start", "error": "Incident before policy start"}
  ]
}
```

---

### Validation Criteria

**Test 1: Correct IDs**
```sql
-- This should return 0 rows (no policy_number used as claim ID)
SELECT * FROM claims WHERE id IN (SELECT policy_number FROM policies);
```

**Test 2: No Hardcoded Values**
```sql
-- All business logic params should be in config table
SELECT COUNT(*) FROM configuration WHERE config_key LIKE 'fraud%' OR config_key LIKE 'decision%';
-- Should be >= 8
```

**Test 3: Audit Trail Completeness**
```sql
-- Every claim that reached any terminal status has at least one audit_events row
SELECT c.id, c.status FROM claims c
LEFT JOIN audit_events a ON c.id = a.claim_id
WHERE c.status IN ('finalized', 'under_review', 'fraud_investigation', 'error')
  AND a.id IS NULL;
-- Should return 0 rows
```

**Test 4: Final Decision Only Set on Terminal Status**
```sql
-- final_decision must be NULL for all non-terminal statuses
SELECT id, status, final_decision FROM claims
WHERE status NOT IN ('finalized', 'under_review', 'fraud_investigation')
  AND final_decision IS NOT NULL;
-- Should return 0 rows

-- final_decision must be set for all finalized claims
SELECT id FROM claims
WHERE status = 'finalized' AND final_decision IS NULL;
-- Should return 0 rows
```

**Definition of Done:**
- All tables created with correct types
- All indexes created
- All constraints enforced
- Initial config data seeded
- Validation tests pass

---

## Component 2: Layer 1 - Perception Engine

### Goal
Extract structured, validated data from multi-modal documents with quantified confidence.

### Architecture Decision
**Use n8n for orchestration** (handles file routing, external API calls)
**Use FastAPI for validation** (receives n8n output, validates, stores)

---

### 2.1 n8n Workflow Requirements

#### Workflow Entry Point
**Trigger:** Webhook (POST to `/webhook/claim-upload`)

**Expected Input:**
```json
{
  "request_id": "UUID (for idempotency)",
  "policy_number": "string (optional)",
  "files": [
    {
      "file_id": "UUID",
      "file_name": "claim.pdf",
      "file_type": "pdf",
      "file_data": "base64 or file path"
    }
  ]
}
```

---

#### File Type Router Node
**Node Type:** Switch

**Routing Logic:**
```
IF file_type == "pdf":
    → PDF Processing Branch
ELSE IF file_type IN ["png", "jpg", "jpeg"]:
    → Image Processing Branch
ELSE IF file_type IN ["mp4", "mov", "avi"]:
    → Video Processing Branch
ELSE IF file_type IN ["mp3", "wav", "m4a"]:
    → Audio Processing Branch
ELSE:
    → Unsupported File Error
```

---

#### PDF Processing Branch

**Step 1: Text Extraction**
- Use n8n's built-in PDF node OR Execute Command: `pdftotext`
- Output: Plain text

**Step 2: Gemma 3 Analysis**
- HTTP Request to Gemma 3 API
- Prompt:
```
You are an insurance claim data extractor. Extract these exact fields from the text below. Return ONLY valid JSON with no markdown, no preamble.

Required fields:
- policy_number (string)
- claimant_name (string)
- claimant_phone (string or null)
- incident_date (YYYY-MM-DD format)
- incident_type (one of: accident, illness, theft, damage, other)
- incident_description (string)
- claimed_amount (number, not string)
- provider_name (string or null)
- invoice_number (string or null)

Also include:
- field_confidence (object with confidence 0.0-1.0 for each field)
- warnings (array of strings for any issues)

Text to extract from:
{{$json.extracted_text}}
```

**Step 3: Response Validation**
- Check if response is valid JSON
- If not valid JSON → Retry once with prompt: "You must return ONLY valid JSON"
- If still not valid → Error (route to manual review)

**Output:**
```json
{
  "policy_number": "P-2024-001",
  "claimant_name": "John Doe",
  "incident_date": "2024-02-01",
  "incident_type": "accident",
  "incident_description": "...",
  "claimed_amount": 1500.00,
  "provider_name": "City Hospital",
  "field_confidence": {
    "policy_number": 0.95,
    "claimant_name": 0.98,
    "incident_date": 0.90,
    "claimed_amount": 0.92
  },
  "warnings": []
}
```

---

#### Image Processing Branch

**Step 1: Gemma 3 Vision Analysis**
- HTTP Request to Gemma 3 Vision API
- Send image as base64
- Use same prompt as PDF (but for image content)

**Output:** Same structure as PDF branch

---

#### Video Processing Branch

**Step 1: Gemini 2.5 Flash Lite Analysis**
- HTTP Request to Gemini API
- Endpoint: `/v1/models/gemini-2.5-flash-lite:generateContent`
- Prompt:
```
Analyze this insurance claim video. Extract:
- What incident occurred
- When it occurred (if visible/stated)
- Visible damage/injuries
- Any text visible (signs, documents)
- Estimated claim amount if mentioned

Return as JSON with same fields as document extraction.
```

**Output:** Same structure as PDF branch

---

#### Audio Processing Branch

**Step 1: Groq Whisper Transcription**
- HTTP Request to Groq API
- Model: `whisper-large-v3-turbo`
- Output: Transcribed text

**Step 2: Gemma 3 Analysis**
- Analyze transcript (same as PDF text)

**Output:** Same structure as PDF branch

---

#### Merge Node
**Purpose:** Combine results from all files.

**Logic:**
- If same field appears in multiple files:
  - Use value with highest confidence
  - Add warning: "Conflicting values found for [field]"
- If critical field missing across all files:
  - Set value to null
  - Add warning: "Missing: [field]"

---

#### Confidence Calculation Node
**Purpose:** Calculate overall extraction confidence.

**Logic:**
```javascript
// Get all field confidences
const confidences = Object.values(field_confidence);

// Critical fields (weighted higher)
const criticalFields = ['policy_number', 'claimant_name', 'incident_date', 'claimed_amount'];
const criticalConfidences = criticalFields.map(f => field_confidence[f] || 0);

// Weighted average
const criticalWeight = 0.7;
const nonCriticalWeight = 0.3;
const avgCritical = average(criticalConfidences);
const avgNonCritical = average(confidences.filter((v,i) => !criticalFields.includes(Object.keys(field_confidence)[i])));

const overall_confidence = (criticalWeight * avgCritical) + (nonCriticalWeight * avgNonCritical);
```

---

#### Schema Validation Node
**Purpose:** Validate extracted data against strict schema.

**Validations:**
```
1. policy_number: Present, non-empty string
2. claimant_name: Present, non-empty string, min 2 chars
3. incident_date: 
   - Present
   - Valid date format (YYYY-MM-DD)
   - Not in future
   - Not older than 2 years
4. incident_type: One of allowed values
5. incident_description: Present, min 10 chars
6. claimed_amount:
   - Present
   - Number type (not string)
   - Greater than 0
   - Less than $1,000,000 (sanity check)
```

**If Validation Fails:**
- Add specific error to warnings array
- Set overall_confidence to max(overall_confidence - 0.2, 0.0)

---

#### Send to FastAPI Node
**HTTP Request to Backend**

**Endpoint:** `POST /api/v1/claims/from-n8n`

**Payload:**
```json
{
  "request_id": "{{$json.request_id}}",
  "extraction_result": {
    "policy_number": "...",
    "claimant": {
      "name": "...",
      "phone": "..."
    },
    "incident": {
      "date": "...",
      "type": "...",
      "description": "..."
    },
    "financial": {
      "claimed_amount": 1500.00,
      "provider_name": "...",
      "invoice_number": "..."
    }
  },
  "extraction_metadata": {
    "model_used": "gemma-3",
    "overall_confidence": 0.92,
    "field_confidences": [...],
    "warnings": [],
    "source_files": [...]
  }
}
```

**Timeout:** 30 seconds

**Retry Logic:**
- If timeout or 5xx error → Retry 3 times
- If 4xx error → Don't retry (bad request)

---

### 2.2 FastAPI Reception & Validation

#### Endpoint: POST /api/v1/claims/from-n8n

**Purpose:** Receive extraction from n8n, validate, store.

**Request Handler Logic:**
```
1. Check idempotency key (request_id)
   - If exists → Return existing claim
   - If not → Continue

2. Validate extraction against Pydantic schema
   - If invalid → Return 400 with specific errors
   - If valid → Continue

3. Check confidence threshold
   - Load threshold from config: extraction.min_confidence
   - If below threshold → Mark needs_review = true

4. Update claim record in database
   NOTE: The claim row was already created with status='submitted' and
   extraction_raw='{}' when the initial POST /api/v1/claims was received.
   This step updates the existing row atomically:
     - Write ALL normalized columns from validated extraction
       (claimant_name, incident_date, incident_type, incident_description,
        claimed_amount, provider_name, invoice_number, claimant_phone)
     - Write extraction_raw = verbatim validated n8n payload (written ONCE here;
       never overwritten again — this is the permanent audit copy)
     - Write extraction_confidence, extraction_warnings
     - Transition status: 'extracting' → 'extracted'
     - This UPDATE is conditional on current status = 'extracting' to guard
       against concurrent workers

5. Queue for Layer 2 processing
   - Add to Celery queue
   - Return immediately (async processing)

6. Return response:
   {
     "claim_id": "UUID",
     "status": "extracted",
     "needs_review": true/false,
     "estimated_processing_time": "30 seconds"
   }
```

---

### 2.3 Pydantic Schema Definition

**Requirements:**

```python
# Strict validation rules

class ClaimantInfo(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, regex=r'^\+?[\d\s\-\(\)]+$')
    email: Optional[EmailStr] = None
    
class IncidentInfo(BaseModel):
    date: date
    type: Literal["accident", "illness", "theft", "damage", "other"]
    description: str = Field(..., min_length=10)
    location: Optional[str] = None
    
    @validator('date')
    def validate_date(cls, v):
        if v > date.today():
            raise ValueError("Incident date cannot be in future")
        if v < date.today() - timedelta(days=730):  # 2 years
            raise ValueError("Incident date too old")
        return v

class FinancialInfo(BaseModel):
    claimed_amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    provider_name: Optional[str] = None
    invoice_number: Optional[str] = None
    
    @validator('claimed_amount')
    def validate_amount(cls, v):
        if v > 1000000:  # Sanity check
            raise ValueError("Amount exceeds reasonable limit")
        return v

class ClaimExtraction(BaseModel):
    policy_number: str = Field(..., min_length=1, max_length=100)
    claimant: ClaimantInfo
    incident: IncidentInfo
    financial: FinancialInfo
    
    class Config:
        # Strict mode: extra fields not allowed
        extra = "forbid"
```

---

### 2.4 Error Handling Requirements

**Timeout Scenarios:**
- Gemini API timeout (>60s) → Retry once → Manual review if fails again
- Groq Whisper timeout (>90s) → Retry once → Manual review if fails again

**API Error Scenarios:**
- 429 Rate Limit → Exponential backoff (1s, 2s, 4s) → Queue if still failing
- 401/403 Auth Error → Alert admin → Block further processing
- 500 Server Error → Retry 3 times → Manual review

**File Processing Errors:**
- Corrupted PDF → Detect via header check → Reject with clear error
- Unsupported format → Reject immediately with supported formats list
- File too large (>50MB) → Reject before sending to AI

**JSON Parsing Errors:**
- Invalid JSON response → Retry with enhanced prompt → Manual review if fails
- Missing required fields → Add to warnings → Lower confidence → Proceed if threshold met

---

### Validation Criteria

**Test 1: Valid Extraction**
- Input: Clean PDF with all fields
- Expected: overall_confidence > 0.9, no warnings
- Claim status: `extracted`
- Backend receives data, validates, stores normalized columns, writes extraction_raw

**Test 2: Low Confidence**
- Input: Poor quality scan
- Expected: overall_confidence < 0.85
- Backend marks needs_review = true
- Routes to manual review queue

**Test 3: Invalid Data**
- Input: Incident date in future
- Expected: Pydantic validation fails
- Returns 400 error with specific message

**Test 4: API Timeout**
- Simulate: Gemini API takes 70 seconds
- Expected: Timeout after 60s, retry once, then manual review

**Test 5: Duplicate Submission**
- Input: Same request_id twice
- Expected: Second request returns existing claim_id (no duplicate created)

**Definition of Done:**
- n8n workflow processes all 4 file types
- All files routed correctly
- Valid JSON extracted
- Schema validation works
- Confidence scoring accurate
- Idempotency works
- Errors handled gracefully
- Tests pass

---

## Component 3: Layer 2 - Policy Governance Engine

### Goal
Apply deterministic policy rules to determine coverage and calculate benefits with complete reproducibility.

### Critical Requirements

**1. Pure Functions Only**
- Given same input + same rule version → ALWAYS same output
- No randomness, no external API calls, no timestamps in logic

**2. Version Control**
- Rules tied to effective dates
- Claims use rule version from incident date, NOT processing date

**3. Complete Calculation Trail**
- Every step logged in human-readable format
- Audit trail shows exact math performed

---

### 3.1 Policy Rule Loading

**Function Signature:**
```
load_policy_rules(policy_id: UUID, incident_date: date) → PolicyRules
```

**Logic:**
```
1. Query policies table for policy_id
2. Get rules_version from policy record
3. Query policy_rules table WHERE:
   - version = rules_version
   - effective_from <= incident_date
   - (effective_to IS NULL OR effective_to > incident_date)
4. If no matching rules found → ERROR (cannot process claim)
5. Parse rules_definition JSONB → PolicyRules object
6. Return PolicyRules
```

**Edge Cases:**
- Policy not found → Return error: "Invalid policy"
- No rules for incident date → Return error: "No rules for date [date]"
- Multiple rules match (shouldn't happen) → Return error: "Ambiguous rules"

---

### 3.2 Validation Rules Execution

**Purpose:** Check basic eligibility before coverage/benefit calculation.

**Common Validation Rules:**
```json
{
  "validation_rules": [
    {
      "check": "incident_date >= policy_start_date",
      "error": "Incident occurred before policy started"
    },
    {
      "check": "incident_date <= policy_end_date",
      "error": "Incident occurred after policy ended"
    },
    {
      "check": "claimed_amount > 0",
      "error": "Claimed amount must be positive"
    }
  ]
}
```

**Execution Logic:**
```
FOR EACH rule IN validation_rules:
    IF rule.check evaluates to FALSE:
        RETURN PolicyDecision(
            decision="rejected",
            rejection_reason=rule.error,
            rules_applied=["validation_failed"]
        )
    ELSE:
        ADD rule.check to rules_applied
RETURN "validation_passed"
```

**Important:** Fail fast. Stop at first failed validation.

---

### 3.3 Coverage Category Matching

**Purpose:** Determine if incident type is covered.

**Input:** incident_type from claim

**Mapping (configurable):**
```json
{
  "category_mapping": {
    "accident": "accident_coverage",
    "illness": "medical_coverage",
    "dental_issue": "dental_coverage",
    "theft": "property_coverage",
    "damage": "property_coverage"
  }
}
```

**Logic:**
```
1. Map incident_type to category name
2. Check if category exists in rules_definition.coverage_categories
3. Check if category.covered == true
4. If any check fails → Reject with reason

Example rejection reasons:
- "Incident type 'dental_issue' not found in policy"
- "Category 'dental_coverage' is not covered under this policy"
```

**Output:**
```
coverage_category: str (e.g., "medical_coverage")
category_rules: CoverageCategory object
```

---

### 3.4 Waiting Period Check

**Purpose:** Ensure coverage has activated.

**Logic:**
```
days_since_policy_start = incident_date - policy_start_date
waiting_period = category_rules.waiting_period_days

IF days_since_policy_start < waiting_period:
    REJECT with reason: "Waiting period not met. Required: {waiting_period} days, Elapsed: {days_since_policy_start} days"
```

**Edge Case:** Emergency coverage (bypass waiting period) - handled via special category or flag.

---

### 3.5 Exclusion Check

**Purpose:** Ensure claim doesn't fall under policy exclusions.

**Method:** Keyword matching in incident_description

**Logic:**
```
description_lower = incident_description.lower()

FOR EACH exclusion IN category_rules.exclusions:
    IF exclusion.lower() IN description_lower:
        REJECT with reason: "Excluded procedure: {exclusion}"
        
PASS (no exclusions matched)
```

**Limitations:**
- Simple keyword matching (not NLP)
- May have false positives (word appears but different context)
- Document this limitation

**Example:**
```
Exclusions: ["cosmetic", "experimental"]
Description: "Cosmetic surgery for scar removal"
Result: REJECTED (keyword "cosmetic" found)
```

---

### 3.6 Benefit Calculation

**Goal:** Calculate insurer's payment amount.

**Steps:**

**Step 1: Apply Copay**
```
IF copay_percentage exists:
    insurer_percentage = 1.0 - (copay_percentage / 100)
    amount_after_copay = claimed_amount * insurer_percentage
    LOG: "Applied {copay_percentage}% copay: ${claimed_amount} × {insurer_percentage} = ${amount_after_copay}"

ELSE IF copay_fixed exists:
    amount_after_copay = claimed_amount - copay_fixed
    LOG: "Applied fixed copay: ${claimed_amount} - ${copay_fixed} = ${amount_after_copay}"
    
ELSE:
    amount_after_copay = claimed_amount
    LOG: "No copay applied"
```

**Step 2: Apply Per-Incident Limit**
```
IF per_incident_limit exists:
    benefit = min(amount_after_copay, per_incident_limit)
    IF amount_after_copay > per_incident_limit:
        LOG: "Applied per-incident limit: min(${amount_after_copay}, ${per_incident_limit}) = ${benefit}"
ELSE:
    benefit = amount_after_copay
```

**Step 3: Check Annual Limit Remaining**
```sql
-- "Used" = only claims that have been paid (finalized + auto_approve).
-- Pending reviews, fraud investigations, and under_review claims are NOT counted
-- as used until they are approved and finalized.
-- (Patch 7: replaced old status IN ('finalized','under_review','fraud_investigation'))
SELECT COALESCE(SUM(approved_amount), 0) AS used_this_year
FROM claims
WHERE policy_id             = :policy_id
  AND EXTRACT(YEAR FROM incident_date) = EXTRACT(YEAR FROM :current_incident_date::date)
  AND status                = 'finalized'
  AND final_decision        = 'auto_approve'
  AND approved_amount       IS NOT NULL;

used_this_year = query_result  -- 0 if no approved claims yet
remaining = annual_limit - used_this_year

IF remaining <= 0:
    REJECT with reason: "Annual limit exhausted. Limit: ${annual_limit}, Used: ${used_this_year}"

IF benefit > remaining:
    benefit = remaining
    LOG: "Adjusted for annual limit: ${benefit} (remaining from ${annual_limit})"
```

**Step 4: Round and Return**
```
benefit = round(benefit, 2)
LOG: "Final benefit amount: ${benefit}"
```

---

### 3.7 Output Format

**PolicyDecisionOutput:**
```json
{
  "decision": "approved | rejected | ambiguous",
  "benefit_amount": 1200.00,
  "rejection_reason": null,
  "rules_applied": [
    "validation_check",
    "coverage_category:medical_coverage",
    "waiting_period_check",
    "exclusion_check",
    "benefit_calculation"
  ],
  "calculation_trail": [
    "Claimed amount: $1,500.00",
    "Applied 20% copay: $1,500.00 × 0.80 = $1,200.00",
    "Applied per-incident limit: min($1,200.00, $5,000.00) = $1,200.00",
    "Checked annual limit: $50,000.00 - $12,000.00 used = $38,000.00 remaining",
    "Final benefit: $1,200.00"
  ],
  "policy_version": "v2.3",
  "coverage_category": "medical_coverage",
  "annual_limit_remaining": 36800.00
}
```

---

### 3.8 Edge Cases

**Ambiguous Decision:**
- Network requirement exists but provider not in database → AMBIGUOUS (manual review)
- Prior authorization required but cannot verify if obtained → AMBIGUOUS

**Policy Changes Mid-Year:**
- Rules changed on June 1
- Claim incident on May 15, submitted on June 5
- Use rules version effective on May 15 (incident date), NOT June 5

**Retroactive Claims:**
- Policy ended Dec 31, 2023
- Claim submitted Jan 15, 2024 for incident on Dec 1, 2023
- VALID if within submission window (configurable, e.g., 90 days)

**Missing Provider Info:**
- If network_required = true but provider_name is null → Cannot auto-approve
- Decision: AMBIGUOUS (manual review to verify network status)

---

### Validation Criteria

**Test 1: Valid Claim**
- Input: Claim within all limits
- Expected: decision="approved", benefit calculated correctly
- Calculation trail present

**Test 2: Policy Violation**
- Input: Incident before policy start
- Expected: decision="rejected", specific reason given

**Test 3: Exclusion**
- Input: Description contains "cosmetic"
- Expected: decision="rejected", reason="Excluded: cosmetic"

**Test 4: Annual Limit Exhausted**
- Setup: Policy used $49,000 of $50,000 limit
- Input: New claim for $3,000
- Expected: decision="approved", benefit=$1,000 (remaining)

**Test 5: Ambiguous Case**
- Input: Network required, provider unknown
- Expected: decision="ambiguous"

**Test 6: Reproducibility**
- Process same claim twice (different times)
- Expected: IDENTICAL outputs (same benefit, same trail)

**Definition of Done:**
- Loads correct rule version
- Validation rules execute correctly
- Coverage check works
- Exclusion check works
- Benefit calculation accurate
- Complete calculation trail
- All tests pass
- Zero randomness (pure function)

---

## Component 4: Layer 3 - Fraud Intelligence

### Goal
Detect fraud through three cascading tiers with explainable evidence.

---

### 4.1 Tier 1: Rule-Based Checks

**Goal:** Fast, cheap, high-precision SQL-based fraud detection.

#### Check 1: Duplicate Invoice

> **Day-0 patch applied:** Uses normalized column `invoice_number` directly. The original `financial->>'invoice_number'` JSON path is removed. See Day-0 Fix A.

**Query:**
```sql
SELECT id AS claim_id, submitted_at
FROM claims
WHERE invoice_number = :invoice_number
  AND id != :current_claim_id
LIMIT 1
```

**Logic:**
```
IF query returns result:
    RETURN FraudFlag(
        flag_type="duplicate_invoice",
        severity="high",
        description="Invoice {invoice_number} previously used in claim {claim_id}",
        evidence={
            "invoice_number": invoice_number,
            "original_claim_id": result.claim_id,
            "original_date": result.submitted_at
        }
    )
```

---

#### Check 2: Velocity Anomaly

**Query:**
```sql
SELECT COUNT(*) as claim_count
FROM claims
WHERE claimant_name = :claimant_name
  AND submitted_at > NOW() - INTERVAL '7 days'
  AND id != :current_claim_id
```

**Logic:**
```
threshold = config.get("fraud.tier1.velocity_threshold", default=5)

IF claim_count > threshold:
    RETURN FraudFlag(
        flag_type="velocity_anomaly",
        severity="high",
        description="{claimant_name} submitted {claim_count} claims in 7 days",
        evidence={
            "claimant_name": claimant_name,
            "claim_count": claim_count,
            "threshold": threshold
        }
    )
```

---

#### Check 3: Amount Anomaly (Statistical Outlier)

> **Day-0 patch applied:** Uses normalized column `incident_type` directly. The original `incident->>'type'` JSON path is removed. Uses canonical status values. See Day-0 Fix A, D.

**Query:**
```sql
SELECT 
    AVG(claimed_amount) as mean,
    STDDEV(claimed_amount) as stddev,
    COUNT(*) as sample_count
FROM claims
WHERE incident_type = :incident_type
  AND status IN ('finalized', 'under_review', 'fraud_investigation')
  AND claimed_amount IS NOT NULL
```

**Logic:**
```
IF result.count < 30:
    SKIP (insufficient data for statistics)

threshold = mean + (3 * stddev)

IF claimed_amount > threshold:
    z_score = (claimed_amount - mean) / stddev
    RETURN FraudFlag(
        flag_type="amount_anomaly",
        severity="medium",
        description="Amount ${claimed_amount} is {z_score:.1f} std devs above mean",
        evidence={
            "claimed_amount": claimed_amount,
            "mean": mean,
            "stddev": stddev,
            "z_score": z_score
        }
    )
```

---

#### Tier 1 Score Calculation

**Logic:**
```
IF no flags:
    score = 0.0
ELSE:
    severity_weights = {"high": 0.8, "medium": 0.5, "low": 0.2}
    flag_scores = [severity_weights[flag.severity] for flag in flags]
    score = max(flag_scores)  # Use highest, don't add
```

**Why max not sum:** Multiple flags may indicate same underlying fraud. Don't double-count.

---

### 4.2 Tier 2: Vector Similarity

**Goal:** Detect reused content via embeddings.

#### Image Similarity

**Process:**
```
1. For each image in claim:
   a. Convert to base64
   b. Call Jina AI API:
      POST https://api.jina.ai/v1/embeddings
      Headers: Authorization: Bearer {JINA_API_KEY}
      Body: {
        "input": [{"image": base64_image}],
        "model": "jina-clip-v1"
      }
      Timeout: 30 seconds
   
   c. Extract embedding (512-dim vector)
   
   d. Search Qdrant:
      collection: "claim_images"
      query_vector: embedding
      limit: 5
      score_threshold: config.get("fraud.tier2.image_similarity_threshold", 0.95)
   
   e. For each result with score > threshold:
      - Verify it's not same claim (compare claim_ids)
      - If different claim → Add to duplicates list
```

**Error Handling:**
```
IF Jina API timeout:
    Log error
    Retry once
    If still fails → Set image_similarity = 0.0 (don't penalize for infra issues)

IF Jina API rate limit (429):
    Exponential backoff (1s, 2s, 4s)
    Max 5 retries
    If exhausted → Queue for later, return temp score = 0.0

IF Jina API auth error (401):
    Alert admin
    Block further processing (critical failure)
```

---

#### Text Similarity

**Process:**
```
1. Extract incident_description from claim

2. Call Cohere API:
   POST https://api.cohere.ai/v1/embed
   Headers: Authorization: Bearer {COHERE_API_KEY}
   Body: {
     "texts": [incident_description],
     "model": "embed-english-v3.0",
     "input_type": "search_query"
   }
   Timeout: 30 seconds

3. Extract embedding (1024-dim vector)

4. Search Qdrant:
   collection: "claim_texts"
   query_vector: embedding
   limit: 5
   score_threshold: config.get("fraud.tier2.text_similarity_threshold", 0.90)

5. For each result with score > threshold:
   - Verify different claim
   - Add to duplicates list
```

**Same error handling as image similarity.**

---

#### Embedding Storage

> **Day-0 patch applied:** Point IDs are stable UUIDs derived via UUID5 (namespace + deterministic seed), not raw hashes. Payloads store `claim_id` (UUID) as the sole claim reference — no `policy_number`. See Day-0 Fix B.

**After Analysis (even if claim rejected):**
```
Store in Qdrant:

For images:
  collection: "claim_images"
  id: uuid5(NAMESPACE_URL, f"{claim_id}:image:{image_index}")
      -- UUID5 is deterministic and collision-resistant; safe to recompute on retry
  vector: embedding
  payload: {
    "claim_id": claim_id,          -- UUID only; never policy_number
    "document_id": document_id,    -- UUID of the claim_documents row
    "image_index": image_index,    -- position within this claim's images
    "image_hash": sha256(image_bytes),
    "uploaded_at": timestamp
  }

For text:
  collection: "claim_texts"
  id: uuid5(NAMESPACE_URL, f"{claim_id}:text")
      -- One text embedding per claim; UUID5 guarantees idempotent upsert
  vector: embedding
  payload: {
    "claim_id": claim_id,          -- UUID only; never policy_number
    "text_snippet": description[:500],
    "incident_type": incident_type,
    "uploaded_at": timestamp
  }
```

**Why UUID5 over raw hash:**
- UUID5 output is a valid UUID (128-bit, formatted correctly for Qdrant's UUID point ID type)
- Deterministic: same inputs always produce the same UUID — retries safely overwrite the same point
- No truncation or encoding ambiguity that raw `sha256[:16]` byte-slicing can introduce
- Standard library available in Python (`uuid.uuid5`), Node.js (`uuid` package), and Go (`github.com/google/uuid`)

---

#### Tier 2 Score Calculation

**Logic:**
```
max_image_sim = max([d['similarity'] for d in duplicates if d['type']=='image'], default=0.0)
max_text_sim = max([d['similarity'] for d in duplicates if d['type']=='text'], default=0.0)

score = (0.6 * max_image_sim) + (0.4 * max_text_sim)
```

---

### 4.3 Tier 3: Graph Network Analysis

**Goal:** Detect fraud rings through relationship patterns.

#### Graph Node Creation

> **Day-0 patch applied:** `Claim` nodes merge on `{id: $claim_id}` (UUID) only — never `policy_number`. Uniqueness constraints defined explicitly. See Day-0 Fix B.

**One-time setup — run before any data is written:**
```cypher
// Uniqueness constraints (also create indexes automatically in Neo4j 4+)
CREATE CONSTRAINT claim_id_unique  IF NOT EXISTS FOR (c:Claim)    REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person)   REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT provider_name_unique IF NOT EXISTS FOR (p:Provider) REQUIRE p.name IS UNIQUE;
CREATE CONSTRAINT contact_value_unique IF NOT EXISTS FOR (c:Contact)  REQUIRE c.value IS UNIQUE;
```

**When claim processed, add to Neo4j:**
```cypher
// Create Claim node — id is claims.id (UUID), never policy_number
MERGE (claim:Claim {id: $claim_id})
SET claim.claim_number = $claim_number,
    claim.amount       = $claimed_amount,
    claim.date         = date($incident_date)

// Create Person node — id is a generated UUID per unique claimant, never name string
MERGE (person:Person {id: $person_id})
SET person.name = $claimant_name

// Create relationship
MERGE (person)-[:FILED {filed_at: datetime()}]->(claim)

// Add Provider if present
FOREACH (provider IN CASE WHEN $provider_name IS NOT NULL THEN [$provider_name] ELSE [] END |
  MERGE (p:Provider {name: provider})
  MERGE (claim)-[:TREATED_BY]->(p)
)

// Add Contact if present (hash PII before storing)
FOREACH (phone IN CASE WHEN $phone IS NOT NULL THEN [$phone] ELSE [] END |
  MERGE (c:Contact {value: $phone_hash, type: 'phone'})
  MERGE (person)-[:HAS_CONTACT]->(c)
)

// Add Invoice if present
FOREACH (inv IN CASE WHEN $invoice_number IS NOT NULL THEN [$invoice_number] ELSE [] END |
  MERGE (f:Financial {identifier: inv, type: 'invoice'})
  MERGE (claim)-[:REFERENCES]->(f)
)
```

**Critical:**
- `$claim_id` is always `claims.id` (UUID). `policy_number` is never passed to Neo4j as a node identifier.
- `$person_id` is a UUID looked up or generated in Postgres (e.g., a `claimants` table or a hash-to-UUID mapping) — never the raw claimant name string.
- `$phone_hash` is `sha256(phone_number)` — PII is hashed before graph storage.

---

#### Fraud Pattern Queries

**Pattern 1: High-Velocity Provider**
```cypher
MATCH (provider:Provider)<-[:TREATED_BY]-(claim:Claim)
WHERE claim.date > date() - duration('P7D')
WITH provider, count(claim) as claim_count
WHERE claim_count > $threshold
RETURN provider.name, claim_count
```

**Threshold:** config.get("fraud.tier3.provider_velocity_threshold", default=10)

**If matched:**
```
RETURN {
  "pattern": "high_velocity_provider",
  "severity": "high",
  "description": "Provider '{name}' linked to {count} claims in 7 days",
  "risk_score": 0.8
}
```

---

**Pattern 2: Shared Contact**
```cypher
MATCH (person:Person)-[:HAS_CONTACT]->(contact:Contact)
WITH contact, count(DISTINCT person) as person_count
WHERE person_count > $threshold
RETURN contact.value, contact.type, person_count
```

**Threshold:** config.get("fraud.tier3.shared_contact_threshold", default=3)

**If matched:**
```
RETURN {
  "pattern": "shared_contact",
  "severity": "medium",
  "description": "Contact shared by {count} people",
  "risk_score": 0.7
}
```

---

**Pattern 3: Circular Banking**
```cypher
MATCH (person:Person)-[:HAS_ACCOUNT]->(account:Financial {type: 'bank_account'})
WITH account, count(DISTINCT person) as person_count
WHERE person_count > $threshold
RETURN account.identifier, person_count
```

**Threshold:** config.get("fraud.tier3.shared_account_threshold", default=2)

**Risk Score:** 0.9 (bank accounts rarely legitimately shared)

---

**Pattern 4: Network Size**
```cypher
MATCH (person:Person {id: $person_id})-[:HAS_CONTACT|FILED|HAS_ACCOUNT*1..2]-(connected)
RETURN count(DISTINCT connected) as network_size
```

**Logic:**
```
IF network_size > config.get("fraud.tier3.large_network_threshold", default=10):
    ADD risk signal (score = 0.3)
```

---

#### Error Handling

```
IF Neo4j query timeout (>5 seconds):
    Log warning
    Return partial results
    Don't fail entire fraud check

IF Neo4j connection failed:
    Log error
    Alert admin
    Set tier3_score = 0.0 (don't block claim for infra issues)
    
IF Cypher query error (syntax, etc):
    Log error with full query
    Alert developer
    Set tier3_score = 0.0
```

---

#### Tier 3 Score Calculation

**Logic:**
```
IF no risk_signals:
    score = 0.3 IF network_size > 10 ELSE 0.0
ELSE:
    avg_risk = average([signal['risk_score'] for signal in risk_signals])
    score = avg_risk
    
    IF network_size > 10:
        score = min(score * 1.2, 1.0)  # Boost if large network

RETURN score
```

---

### 4.4 Fraud Fusion

**Goal:** Combine three tier scores into single fraud risk score.

**Load Weights from Config:**
```
weights = config.get("fraud.fusion.weights", default=[0.3, 0.3, 0.4])
w1, w2, w3 = weights

VALIDATE:
  - weights is array of 3 numbers
  - sum(weights) ≈ 1.0 (within 0.01 tolerance)
  - all weights >= 0

IF validation fails:
  Log error
  Use default weights [0.3, 0.3, 0.4]
```

**Calculate Combined Score:**
```
combined_score = (w1 * tier1_score) + (w2 * tier2_score) + (w3 * tier3_score)
combined_score = clamp(combined_score, 0.0, 1.0)
```

**Determine Risk Level:**
```
IF combined_score < config.get("fraud.low_threshold", 0.3):
    risk_level = "low"
    recommendation = "proceed"
ELSE IF combined_score < config.get("fraud.high_threshold", 0.7):
    risk_level = "medium"
    recommendation = "review"
ELSE:
    risk_level = "high"
    recommendation = "investigate"
```

**Generate Explanation:**
```
IF risk_level == "high":
    Get top 3 most severe flags across all tiers
    explanation = "High fraud score due to: " + join(top_flags, ", ")
ELSE IF risk_level == "medium":
    explanation = "Moderate fraud indicators detected"
ELSE:
    explanation = "No significant fraud indicators"
```

---

### Validation Criteria

**Test 1: Duplicate Invoice (Tier 1)**
- Setup: Invoice "INV-123" already in database
- Input: New claim with same invoice
- Expected: Tier 1 flags it, score ≥ 0.8

**Test 2: Image Reuse (Tier 2)**
- Setup: Image embedded in Qdrant
- Input: Same image (or 98% similar)
- Expected: Tier 2 detects, score ≥ 0.9

**Test 3: Fraud Ring (Tier 3)**
- Setup: 5 people sharing same phone number
- Input: New claim from 6th person with same number
- Expected: Tier 3 flags shared contact pattern

**Test 4: API Timeout**
- Simulate: Cohere API times out
- Expected: Tier 2 score = 0.0, processing continues

**Test 5: Combined Score**
- Tier 1: 0.8 (duplicate invoice)
- Tier 2: 0.0 (no text/image duplication)
- Tier 3: 0.3 (small network)
- Weights: [0.3, 0.3, 0.4]
- Expected: (0.3×0.8) + (0.3×0.0) + (0.4×0.3) = 0.36 (medium risk)

**Definition of Done:**
- All three tiers execute
- Detects duplicate invoices
- Detects similar images/text
- Detects graph patterns
- Handles API failures gracefully
- Weights loaded from config
- Combined score calculated correctly
- All tests pass

---

## Component 5: Layer 4 - Decision Engine

### Goal
Route claim to appropriate queue using economic optimization.

### Decision Tree (Exact Logic)

> **Patch 1+2 applied:** All outcome labels are lowercase `final_decision` values. `→ MANUAL_REVIEW` etc. have been replaced with the canonical enum values.

```
START

IF extraction_confidence < config.get("extraction.min_confidence"):
    → final_decision = 'manual_review', status = 'under_review'
    Reason: "Low extraction confidence: {confidence}"
    STOP

IF policy_decision.decision == "rejected":
    → final_decision = 'auto_reject', status = 'finalized'
    Reason: policy_decision.rejection_reason
    STOP

IF policy_decision.decision == "ambiguous":
    → final_decision = 'manual_review', status = 'under_review'
    Reason: "Policy coverage unclear"
    STOP

IF fraud_score > config.get("fraud.high_threshold"):
    → final_decision = 'fraud_investigation', status = 'fraud_investigation'
    Reason: "High fraud risk ({fraud_score:.2f})"
    STOP

expected_loss = fraud_score * claimed_amount
investigation_cost = config.get("decision.investigation_cost")

IF expected_loss > investigation_cost:
    → final_decision = 'manual_review', status = 'under_review'
    Reason: "Expected loss (${expected_loss:.2f}) exceeds investigation cost (${investigation_cost})"
    STOP

IF fraud_score < config.get("fraud.low_threshold") AND extraction_confidence > config.get("extraction.min_confidence"):
    → final_decision = 'auto_approve', status = 'finalized'
    Reason: "Low fraud risk ({fraud_score:.2f}), high confidence ({extraction_confidence:.2f})"
    STOP

ELSE:
    → final_decision = 'manual_review', status = 'under_review'  (default fail-safe)
    Reason: "Moderate risk/confidence requires review"
    STOP
```

---

### Next Steps Generation

**For `auto_approve`:**
```
[
  "Process payment of ${benefit_amount}",
  "Send approval notification to claimant",
  "Update policy annual limit (${annual_limit_remaining} remaining)",
  "Archive documents"
]
```

**For `auto_reject`:**
```
[
  "Send rejection notice with reason: {rejection_reason}",
  "Include appeal instructions and deadline",
  "Archive documents",
  "No payment processing"
]
```

**For `manual_review`:**
```
[
  "Assign to underwriter review queue",
  "Priority: {confidence_level}",
  "Review focus: {specific_concerns}",
  "Expected SLA: 2 business days"
]

specific_concerns:
  IF low extraction_confidence: "Verify extracted data accuracy"
  IF moderate fraud_score: "Review fraud indicators: {top_2_flags}"
  IF missing data: "Obtain missing information: {missing_fields}"
```

**For `fraud_investigation`:**
```
[
  "Escalate to Special Investigation Unit (SIU)",
  "Freeze payment pending investigation",
  "Review related claims: {graph_connected_claims}",
  "Investigation focus: {fraud_patterns_detected}",
  "Estimated investigation time: 5-10 business days"
]
```

---

### Confidence Level

**Logic:**
```
IF final_decision in ['auto_approve', 'auto_reject'] AND no edge cases:
    confidence_level = "high"
    
ELSE IF final_decision == 'fraud_investigation' AND fraud_score > 0.85:
    confidence_level = "high"
    
ELSE IF final_decision == 'manual_review' AND clear reason:
    confidence_level = "medium"
    
ELSE:
    confidence_level = "low"
```

---

### Output Format

> **Patch 2 applied:** field renamed from `decision` to `final_decision`.
> **Patch 3 applied:** example values now numerically consistent — fraud_score=0.10, claimed_amount=1000 → expected_loss=$100 which is below investigation_cost=$150, correctly yielding `auto_approve`.

```json
{
  "final_decision": "auto_approve",
  "expected_loss": 100.00,
  "investigation_cost": 150.00,
  "benefit_amount": 1200.00,
  "rationale": "Low fraud risk (0.10), high confidence (0.92). Expected loss ($100.00 = 0.10 × $1,000) is below investigation cost ($150.00). Proceeding to auto-approve.",
  "confidence_level": "high",
  "next_steps": ["Process payment of $1200.00", "Send approval notification to claimant"],
  "thresholds_used": {
    "extraction_min_confidence": 0.85,
    "fraud_high_threshold": 0.7,
    "fraud_low_threshold": 0.2,
    "investigation_cost": 150.00
  }
}
```

---

### Validation Criteria

**Test Decision Tree:**

| Scenario | Expected `final_decision` | Expected `status` |
|----------|--------------------------|-------------------|
| confidence=0.75 (below min 0.85) | `manual_review` | `under_review` |
| policy_decision=rejected | `auto_reject` | `finalized` |
| fraud_score=0.85 (above high threshold 0.7) | `fraud_investigation` | `fraud_investigation` |
| fraud=0.15, claimed=$3000, expected_loss=$450 > cost=$150 | `manual_review` | `under_review` |
| fraud=0.10, claimed=$1000, expected_loss=$100 < cost=$150, confidence=0.95 | `auto_approve` | `finalized` |
| Default (no clear path) | `manual_review` | `under_review` |

**Definition of Done:**
- Decision tree implemented correctly
- All thresholds from config
- Economic calculation correct
- Rationale generated
- Next steps appropriate
- Tests pass
- No hardcoded values

---

## Component 6: State Machine & Orchestration

### Goal
Manage claim lifecycle with atomic state transitions and failure recovery.

### State Definitions

> **Day-0 + Patch 2 applied:** State names unified with `claims.status` enum values (lowercase snake_case). Outcome is stored in `claims.final_decision`, never in `claims.status`. The old conflated values (`APPROVED`, `REJECTED`, `REVIEW_QUEUE`, etc.) are removed.

```
Status values (claims.status):

  submitted           → Initial state after upload
  extracting          → Layer 1 in progress
  extracted           → Layer 1 complete, normalized columns + extraction_raw written
  policy_evaluating   → Layer 2 in progress
  fraud_checking      → Layer 3 in progress
  deciding            → Layer 4 in progress
  finalized           → Auto decision made; claims.final_decision = 'auto_approve' | 'auto_reject'
  under_review        → Routed to manual underwriter queue; claims.final_decision = 'manual_review'
  fraud_investigation → Routed to SIU; claims.final_decision = 'fraud_investigation'
  error               → Permanent failure; requires manual intervention; final_decision = NULL

Final decision values (claims.final_decision) — set atomically with terminal status:

  auto_approve        → Straight-through approval; status = 'finalized'
  auto_reject         → Straight-through rejection; status = 'finalized'
  manual_review       → Routed to underwriter queue; status = 'under_review'
  fraud_investigation → Routed to SIU; status = 'fraud_investigation'
```

### State Transition Rules

```
submitted          → extracting          (worker picks up claim)
extracting         → extracted           (Layer 1 succeeds; normalized columns + extraction_raw written)
extracting         → under_review        (Layer 1 fails permanently; final_decision = 'manual_review')

extracted          → policy_evaluating   (Layer 2 starts)
policy_evaluating  → fraud_checking      (policy check passed or ambiguous — Layer 3 proceeds)
policy_evaluating  → finalized           (policy rejected; final_decision = 'auto_reject')
policy_evaluating  → under_review        (policy ambiguous and cannot auto-route; final_decision = 'manual_review')

fraud_checking     → deciding            (Layer 3 completes)
fraud_checking     → under_review        (Layer 3 fails permanently; final_decision = 'manual_review')

deciding           → finalized           (auto outcome; final_decision = 'auto_approve' | 'auto_reject')
deciding           → under_review        (Layer 4 cannot resolve fail-safe; final_decision = 'manual_review')
deciding           → fraud_investigation (high fraud score; final_decision = 'fraud_investigation')

finalized          → under_review        (human escalation of an auto decision)
finalized          → fraud_investigation (SIU escalation post-approval)

Any non-terminal   → error              (unrecoverable system failure; final_decision = NULL)
```

**Invariant:** `status` and `final_decision` are always updated in the same atomic database transaction. They are never written independently.

### Implementation Requirements

**1. Atomic Transitions**
```sql
-- Use canonical lowercase enum values (Day-0 Fix D)
BEGIN;
  UPDATE claims 
  SET status = 'extracting', 
      current_state_context = '{"worker_id": "...", "started_at": "..."}'
  WHERE id = :claim_id 
    AND status = 'submitted';  -- Only transition if in the expected prior state
  
  -- rows_updated = 0 means another worker already claimed it
  IF rows_updated == 0:
    ROLLBACK;
    RAISE error "Invalid state transition or concurrent worker conflict"
  ELSE:
    COMMIT;
```

**2. Idempotent State Changes**
```
IF current_status == target_status:
    RETURN success (no-op, already in that state)
ELSE:
    Attempt transition
```

**3. Retry Logic**
```
FOR EACH layer:
  max_retries = 3
  retry_count = get_from_state_context('retry_count', 0)
  
  TRY:
    Execute layer
    Transition to next state
  CATCH error:
    IF retry_count < max_retries:
      retry_count += 1
      Update state_context with retry_count
      Emit audit_event(stage=current_layer, event_type='retried', payload={attempt, error})
      Exponential backoff (2^retry_count seconds)
      Retry
    ELSE:
      -- Permanent failure: transition atomically
      UPDATE claims SET status='under_review', final_decision='manual_review' WHERE id=:claim_id
      Emit audit_event(stage=current_layer, event_type='failed', payload={max_retries, final_error})
      Log failure
```

**4. Stuck Claim Detection**
```
Background job (runs every 15 minutes):

Find claims WHERE:
  -- All non-terminal statuses (Day-0 Fix D)
  status NOT IN ('finalized', 'under_review', 'fraud_investigation', 'error')
  AND updated_at < NOW() - INTERVAL '1 hour'

FOR EACH stuck_claim:
  Alert admin
  Log error with last known state
  Option to manually retry or move to 'error' status
```

---

### Validation Criteria

**Test 1: Normal Flow**
- Claim progresses: `submitted → extracting → extracted → policy_evaluating → fraud_checking → deciding → finalized`
- No invalid transitions
- Each state transition logged as a new `audit_events` row with timestamp

**Test 2: Layer Failure**
- Layer 1 fails 3 times
- Expected: Claim moves to `under_review`
- Retry count logged in `current_state_context` and as separate `audit_events` rows

**Test 3: Concurrent Access**
- Two workers try to process same claim
- Expected: One succeeds (rows_updated=1), one gets conflict (rows_updated=0)
- No duplicate processing

**Test 4: Resume After Failure**
- Claim stuck in `fraud_checking`
- Manual retry triggered
- Expected: Resumes from `fraud_checking`, not from beginning

**Definition of Done:**
- State machine implemented
- Atomic transitions
- Retry logic works
- Stuck claim detection works
- Tests pass

---

## Component 7: API Implementation

### Critical Endpoints

#### POST /api/v1/claims
**Purpose:** Submit new claim

**Request:**
```
Content-Type: multipart/form-data

files: [File, File, ...]
policy_number: string (optional)
request_id: UUID (for idempotency)
```

**Logic:**
```
1. Validate files:
   - Check file types (allow: pdf, png, jpg, mp4, mp3, wav)
   - Check file sizes (max 50MB each, 200MB total)
   - Scan for viruses (optional but recommended)

2. Check idempotency:
   existing = find_claim_by_idempotency_key(request_id)
   IF existing:
     RETURN existing claim (don't create duplicate)

3. Create claim record:
   claim_id = generate_uuid()
   claim_number = generate_human_readable() // e.g., "CLM-2024-001234"
   INSERT INTO claims (id, claim_number, idempotency_key, status, extraction_raw)
   VALUES (claim_id, claim_number, request_id, 'submitted', '{}')
   -- extraction_raw starts as '{}' NOT NULL; written fully only after Layer-1 succeeds

4. Store files + sha256 deduplication:
   FOR EACH uploaded file:
     sha256 = sha256_hex(file_bytes)
     Save to storage (S3 or local), record storage_key
     INSERT INTO claim_documents (claim_id, storage_key, sha256, file_name, ...)
     
     -- Cross-claim duplicate document detection (Patch 9):
     existing = SELECT claim_id FROM claim_documents
                WHERE sha256 = :sha256 AND claim_id != :current_claim_id
                LIMIT 1
     IF existing:
       -- Do NOT auto-reject. Create a Tier-1 fraud flag instead (fail-safe rule).
       -- The flag is passed to Layer 3 for scoring; decision is deferred to Layer 4.
       queue_fraud_flag(
         claim_id=current_claim_id,
         flag_type="duplicate_document",
         severity="high",
         evidence={"sha256": sha256, "previous_claim_id": existing.claim_id}
       )

5. Queue for processing:
   Send to n8n webhook OR Celery queue

6. Return response:
   {
     "claim_id": "UUID",
     "claim_number": "CLM-2024-001234",
     "status": "submitted",
     "estimated_processing_time": "30-60 seconds"
   }
```

**Status Codes:**
- 201 Created (success)
- 400 Bad Request (invalid files/data)
- 413 Payload Too Large (files too big)
- 429 Too Many Requests (rate limit)

---

#### GET /api/v1/claims/{claim_id}
**Purpose:** Get claim status and details

**Response:**
```json
{
  "claim_id": "UUID",
  "claim_number": "CLM-2024-001234",
  "status": "finalized",
  "final_decision": "auto_approve",
  "benefit_amount": 1200.00,
  "extraction_confidence": 0.92,
  "fraud_score": 0.10,
  "submitted_at": "2024-02-19T10:00:00Z",
  "processed_at": "2024-02-19T10:00:45Z",
  "decision_output": { "rationale": "...", "next_steps": ["..."] }
}
```

**Status Codes:**
- 200 OK
- 404 Not Found

---

#### POST /api/v1/claims/{claim_id}/feedback
**Purpose:** Submit human review feedback

**Request:**
```json
{
  "reviewed_by": "user_id",
  "system_decision": "auto_approve",
  "human_decision": "reject",
  "feedback_category": "fraud_missed",
  "feedback_notes": "Found duplicate invoice that system missed"
}
```

**Logic:**
```
1. Validate claim exists
2. Validate reviewer has permissions
3. Insert into feedback table
4. Mark claim as reviewed
5. If disagreement, flag for retraining
```

---

### Rate Limiting

**Per IP:** 100 requests/minute
**Per User:** 500 requests/minute

**Implementation:**
```
Use Redis for rate limit tracking:

key = f"rate_limit:{ip_address}"
current = redis.get(key) OR 0

IF current >= limit:
    RETURN 429 Too Many Requests
    Headers: {
      "X-RateLimit-Limit": 100,
      "X-RateLimit-Remaining": 0,
      "X-RateLimit-Reset": timestamp
    }
ELSE:
    redis.incr(key)
    redis.expire(key, 60)  # 1 minute window
```

---

## Component 8: Frontend Requirements

### Pages Needed

**1. Claim Submission Page**
- File upload (drag & drop)
- Policy number input (optional)
- Progress indicator
- Success confirmation with claim number

**2. Dashboard**
- List of claims (table)
- Filters: status, date range
- Search by claim number
- Pagination
- Auto-refresh every 30s

**3. Claim Details Page**
- All extracted data
- Policy decision
- Fraud analysis (scores, flags)
- Final decision
- Complete audit trail
- Uploaded documents (download links)

**4. Review Queue (For Underwriters)**
- Claims needing review
- Priority sorting (high risk first)
- Claim details inline
- Decision form (approve/reject/request more info)
- Feedback form

**5. Fraud Network Visualization**
- Graph canvas (React Flow or D3)
- Node types: Claim, Person, Provider, Contact
- Edge types: FILED, TREATED_BY, HAS_CONTACT
- Highlight suspicious patterns

---

### User Experience Requirements

**Loading States:**
- Skeleton loaders for data fetching
- Spinner for submit actions
- Progress bar for file upload

**Error Handling:**
- User-friendly error messages
- Retry buttons for failed requests
- Offline detection

**Accessibility:**
- ARIA labels
- Keyboard navigation
- Screen reader support
- WCAG AA compliance

---

## Testing Requirements

### Unit Tests

**What to Test:**
- Policy benefit calculation
- Fraud score fusion
- Schema validation
- State transitions

**How:**
```python
def test_benefit_calculation():
    claim = create_mock_claim(amount=1000, copay=20)
    policy = create_mock_policy(copay_percentage=20)
    
    result = calculate_benefit(claim, policy)
    
    assert result.benefit_amount == 800  # 1000 * 0.8
    assert "Applied 20% copay" in result.calculation_trail
```

---

### Integration Tests

**What to Test:**
- API endpoints
- Database operations
- Layer interactions

**Example:**
```python
def test_claim_submission_flow():
    # Submit claim
    response = client.post("/api/v1/claims", files=test_files)
    assert response.status_code == 201
    claim_id = response.json()["claim_id"]
    
    # Wait for processing
    time.sleep(5)
    
    # Check status
    response = client.get(f"/api/v1/claims/{claim_id}")
    assert response.json()["status"] in ["finalized", "under_review", "fraud_investigation"]
```

---

### End-to-End Tests

**Scenarios:**
1. Valid claim → Approved
2. Duplicate invoice → Fraud investigation
3. Policy violation → Rejected
4. Low confidence → Manual review

---

## Security Checklist

**1. Input Validation**
- ✓ File type validation
- ✓ File size limits
- ✓ SQL injection prevention (use parameterized queries)
- ✓ XSS prevention (sanitize outputs)

**2. Authentication**
- ✓ API key for programmatic access
- ✓ Session management for web UI
- ✓ Role-based access control

**3. Data Protection**
- ✓ Encrypt PII at rest
- ✓ HTTPS only (TLS 1.2+)
- ✓ Hash sensitive data in graph (phone, accounts)

**4. Secrets Management**
- ✓ API keys in environment variables
- ✓ Never log API keys
- ✓ Rotate keys periodically

---

## Deployment Checklist

**Pre-Deployment:**
- ✓ All tests pass
- ✓ Database migrations tested
- ✓ Environment variables set
- ✓ Secrets in secure storage
- ✓ Monitoring configured

**Deployment Steps:**
1. Run migrations on staging
2. Deploy to staging
3. Run smoke tests
4. Deploy to production (blue-green)
5. Monitor error rates
6. Rollback plan ready

---

## Success Criteria (Definition of Done)

### Functional Completeness
✓ All 5 layers implemented
✓ All file types supported (PDF, image, video, audio)
✓ State machine works
✓ Idempotency works
✓ Configuration in database (no hardcoded values)
✓ Complete audit trail
✓ Feedback collection works

### Quality Standards
✓ All thresholds configurable
✓ All IDs correct (UUIDs, not policy numbers)
✓ Schema validation enforced
✓ Timeout handling on all APIs
✓ Retry logic implemented
✓ Error messages helpful
✓ Complete calculation trails

### Performance
✓ End-to-end processing < 60 seconds
✓ API responses < 500ms
✓ Handles 100 concurrent claims
✓ Database queries optimized (indexed)

### Testing
✓ Unit tests: 80%+ coverage
✓ Integration tests pass
✓ End-to-end tests pass
✓ Edge cases tested

### Demo Ready
✓ Can submit claim live
✓ Shows all layer outputs
✓ Fraud network visualizes
✓ Review workflow works
✓ No critical bugs

---

## Strict Roadmap Rules

These rules are derived from the Day-0 Fixes and must be enforced in code review for the lifetime of the project. Any PR that violates these is rejected without exception.

### Identity Rules
- **`claims.id` (UUID) is the sole claim identifier across all systems.** It is the primary key in Postgres, the `claim_id` field in every Qdrant payload, the `{id: $claim_id}` property on Neo4j `Claim` nodes, and the `claim_id` foreign key in `audit_events`. No other field serves this purpose.
- **`policy_number` is display-only.** It must never appear as a node ID, a Qdrant point ID, a WHERE clause join key between systems, or in any cross-system reference. It is a field on `claims`, nothing more.
- **Neo4j `Person` nodes use a generated UUID as `id`**, not the claimant name string. The name is a property, not an identity.

### Schema Rules
- **Normalized columns only in WHERE clauses.** `invoice_number`, `incident_type`, `claimed_amount`, `provider_name`, `claimant_name` are columns on `claims`. Never query them via JSON path operators (`->`, `->>`). `extraction_raw` is write-once and never used in business logic queries.
- **`extraction_raw` is written exactly once** — during the `extracting → extracted` transition. It is set to `'{}'` at claim creation (`submitted`), then updated once with the full verbatim Layer-1 payload. It is never overwritten again and never queried for logic.
- **All timestamps are `TIMESTAMPTZ`.** Any migration that introduces a `TIMESTAMP WITHOUT TIME ZONE` column is rejected.
- **All monetary fields have `CHECK (field > 0 OR field IS NULL)`.** All 0..1 float fields (confidence, fraud_score) have `CHECK (field BETWEEN 0.0 AND 1.0 OR field IS NULL)`.

### Deduplication Rules (Patch 9)
- **`idempotency_key` prevents duplicate claim submissions** from the same client request. Check it before any INSERT.
- **`sha256` per document detects reused files across claims.** Stored in `claim_documents.sha256` (hex SHA-256 of raw file bytes). Indexed for fast cross-claim lookup.
- **A duplicate document SHA-256 across different claims creates a Tier-1 fraud flag — it does NOT auto-reject.** The fail-safe principle applies: route to fraud scoring, let Layer 4 decide.
- **Never store raw file bytes in the database.** Files go to object storage (S3 or local filesystem); only the `storage_key` and `sha256` are in Postgres.

### Status & Decision Rules
- **`claims.status` and `claims.final_decision` are separate concerns.** Status is lifecycle position; `final_decision` is outcome. Never put a decision value in the status column or vice versa.
- **Use only the canonical lowercase snake_case enum values** defined in Day-0 Fix D: `submitted`, `extracting`, `extracted`, `policy_evaluating`, `fraud_checking`, `deciding`, `finalized`, `under_review`, `fraud_investigation`, `error`. No uppercase, no synonyms, no aliases.
- **`claims.final_decision` is NULL until a terminal status is reached.** `status` and `final_decision` are always written in the same atomic transaction. Setting `final_decision` without also setting a terminal `status` (or vice versa) is a bug.
- **`'approved'`, `'rejected'`, `'decision_made'`, `'review_queue'`, `'investigation_queue'` are permanently retired.** They must not appear anywhere in schema definitions, code, queries, tests, or documentation.

### Audit Rules
- **`audit_events` is INSERT-only.** No `UPDATE` or `DELETE` is ever issued against this table. If a row is wrong, insert a corrective event — do not overwrite.
- **Every layer emits at least one `audit_events` row** on start, and at least one on completion or failure.
- **Every retry emits its own `audit_events` row** with `event_type = 'retried'` and `payload` containing the attempt number and error reason.
- **Replaying `audit_events` for a `claim_id` ordered by `created_at` must reproduce the full decision history.** The `payload` for each event must be self-contained enough to reconstruct what happened without querying any other table.

### Qdrant Rules
- **Qdrant point IDs are UUID5 values** derived from `uuid5(NAMESPACE_URL, f"{claim_id}:image:{image_index}")` (images) or `uuid5(NAMESPACE_URL, f"{claim_id}:text")` (text). Never use raw SHA-256 hex slices or random UUIDs for points that must be idempotently re-inserted.
- **Every Qdrant payload contains `claim_id` (UUID).** `policy_number` is never stored in a Qdrant payload.

### Configuration Rules
- **No numeric threshold, weight, or routing parameter is hardcoded.** Every such value is loaded from the `configuration` table at runtime. Code review fails on any literal like `0.7`, `0.85`, `150.0` appearing in business logic.

---

## Final Notes for Implementers

**This guide is prescriptive about WHAT, flexible about HOW.**

You must:
- Meet all requirements
- Handle all edge cases
- Follow anti-patterns (what NOT to do)
- Pass all validation criteria

You choose:
- Libraries and frameworks
- Code structure and patterns
- Optimization techniques
- Additional features

**When uncertain:**
- Route to manual review (fail-safe)
- Log errors comprehensively
- Ask clarifying questions
- Prioritize correctness over speed

**Build incrementally:**
- Start with Phase 1-2 (foundation + core layers)
- Test each component before moving on
- Add advanced features (Tier 2-3 fraud) later
- Polish comes last

**Good luck! 🚀**
