-- ============================================================
-- LEXORA / Supabase schema (baseline) - UPDATED
-- Paste into Supabase SQL Editor and run once.
-- ============================================================

-- 0) Extensions
create extension if not exists pgcrypto;

set search_path = public;

-- ============================================================
-- 1) ENUM TYPES
-- ============================================================

do $$ begin
  create type claim_status as enum (
    'submitted',
    'extracting',
    'extracted',
    'policy_evaluating',
    'fraud_checking',
    'deciding',
    'finalized',
    'under_review',
    'fraud_investigation',
    'error'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type claim_final_decision as enum (
    'auto_approve',
    'auto_reject',
    'manual_review',
    'fraud_investigation'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type incident_type_enum as enum (
    'accident', 'illness', 'theft', 'damage', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type policy_type_enum as enum (
    'health', 'auto', 'property', 'life'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('underwriter', 'admin', 'auditor', 'siu');
exception when duplicate_object then null; end $$;

do $$ begin
  create type config_type_enum as enum ('threshold', 'weight', 'feature_flag', 'rule');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2) USERS (profile table)
--    Supabase already has auth.users; this is your app profile.
-- ============================================================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar(255) unique,
  full_name varchar(255) not null,
  role user_role not null default 'underwriter',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);

-- ============================================================
-- 3) POLICIES
-- ============================================================

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  policy_number varchar(100) not null unique,
  policy_type policy_type_enum not null,
  rules_version varchar(50) not null,
  holder_name varchar(255) not null,
  holder_email varchar(255),
  policy_start_date date not null,
  policy_end_date date not null,
  annual_limit numeric(12,2) not null check (annual_limit > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_policy_dates check (policy_end_date > policy_start_date)
);

create index if not exists idx_policies_number on public.policies(policy_number);
create index if not exists idx_policies_type on public.policies(policy_type);

-- ============================================================
-- 4) CLAIMS
-- ============================================================

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  claim_number varchar(100) not null unique,
  policy_id uuid not null references public.policies(id),
  idempotency_key varchar(255) not null unique,

  status claim_status not null default 'submitted',
  final_decision claim_final_decision,
  current_state_context jsonb not null default '{}'::jsonb,

  claimant_name varchar(255),
  claimant_phone varchar(50),
  incident_date date,
  incident_type incident_type_enum,
  incident_description text,

  claimed_amount numeric(12,2) check (claimed_amount is null or claimed_amount > 0),
  approved_amount numeric(12,2) check (approved_amount is null or approved_amount >= 0),
  provider_name varchar(255),
  invoice_number varchar(255),

  -- Raw extraction storage (audit/replay)
  extraction_raw jsonb not null default '{}'::jsonb,

  extraction_confidence double precision check (
    extraction_confidence is null or extraction_confidence between 0.0 and 1.0
  ),
  extraction_warnings jsonb not null default '[]'::jsonb,

  policy_decision jsonb,

  fraud_score double precision check (fraud_score is null or fraud_score between 0.0 and 1.0),
  fraud_analysis jsonb,

  decision_rationale text,
  decision_output jsonb,

  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,

  submitted_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_approved_lte_claimed
    check (
      approved_amount is null
      or claimed_amount is null
      or approved_amount <= claimed_amount
    )
);

create index if not exists idx_claims_status on public.claims(status);
create index if not exists idx_claims_policy on public.claims(policy_id);
create index if not exists idx_claims_idempotency on public.claims(idempotency_key);
create index if not exists idx_claims_submitted on public.claims(submitted_at);
create index if not exists idx_claims_invoice on public.claims(invoice_number) where invoice_number is not null;
create index if not exists idx_claims_claimant on public.claims(claimant_name);
create index if not exists idx_claims_fraud_score on public.claims(fraud_score) where status = 'finalized';

-- NOTE: Removed GIN index on extraction_raw as per your guide (audit-only, not queried)

-- ============================================================
-- 5) CLAIM DOCUMENTS
-- ============================================================

create table if not exists public.claim_documents (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  storage_provider text not null default 'local',
  storage_key text not null,
  sha256 char(64) not null,
  file_name varchar(255) not null,
  content_type varchar(100) not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_claim_documents_claim on public.claim_documents(claim_id);
create index if not exists idx_claim_documents_sha256 on public.claim_documents(sha256);

-- ============================================================
-- 6) CLAIM LINE ITEMS (optional but included)
-- ============================================================

create table if not exists public.claim_line_items (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  line_no integer not null,
  description text not null,
  claimed_amount numeric(12,2) not null check (claimed_amount > 0),
  approved_amount numeric(12,2) check (approved_amount is null or approved_amount >= 0),
  line_decision text check (line_decision in ('approved','rejected','partial')),
  reason text,
  created_at timestamptz not null default now(),
  constraint uq_claim_line unique (claim_id, line_no)
);

create index if not exists idx_line_items_claim on public.claim_line_items(claim_id);

-- ============================================================
-- 7) POLICY RULES
-- ============================================================

create table if not exists public.policy_rules (
  id uuid primary key default gen_random_uuid(),
  policy_type policy_type_enum not null,
  version varchar(50) not null,
  rules_definition jsonb not null,
  effective_from date not null,
  effective_to date,
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint uq_policy_rules_type_version unique (policy_type, version),
  constraint chk_policy_rules_dates check (effective_to is null or effective_to > effective_from)
);

create index if not exists idx_policy_rules_type_active on public.policy_rules(policy_type, is_active);
create index if not exists idx_policy_rules_effective on public.policy_rules(effective_from, effective_to);

-- ============================================================
-- 8) CONFIGURATION (all business params live here)
-- ============================================================

create table if not exists public.configuration (
  id uuid primary key default gen_random_uuid(),
  config_key varchar(255) not null unique,
  config_value jsonb not null,
  config_type config_type_enum not null,
  description text,
  version integer not null default 1,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_config_key on public.configuration(config_key);

-- Seed baseline configuration (explicit ::jsonb casts)
insert into public.configuration (config_key, config_value, config_type, description)
values
  ('fraud.tier1.velocity_threshold', '5'::jsonb, 'threshold', 'Max claims per claimant in 7 days'),
  ('fraud.tier2.image_similarity_threshold', '0.95'::jsonb, 'threshold', 'Image similarity cutoff'),
  ('fraud.tier2.text_similarity_threshold', '0.90'::jsonb, 'threshold', 'Text similarity cutoff'),
  ('fraud.fusion.weights', '[0.3, 0.3, 0.4]'::jsonb, 'weight', 'Tier 1, 2, 3 weights'),
  ('fraud.high_threshold', '0.7'::jsonb, 'threshold', 'Score above this → investigation'),
  ('fraud.low_threshold', '0.2'::jsonb, 'threshold', 'Score below this → safe'),
  ('decision.investigation_cost', '150.0'::jsonb, 'threshold', 'Cost of manual review (currency per product)'),
  ('extraction.min_confidence', '0.85'::jsonb, 'threshold', 'Min confidence to proceed'),
  ('features.fraud_tier3.enabled', 'true'::jsonb, 'feature_flag', 'Enable graph analysis')
on conflict (config_key) do nothing;

-- ============================================================
-- 9) AUDIT EVENTS (append-only)
-- ============================================================

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  stage text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  model_versions jsonb not null default '{}'::jsonb,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_claim_time on public.audit_events(claim_id, created_at);
create index if not exists idx_audit_events_stage on public.audit_events(stage);
create index if not exists idx_audit_events_payload_gin on public.audit_events using gin (payload);

-- ============================================================
-- 10) FEEDBACK
-- ============================================================

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  reviewed_by uuid not null references public.users(id),
  system_decision claim_final_decision not null,
  human_decision claim_final_decision not null,
  feedback_category text not null,
  feedback_notes text,
  flagged_for_retraining boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_claim on public.feedback(claim_id);
create index if not exists idx_feedback_retraining on public.feedback(flagged_for_retraining) where flagged_for_retraining = true;

-- ============================================================
-- OPTIONAL: updated_at trigger (recommended)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_policies_updated_at
  before update on public.policies
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_claims_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Add missing configuration updated_at trigger (fix)
do $$ begin
  create trigger trg_configuration_updated_at
  before update on public.configuration
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- ============================================================
-- DONE
-- Notes:
-- - RLS policies are not enabled here. Turn them on after schema verification.
-- ============================================================
