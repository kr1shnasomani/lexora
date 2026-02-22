-- Lexora — Full Database Schema
-- Version: Final (Strict Roadmap Aligned)
-- Run this against your Supabase SQL Editor

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ENUM Types
-- ============================================================
DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM (
    'submitted', 'extracting', 'extracted',
    'policy_evaluating', 'fraud_checking', 'deciding',
    'finalized', 'under_review', 'fraud_investigation', 'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE claim_final_decision AS ENUM (
    'auto_approve', 'auto_reject', 'manual_review', 'fraud_investigation'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_type_enum AS ENUM (
    'accident', 'illness', 'theft', 'damage', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE policy_type_enum AS ENUM (
    'health', 'auto', 'property', 'life'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'underwriter', 'admin', 'auditor', 'siu'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE config_type_enum AS ENUM (
    'threshold', 'weight', 'feature_flag', 'rule'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Trigger Function: set_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1) public.users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       varchar(255) UNIQUE,
  full_name   varchar(255),
  role        user_role NOT NULL DEFAULT 'underwriter',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2) public.policies
-- ============================================================
CREATE TABLE IF NOT EXISTS public.policies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number     varchar(100) UNIQUE NOT NULL,
  policy_type       policy_type_enum NOT NULL,
  rules_version     varchar(50) DEFAULT 'v1.0',
  holder_name       varchar(255) NOT NULL,
  holder_email      varchar(255),
  policy_start_date date NOT NULL,
  policy_end_date   date NOT NULL,
  annual_limit      numeric(12,2) NOT NULL CHECK (annual_limit > 0),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_policies_updated_at ON public.policies;
CREATE TRIGGER trg_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3) public.claims
-- ============================================================
CREATE TABLE IF NOT EXISTS public.claims (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number            varchar(100) UNIQUE NOT NULL,
  policy_id               uuid REFERENCES public.policies(id),
  idempotency_key         varchar(255) UNIQUE,
  status                  claim_status NOT NULL DEFAULT 'submitted',
  final_decision          claim_final_decision,
  current_state_context   jsonb DEFAULT '{}',

  -- Canonical extracted fields
  claimant_name           varchar(255),
  claimant_phone          varchar(50),
  incident_date           date,
  incident_type           incident_type_enum,
  incident_description    text,
  claimed_amount          numeric(12,2),
  approved_amount         numeric(12,2),
  provider_name           varchar(255),
  invoice_number          varchar(255),

  -- Layer 1 outputs
  extraction_raw          jsonb NOT NULL DEFAULT '{}',
  extraction_confidence   double precision CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
  extraction_warnings     jsonb DEFAULT '[]',

  -- Layer 2 outputs
  policy_decision         jsonb,

  -- Layer 3 outputs
  fraud_score             double precision CHECK (fraud_score >= 0 AND fraud_score <= 1),
  fraud_analysis          jsonb,

  -- Layer 4 outputs
  decision_rationale      text,
  decision_output         jsonb,

  -- Human review
  reviewed_by             uuid REFERENCES public.users(id),
  reviewed_at             timestamptz,

  -- Timestamps
  submitted_at            timestamptz NOT NULL DEFAULT now(),
  processed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_approved_lte_claimed
    CHECK (approved_amount IS NULL OR claimed_amount IS NULL OR approved_amount <= claimed_amount)
);

DROP TRIGGER IF EXISTS trg_claims_updated_at ON public.claims;
CREATE TRIGGER trg_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON public.claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_invoice_number ON public.claims(invoice_number);
CREATE INDEX IF NOT EXISTS idx_claims_final_decision ON public.claims(final_decision);

-- ============================================================
-- 4) public.claim_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.claim_documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id          uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  storage_provider  text NOT NULL DEFAULT 'supabase',
  storage_key       text NOT NULL,
  sha256            char(64),
  file_name         varchar(255) NOT NULL,
  content_type      varchar(100),
  size_bytes        bigint CHECK (size_bytes > 0),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_documents_claim_id ON public.claim_documents(claim_id);

-- ============================================================
-- 5) public.claim_line_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.claim_line_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id          uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  line_no           integer NOT NULL,
  description       text,
  claimed_amount    numeric(12,2) CHECK (claimed_amount > 0),
  approved_amount   numeric(12,2),
  line_decision     text DEFAULT 'pending',
  reason            text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(claim_id, line_no)
);

-- ============================================================
-- 6) public.policy_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.policy_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type       policy_type_enum NOT NULL,
  version           varchar(50) NOT NULL,
  rules_definition  jsonb NOT NULL,
  effective_from    date NOT NULL,
  effective_to      date,
  approved_by       uuid REFERENCES public.users(id),
  approved_at       timestamptz,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(policy_type, version)
);

-- ============================================================
-- 7) public.configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS public.configuration (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key    varchar(255) UNIQUE NOT NULL,
  config_value  jsonb NOT NULL,
  config_type   config_type_enum NOT NULL,
  description   text,
  version       integer NOT NULL DEFAULT 1,
  updated_by    uuid REFERENCES public.users(id),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_configuration_updated_at ON public.configuration;
CREATE TRIGGER trg_configuration_updated_at
  BEFORE UPDATE ON public.configuration
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 8) public.audit_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  stage           text NOT NULL,
  event_type      text NOT NULL,
  payload         jsonb DEFAULT '{}',
  model_versions  jsonb DEFAULT '{}',
  duration_ms     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_claim_id ON public.audit_events(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_stage ON public.audit_events(stage);

-- ============================================================
-- 9) public.feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id                uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  reviewed_by             uuid NOT NULL REFERENCES public.users(id),
  system_decision         claim_final_decision NOT NULL,
  human_decision          claim_final_decision NOT NULL,
  feedback_category       text,
  feedback_notes          text,
  flagged_for_retraining  boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_claim_id ON public.feedback(claim_id);

-- ============================================================
-- Storage bucket (run via Supabase dashboard or API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('claim_documents', 'claim_documents', false)
-- ON CONFLICT DO NOTHING;
