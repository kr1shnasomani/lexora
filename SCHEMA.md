````md
# Lexora — Supabase Schema Reference (Full Column Dictionary)
**Version: Final (Strict Roadmap Aligned)**  
**Purpose:** Authoritative schema context for developers + LLMs (tables, enums, constraints, and **every column with type, description, example**).

---

## Global Rules (Non-Negotiable)

1. **Global Claim Identity**
   - `claims.id` (UUID) is the **only** internal claim identifier used across Postgres, audit, vector store, and graph store.
   - Never use `policy_number` or `claim_number` as a system ID.

2. **Lifecycle vs Outcome**
   - `claims.status` = lifecycle
   - `claims.final_decision` = outcome
   - Do not mix approved/rejected into `status`.

3. **Extraction Storage**
   - Canonical fields are stored in normalized columns.
   - `claims.extraction_raw` is the full structured output from Layer 1 and is used for audit/replay (not business logic queries).

4. **Audit Is Append-Only**
   - `audit_events` is immutable (no updates/deletes).

---

## Extensions

| Extension | Purpose |
|---|---|
| `pgcrypto` | UUID generation via `gen_random_uuid()` |

Example:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
````

---

## ENUM Types

### `claim_status`

* `submitted`
* `extracting`
* `extracted`
* `policy_evaluating`
* `fraud_checking`
* `deciding`
* `finalized`
* `under_review`
* `fraud_investigation`
* `error`

### `claim_final_decision`

* `auto_approve`
* `auto_reject`
* `manual_review`
* `fraud_investigation`

### `incident_type_enum`

* `accident`
* `illness`
* `theft`
* `damage`
* `other`

### `policy_type_enum`

* `health`
* `auto`
* `property`
* `life`

### `user_role`

* `underwriter`
* `admin`
* `auditor`
* `siu`

### `config_type_enum`

* `threshold`
* `weight`
* `feature_flag`
* `rule`

---

# Tables

> **Format per table:** Column name | Data type | Description | Example value

---

## 1) `public.users`

App profile table linked to Supabase `auth.users`.

| Column       | Data type                         | Description                                                     | Example value                          |
| ------------ | --------------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| `id`         | `uuid` (PK, FK → `auth.users.id`) | User identifier (must match Supabase Auth user).                | `c2b1b8a6-7a9b-4a7b-ae15-7f1f2a1d2c33` |
| `email`      | `varchar(255)` (unique)           | User email for display/reference (optional if using auth only). | `reviewer@insurer.com`                 |
| `full_name`  | `varchar(255)`                    | Human-readable name.                                            | `Ananya Rao`                           |
| `role`       | `user_role`                       | Role for authorization / UI routing.                            | `underwriter`                          |
| `is_active`  | `boolean`                         | Soft-disable flag.                                              | `true`                                 |
| `created_at` | `timestamptz`                     | Record creation time.                                           | `2026-02-19T10:30:00Z`                 |
| `updated_at` | `timestamptz`                     | Updated automatically on row updates (trigger).                 | `2026-02-20T12:10:00Z`                 |

---

## 2) `public.policies`

Policy master data used by the policy engine and claim linkage.

| Column              | Data type               | Description                                                                  | Example value                          |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| `id`                | `uuid` (PK)             | Internal policy row identifier.                                              | `2c6f5f5c-7c6a-4e4b-a1c1-3f7841a8e212` |
| `policy_number`     | `varchar(100)` (unique) | External policy reference number provided by insurer.                        | `POL-IND-2025-0008123`                 |
| `policy_type`       | `policy_type_enum`      | Product line type used to select rule sets.                                  | `health`                               |
| `rules_version`     | `varchar(50)`           | Default rule version to apply (unless overridden by effective dating logic). | `v1.3`                                 |
| `holder_name`       | `varchar(255)`          | Policy holder/customer name (display & validation).                          | `Rahul Mehta`                          |
| `holder_email`      | `varchar(255)`          | Optional policy holder email.                                                | `rahul.mehta@gmail.com`                |
| `policy_start_date` | `date`                  | Coverage start date.                                                         | `2025-04-01`                           |
| `policy_end_date`   | `date`                  | Coverage end date.                                                           | `2026-03-31`                           |
| `annual_limit`      | `numeric(12,2)`         | Annual coverage cap for the policy. Must be > 0.                             | `500000.00`                            |
| `is_active`         | `boolean`               | Whether policy is active (soft flag).                                        | `true`                                 |
| `created_at`        | `timestamptz`           | Policy row created time.                                                     | `2025-03-01T09:00:00Z`                 |
| `updated_at`        | `timestamptz`           | Auto-updated on modification (trigger).                                      | `2026-01-15T11:45:00Z`                 |

---

## 3) `public.claims`

Core claim record: lifecycle, normalized extracted fields, outputs, and references.

| Column                  | Data type                          | Description                                                                                         | Example value                                   |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `id`                    | `uuid` (PK)                        | **Global claim identifier** used everywhere (audit/vector/graph/API).                               | `9f1c3d4b-2e0b-4b0c-a43f-63bdb6f0a9f1`          |
| `claim_number`          | `varchar(100)` (unique)            | Human-readable claim reference (can be shown to users).                                             | `CLM-2026-000045`                               |
| `policy_id`             | `uuid` (FK → `policies.id`)        | Links claim to policy master record.                                                                | `2c6f5f5c-7c6a-4e4b-a1c1-3f7841a8e212`          |
| `idempotency_key`       | `varchar(255)` (unique)            | Prevents duplicate submissions/retries for the same request.                                        | `req_20260219_9d3c1b`                           |
| `status`                | `claim_status`                     | Claim processing lifecycle stage.                                                                   | `policy_evaluating`                             |
| `final_decision`        | `claim_final_decision` (nullable)  | Final outcome (only meaningful once `status` reaches `finalized/under_review/fraud_investigation`). | `manual_review`                                 |
| `current_state_context` | `jsonb`                            | Lightweight orchestration context (e.g., retry counts, last error code).                            | `{"retries":1,"last_stage":"layer1"}`           |
| `claimant_name`         | `varchar(255)`                     | Extracted claimant name (canonical).                                                                | `S. Priya`                                      |
| `claimant_phone`        | `varchar(50)`                      | Extracted claimant phone (canonical).                                                               | `+91-9876543210`                                |
| `incident_date`         | `date`                             | Extracted incident date (canonical).                                                                | `2026-02-12`                                    |
| `incident_type`         | `incident_type_enum`               | Extracted incident type.                                                                            | `accident`                                      |
| `incident_description`  | `text`                             | Free-text description of incident.                                                                  | `Road accident near Velachery.`                 |
| `claimed_amount`        | `numeric(12,2)`                    | Total claimed amount requested by claimant.                                                         | `12000.00`                                      |
| `approved_amount`       | `numeric(12,2)` (nullable)         | Amount approved by system/human (>= 0).                                                             | `9000.00`                                       |
| `provider_name`         | `varchar(255)`                     | Provider/hospital/garage name.                                                                      | `ABC Hospital`                                  |
| `invoice_number`        | `varchar(255)`                     | Provider invoice/bill number (used in Tier-1 duplicate checks).                                     | `INV-45821`                                     |
| `extraction_raw`        | `jsonb` (NOT NULL)                 | Full Layer-1 structured extraction (audit/replay). Not used directly for policy/fraud logic.        | `{"policy_number":"...","fields":{...}}`        |
| `extraction_confidence` | `double precision` (0–1)           | Overall extraction confidence from perception layer.                                                | `0.92`                                          |
| `extraction_warnings`   | `jsonb`                            | Array of extraction warnings (missing fields, low OCR, etc.).                                       | `["low_confidence_invoice_number"]`             |
| `policy_decision`       | `jsonb` (nullable)                 | Layer-2 outputs: eligibility, exclusion hits, limits, rationale.                                    | `{"eligible":true,"reasons":[]}`                |
| `fraud_score`           | `double precision` (0–1, nullable) | Layer-3 final fraud probability/score.                                                              | `0.34`                                          |
| `fraud_analysis`        | `jsonb` (nullable)                 | Tier signals + fusion details.                                                                      | `{"tier1":{"dup_invoice":false}}`               |
| `decision_rationale`    | `text` (nullable)                  | Human-readable explanation for outcome.                                                             | `Low fraud risk; within limits.`                |
| `decision_output`       | `jsonb` (nullable)                 | Structured Layer-4 decision payload (routing + expected loss, etc.).                                | `{"route":"manual_review","expected_loss":180}` |
| `reviewed_by`           | `uuid` (FK → `users.id`, nullable) | Reviewer who finalized decision (if human touched).                                                 | `c2b1b8a6-7a9b-4a7b-ae15-7f1f2a1d2c33`          |
| `reviewed_at`           | `timestamptz` (nullable)           | When human review occurred.                                                                         | `2026-02-20T08:15:00Z`                          |
| `submitted_at`          | `timestamptz`                      | Claim submission time.                                                                              | `2026-02-19T10:31:00Z`                          |
| `processed_at`          | `timestamptz` (nullable)           | When automated processing finished.                                                                 | `2026-02-19T10:33:10Z`                          |
| `created_at`            | `timestamptz`                      | Row creation timestamp.                                                                             | `2026-02-19T10:31:00Z`                          |
| `updated_at`            | `timestamptz`                      | Auto-updated on modification (trigger).                                                             | `2026-02-19T10:33:10Z`                          |

**Important constraints/invariants**

* `approved_amount <= claimed_amount` when both present
* `extraction_confidence` and `fraud_score` must be between 0 and 1
* `extraction_raw` always non-null (default `{}` until extraction completes)

---

## 4) `public.claim_documents`

Tracks uploaded files, storage references, and dedupe hashes.

| Column             | Data type                 | Description                                      | Example value                                |
| ------------------ | ------------------------- | ------------------------------------------------ | -------------------------------------------- |
| `id`               | `uuid` (PK)               | Document row identifier.                         | `7b1c3e25-0d9a-4b4c-98f9-4ed1bd3ef012`       |
| `claim_id`         | `uuid` (FK → `claims.id`) | Claim this document belongs to.                  | `9f1c3d4b-2e0b-4b0c-a43f-63bdb6f0a9f1`       |
| `storage_provider` | `text`                    | Storage backend indicator (`local`, `s3`, etc.). | `s3`                                         |
| `storage_key`      | `text`                    | Object path/key within storage provider.         | `claims/2026/02/19/CLM-2026-000045/bill.pdf` |
| `sha256`           | `char(64)`                | Content hash for dedupe/tamper checks.           | `a3f1...9c0e` (64 hex chars)                 |
| `file_name`        | `varchar(255)`            | Original file name.                              | `hospital_bill.pdf`                          |
| `content_type`     | `varchar(100)`            | MIME type.                                       | `application/pdf`                            |
| `size_bytes`       | `bigint`                  | File size. Must be > 0.                          | `248921`                                     |
| `created_at`       | `timestamptz`             | Upload record time.                              | `2026-02-19T10:31:30Z`                       |

---

## 5) `public.claim_line_items`

Optional: supports partial approvals per billed item.

| Column            | Data type                  | Description                                        | Example value                          |
| ----------------- | -------------------------- | -------------------------------------------------- | -------------------------------------- |
| `id`              | `uuid` (PK)                | Line item row identifier.                          | `b7d19b9f-5b41-4f5b-9d80-ef8c8a2c3a9a` |
| `claim_id`        | `uuid` (FK → `claims.id`)  | Parent claim.                                      | `9f1c3d4b-2e0b-4b0c-a43f-63bdb6f0a9f1` |
| `line_no`         | `integer`                  | Line item number within a claim. Unique per claim. | `1`                                    |
| `description`     | `text`                     | Item description from bill.                        | `X-Ray (Chest)`                        |
| `claimed_amount`  | `numeric(12,2)`            | Amount claimed for this line. Must be > 0.         | `600.00`                               |
| `approved_amount` | `numeric(12,2)` (nullable) | Approved for this line (>= 0).                     | `600.00`                               |
| `line_decision`   | `text`                     | `approved`, `rejected`, or `partial`.              | `approved`                             |
| `reason`          | `text` (nullable)          | Reason for line-level rejection/partial.           | `Excluded under clause 4.2`            |
| `created_at`      | `timestamptz`              | Line item creation time.                           | `2026-02-19T10:32:10Z`                 |

---

## 6) `public.policy_rules`

Versioned rule documents for the policy engine.

| Column             | Data type                          | Description                                   | Example value                          |
| ------------------ | ---------------------------------- | --------------------------------------------- | -------------------------------------- |
| `id`               | `uuid` (PK)                        | Rule row identifier.                          | `d1a77d6d-2de3-4b2b-8d48-8b8d62b0cb59` |
| `policy_type`      | `policy_type_enum`                 | Which product line these rules apply to.      | `health`                               |
| `version`          | `varchar(50)`                      | Version label (unique per policy_type).       | `v1.3`                                 |
| `rules_definition` | `jsonb`                            | Full rule DSL / YAML-to-JSON structure.       | `{"rules":[...],"limits":{...}}`       |
| `effective_from`   | `date`                             | Start date when rules apply.                  | `2025-01-01`                           |
| `effective_to`     | `date` (nullable)                  | End date when rules stop applying (optional). | `2025-12-31`                           |
| `approved_by`      | `uuid` (FK → `users.id`, nullable) | Approver user.                                | `c2b1b8a6-7a9b-4a7b-ae15-7f1f2a1d2c33` |
| `approved_at`      | `timestamptz` (nullable)           | Approval timestamp.                           | `2025-01-01T00:00:00Z`                 |
| `is_active`        | `boolean`                          | Active toggle.                                | `true`                                 |
| `created_at`       | `timestamptz`                      | Insert timestamp.                             | `2024-12-20T09:00:00Z`                 |

---

## 7) `public.configuration`

Centralized system parameters. `config_value` is JSONB and must store valid JSON primitives.

| Column         | Data type                          | Description                             | Example value                          |
| -------------- | ---------------------------------- | --------------------------------------- | -------------------------------------- |
| `id`           | `uuid` (PK)                        | Config row identifier.                  | `2f7b73bb-2a12-4bb1-9b0a-7c4d95d6b0ef` |
| `config_key`   | `varchar(255)` (unique)            | Namespaced config key.                  | `fraud.high_threshold`                 |
| `config_value` | `jsonb`                            | JSON value (number/bool/array/object).  | `0.7`                                  |
| `config_type`  | `config_type_enum`                 | Category of config.                     | `threshold`                            |
| `description`  | `text` (nullable)                  | Human description.                      | `Score above this → investigation`     |
| `version`      | `integer`                          | Config version for governance.          | `1`                                    |
| `updated_by`   | `uuid` (FK → `users.id`, nullable) | Who updated it.                         | `c2b1b8a6-7a9b-4a7b-ae15-7f1f2a1d2c33` |
| `updated_at`   | `timestamptz`                      | Auto-updated on modification (trigger). | `2026-02-19T10:00:00Z`                 |

Example values:

* Threshold number: `0.85`
* Boolean flag: `true`
* Weights array: `[0.3,0.3,0.4]`

---

## 8) `public.audit_events`

Immutable event log for every stage execution.

| Column           | Data type                 | Description                                                                  | Example value                           |
| ---------------- | ------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| `id`             | `uuid` (PK)               | Audit event id.                                                              | `6e0b7a8e-58f3-4c93-8b6f-12d8a3f0b2a1`  |
| `claim_id`       | `uuid` (FK → `claims.id`) | Claim associated with the event.                                             | `9f1c3d4b-2e0b-4b0c-a43f-63bdb6f0a9f1`  |
| `stage`          | `text`                    | Pipeline stage label (e.g., `layer1`, `policy_engine`, `tier2`, `decision`). | `layer1`                                |
| `event_type`     | `text`                    | Event type (e.g., `started`, `completed`, `failed`).                         | `completed`                             |
| `payload`        | `jsonb`                   | Event payload details (inputs/outputs/errors).                               | `{"fields_extracted":18,"warnings":[]}` |
| `model_versions` | `jsonb`                   | Model/version metadata if applicable.                                        | `{"ocr":"tesseract5","llm":"gpt-4.1"}`  |
| `duration_ms`    | `integer` (nullable)      | Execution time for the stage.                                                | `842`                                   |
| `created_at`     | `timestamptz`             | Event time.                                                                  | `2026-02-19T10:32:50Z`                  |

---

## 9) `public.feedback`

Captures human overrides and retraining signals.

| Column                   | Data type                 | Description                                                               | Example value                                |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| `id`                     | `uuid` (PK)               | Feedback row identifier.                                                  | `a3a99a60-6b88-4ce0-b6bf-4f18a9d8e10b`       |
| `claim_id`               | `uuid` (FK → `claims.id`) | Claim this feedback belongs to.                                           | `9f1c3d4b-2e0b-4b0c-a43f-63bdb6f0a9f1`       |
| `reviewed_by`            | `uuid` (FK → `users.id`)  | Reviewer submitting feedback.                                             | `c2b1b8a6-7a9b-4a7b-ae15-7f1f2a1d2c33`       |
| `system_decision`        | `claim_final_decision`    | What system decided.                                                      | `manual_review`                              |
| `human_decision`         | `claim_final_decision`    | Final human decision.                                                     | `auto_approve`                               |
| `feedback_category`      | `text`                    | Label/category (e.g., `false_positive_fraud`, `missing_doc`, `rule_bug`). | `false_positive_fraud`                       |
| `feedback_notes`         | `text` (nullable)         | Notes explaining the correction.                                          | `Invoice duplicate was legitimate re-issue.` |
| `flagged_for_retraining` | `boolean`                 | Indicates training set candidate.                                         | `true`                                       |
| `created_at`             | `timestamptz`             | Feedback creation time.                                                   | `2026-02-20T08:25:00Z`                       |

---

# Triggers

## `set_updated_at()` function

Sets `updated_at = now()` on row update.

Applied to:

* `public.users`
* `public.policies`
* `public.claims`
* `public.configuration`

---

# State Machine Summary (Canonical)

Valid transitions:

```
submitted → extracting
extracting → extracted
extracted → policy_evaluating
policy_evaluating → fraud_checking
fraud_checking → deciding
deciding → finalized
deciding → under_review
deciding → fraud_investigation
(deciding or any) → error  (on irrecoverable failure)
```

---

# Key Query Expectations (for Implementation)

* Tier-1 duplicate invoice checks query `claims.invoice_number`

* Tier-1 amount anomaly baselines should use:

  * `status='finalized' AND final_decision='auto_approve' AND approved_amount IS NOT NULL`

* `extraction_raw` is not indexed and should not be used for runtime logic queries.
