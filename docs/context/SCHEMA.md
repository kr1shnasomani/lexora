# Lexora — Schema Reference

**DB:** Supabase PostgreSQL | Extension: `pgcrypto` (UUIDs via `gen_random_uuid()`)

## Global Rules
- `claims.id` (UUID) is the **only** internal identifier — never use `claim_number` or `policy_number` as a system key.
- `claims.status` = pipeline lifecycle. `claims.final_decision` = outcome. Keep them separate.
- `audit_events` is **append-only** — no updates or deletes.
- `extraction_raw` is for audit/replay only — never use it in runtime logic queries.

---

## ENUM Types

**`claim_status`:** `submitted` → `extracting` → `extracted` → `policy_evaluating` → `fraud_checking` → `deciding` → `finalized` | `under_review` | `fraud_investigation` | `error`

**`claim_final_decision`:** `auto_approve` | `auto_reject` | `manual_review` | `fraud_investigation`

**`incident_type_enum`:** `accident` | `illness` | `theft` | `damage` | `other`

**`policy_type_enum`:** `health` | `auto` | `property` | `life`

**`user_role`:** `underwriter` | `admin` | `auditor` | `siu`

**`config_type_enum`:** `threshold` | `weight` | `feature_flag` | `rule`

---

## Tables

### `public.users`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK, FK → `auth.users.id` | Supabase Auth user ID |
| `email` | `varchar(255)` unique | User email |
| `full_name` | `varchar(255)` | Display name |
| `role` | `user_role` | Authorization role |
| `is_active` | `boolean` | Soft-disable flag |
| `created_at` | `timestamptz` | Created time |
| `updated_at` | `timestamptz` | Auto-updated (trigger) |

---

### `public.policies`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Internal identifier |
| `policy_number` | `varchar(100)` unique | External reference number |
| `policy_type` | `policy_type_enum` | Product line (selects rule set) |
| `rules_version` | `varchar(50)` | Default rule version |
| `holder_name` | `varchar(255)` | Policy holder name |
| `holder_email` | `varchar(255)` | Policy holder email |
| `policy_start_date` | `date` | Coverage start |
| `policy_end_date` | `date` | Coverage end |
| `annual_limit` | `numeric(12,2)` | Annual coverage cap (>0) |
| `is_active` | `boolean` | Active flag |
| `created_at` | `timestamptz` | Created time |
| `updated_at` | `timestamptz` | Auto-updated (trigger) |

---

### `public.claims` ← Core table
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | **Global claim identifier** |
| `claim_number` | `varchar(100)` unique | Human-readable reference |
| `policy_id` | `uuid` FK → `policies.id` | Linked policy |
| `idempotency_key` | `varchar(255)` unique | Prevents duplicate submissions |
| `status` | `claim_status` | Pipeline lifecycle stage |
| `final_decision` | `claim_final_decision` nullable | Outcome (only set at finalization) |
| `current_state_context` | `jsonb` | Orchestration context (retry counts, last error) |
| `claimant_name` | `varchar(255)` | Extracted claimant name |
| `claimant_phone` | `varchar(50)` | Extracted claimant phone |
| `incident_date` | `date` | Extracted incident date |
| `incident_type` | `incident_type_enum` | Extracted incident type |
| `incident_description` | `text` | Free-text incident description |
| `claimed_amount` | `numeric(12,2)` | Total claimed amount |
| `approved_amount` | `numeric(12,2)` nullable | Approved amount (≤ claimed_amount) |
| `provider_name` | `varchar(255)` | Provider/hospital/garage name |
| `invoice_number` | `varchar(255)` | Provider invoice (used in Tier-1 duplicate checks) |
| `extraction_raw` | `jsonb` NOT NULL | Full L1 extraction (audit/replay only) |
| `extraction_confidence` | `float8` 0–1 | Perception layer confidence |
| `extraction_warnings` | `jsonb` | Array of extraction warning strings |
| `policy_decision` | `jsonb` nullable | L2 output (eligibility, limits, rationale) |
| `fraud_score` | `float8` 0–1 nullable | L3 fraud probability |
| `fraud_analysis` | `jsonb` nullable | L3 tier signals + diagnostics |
| `decision_rationale` | `text` nullable | Human-readable outcome explanation |
| `decision_output` | `jsonb` nullable | L4 routing + expected loss payload |
| `reviewed_by` | `uuid` FK → `users.id` nullable | Human reviewer |
| `reviewed_at` | `timestamptz` nullable | Human review timestamp |
| `submitted_at` | `timestamptz` | Claim submission time |
| `processed_at` | `timestamptz` nullable | Automated processing completion time |
| `created_at` | `timestamptz` | Row creation |
| `updated_at` | `timestamptz` | Auto-updated (trigger) |

**Constraints:** `approved_amount <= claimed_amount` | `extraction_confidence` and `fraud_score` must be 0–1.

---

### `public.claim_documents`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Document row ID |
| `claim_id` | `uuid` FK → `claims.id` | Parent claim |
| `storage_provider` | `text` | Storage backend (`local`, `s3`, etc.) |
| `storage_key` | `text` | Object path within storage |
| `sha256` | `char(64)` | Content hash (dedupe + tamper check) |
| `file_name` | `varchar(255)` | Original filename |
| `content_type` | `varchar(100)` | MIME type |
| `size_bytes` | `bigint` | File size (>0) |
| `created_at` | `timestamptz` | Upload record time |

---

### `public.claim_line_items`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Line item ID |
| `claim_id` | `uuid` FK → `claims.id` | Parent claim |
| `line_no` | `integer` | Line number (unique per claim) |
| `description` | `text` | Item description from bill |
| `claimed_amount` | `numeric(12,2)` | Amount claimed (>0) |
| `approved_amount` | `numeric(12,2)` nullable | Approved for this line (≥0) |
| `line_decision` | `text` | `approved` | `rejected` | `partial` |
| `reason` | `text` nullable | Rejection/partial reason |
| `created_at` | `timestamptz` | Creation time |

---

### `public.policy_rules`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Rule row ID |
| `policy_type` | `policy_type_enum` | Applicable product line |
| `version` | `varchar(50)` | Version label (unique per policy_type) |
| `rules_definition` | `jsonb` | Full RulePack DSL (see LAYER_CONTRACTS.md L2) |
| `effective_from` | `date` | Rules apply after this date |
| `effective_to` | `date` nullable | Rules stop applying after this date |
| `approved_by` | `uuid` FK → `users.id` nullable | Approver |
| `approved_at` | `timestamptz` nullable | Approval time |
| `is_active` | `boolean` | Active toggle |
| `created_at` | `timestamptz` | Insert time |

---

### `public.configuration`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Config row ID |
| `config_key` | `varchar(255)` unique | Namespaced key (e.g. `fraud.high_threshold`) |
| `config_value` | `jsonb` | Value — number, bool, array, or object |
| `config_type` | `config_type_enum` | Category |
| `description` | `text` nullable | Human description |
| `version` | `integer` | Governance version |
| `updated_by` | `uuid` FK → `users.id` nullable | Last updater |
| `updated_at` | `timestamptz` | Auto-updated (trigger) |

---

### `public.audit_events` ← Append-only, immutable
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Event ID |
| `claim_id` | `uuid` FK → `claims.id` | Associated claim |
| `stage` | `text` | Pipeline stage (`layer1`, `policy_engine`, `tier2`, `decision`, etc.) |
| `event_type` | `text` | `started` | `completed` | `failed` |
| `payload` | `jsonb` | Event details (inputs/outputs/errors) |
| `model_versions` | `jsonb` | Model/version metadata |
| `duration_ms` | `integer` nullable | Stage execution time |
| `created_at` | `timestamptz` | Event time |

---

### `public.feedback`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Feedback row ID |
| `claim_id` | `uuid` FK → `claims.id` | Associated claim |
| `reviewed_by` | `uuid` FK → `users.id` | Reviewer |
| `system_decision` | `claim_final_decision` | Original system decision |
| `human_decision` | `claim_final_decision` | Corrected human decision |
| `feedback_category` | `text` | Label (`false_positive_fraud`, `missing_doc`, `rule_bug`, etc.) |
| `feedback_notes` | `text` nullable | Correction explanation |
| `flagged_for_retraining` | `boolean` | Marks as training data candidate |
| `created_at` | `timestamptz` | Feedback submission time |

---

### `public.chat_sessions`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Session ID |
| `user_id` | `uuid` FK → `auth.users.id` nullable | Owning user |
| `title` | `text` | Session title (default: `New Analysis Session`) |
| `created_at` | `timestamptz` | Creation time |

RLS enabled — `auth.uid() = user_id`.

---

### `public.chat_messages`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Message ID |
| `session_id` | `uuid` FK → `chat_sessions.id` | Parent session (CASCADE delete) |
| `role` | `text` | `user` | `assistant` | `system` | `tool` |
| `content` | `text` NOT NULL | Message content |
| `created_at` | `timestamptz` | Message time |

RLS enabled via parent session. Index: `(session_id, created_at)`.

---

## Triggers
`set_updated_at()` fires `BEFORE UPDATE` on: `users`, `policies`, `claims`, `configuration`

## State Machine (see `backend/state_machine.py`)
```
submitted → extracting → extracted → policy_evaluating → fraud_checking → deciding
deciding → finalized | under_review | fraud_investigation
any → error
```

## Key Query Notes
- Tier-1 duplicate checks query `claims.invoice_number`
- Amount anomaly baselines: `WHERE status='finalized' AND final_decision='auto_approve' AND approved_amount IS NOT NULL`
- Never query `extraction_raw` at runtime (not indexed)
