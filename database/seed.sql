-- Lexora — Seed Data
-- Run after schema.sql

-- ============================================================
-- Users
-- ============================================================
INSERT INTO public.users (id, email, full_name, role) VALUES
  ('c2b1b8a6-7a9b-4a7b-ae15-7f1f2a1d2c33', 'ananya.rao@insurer.com', 'Ananya Rao', 'underwriter'),
  ('d3c2c9b7-8bac-5b8c-bf26-8g2g3b2e3d44', 'vikram.singh@insurer.com', 'Vikram Singh', 'admin'),
  ('e4d3dac8-9cbd-6c9d-c037-9h3h4c3f4e55', 'priya.kumar@insurer.com', 'Priya Kumar', 'auditor'),
  ('f5e4ebd9-adce-7dae-d148-ai4i5d4g5f66', 'rajesh.patel@insurer.com', 'Rajesh Patel', 'siu')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Policies
-- ============================================================
INSERT INTO public.policies (id, policy_number, policy_type, rules_version, holder_name, holder_email, policy_start_date, policy_end_date, annual_limit) VALUES
  ('2c6f5f5c-7c6a-4e4b-a1c1-3f7841a8e212', 'POL-IND-2025-0008123', 'health', 'v1.0', 'Rahul Mehta', 'rahul.mehta@gmail.com', '2025-04-01', '2026-03-31', 500000.00),
  ('807d584e-d36e-49d0-92a6-b775986f2dc9', 'POL-IND-2025-0009001', 'health', 'v1.0', 'S. Priya', 'priya.s@gmail.com', '2025-01-01', '2026-12-31', 300000.00),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'POL-AUTO-2025-0001234', 'auto', 'v1.0', 'Amit Sharma', 'amit.sharma@gmail.com', '2025-06-01', '2026-05-31', 1000000.00),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'POL-PROP-2025-0005678', 'property', 'v1.0', 'Deepa Nair', 'deepa.nair@gmail.com', '2025-03-15', '2026-03-14', 2000000.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Policy Rules
-- ============================================================
INSERT INTO public.policy_rules (policy_type, version, rules_definition, effective_from, effective_to, is_active) VALUES
  ('health', 'v1.0', '{
    "rules": [
      {
        "id": "coverage_period",
        "type": "date_range",
        "description": "Incident must fall within policy coverage period",
        "field": "incident_date",
        "check": "between",
        "ref_start": "policy_start_date",
        "ref_end": "policy_end_date",
        "severity": "reject"
      },
      {
        "id": "amount_within_limit",
        "type": "amount_cap",
        "description": "Claimed amount must not exceed annual limit",
        "field": "claimed_amount",
        "max_ref": "annual_limit",
        "severity": "reject"
      },
      {
        "id": "policy_active",
        "type": "boolean_check",
        "description": "Policy must be active",
        "field": "is_active",
        "expected": true,
        "severity": "reject"
      },
      {
        "id": "exclusion_cosmetic",
        "type": "keyword_exclusion",
        "description": "Cosmetic procedures are excluded",
        "field": "incident_description",
        "keywords": ["cosmetic", "botox", "liposuction", "hair transplant"],
        "severity": "reject"
      },
      {
        "id": "exclusion_preexisting",
        "type": "keyword_exclusion",
        "description": "Pre-existing conditions exclusion",
        "field": "incident_description",
        "keywords": ["pre-existing", "preexisting", "chronic condition known"],
        "severity": "flag"
      }
    ],
    "limits": {
      "per_claim_max": 500000,
      "deductible": 1000,
      "copay_percent": 10
    }
  }', '2025-01-01', '2026-12-31', true),

  ('auto', 'v1.0', '{
    "rules": [
      {
        "id": "coverage_period",
        "type": "date_range",
        "description": "Incident must fall within policy coverage period",
        "field": "incident_date",
        "check": "between",
        "ref_start": "policy_start_date",
        "ref_end": "policy_end_date",
        "severity": "reject"
      },
      {
        "id": "amount_within_limit",
        "type": "amount_cap",
        "description": "Claimed amount must not exceed annual limit",
        "field": "claimed_amount",
        "max_ref": "annual_limit",
        "severity": "reject"
      },
      {
        "id": "policy_active",
        "type": "boolean_check",
        "description": "Policy must be active",
        "field": "is_active",
        "expected": true,
        "severity": "reject"
      }
    ],
    "limits": {
      "per_claim_max": 1000000,
      "deductible": 5000,
      "copay_percent": 15
    }
  }', '2025-01-01', '2026-12-31', true),

  ('property', 'v1.0', '{
    "rules": [
      {
        "id": "coverage_period",
        "type": "date_range",
        "field": "incident_date",
        "check": "between",
        "ref_start": "policy_start_date",
        "ref_end": "policy_end_date",
        "severity": "reject"
      },
      {
        "id": "amount_within_limit",
        "type": "amount_cap",
        "field": "claimed_amount",
        "max_ref": "annual_limit",
        "severity": "reject"
      },
      {
        "id": "policy_active",
        "type": "boolean_check",
        "field": "is_active",
        "expected": true,
        "severity": "reject"
      }
    ],
    "limits": {
      "per_claim_max": 2000000,
      "deductible": 10000,
      "copay_percent": 20
    }
  }', '2025-01-01', '2026-12-31', true)
ON CONFLICT (policy_type, version) DO NOTHING;

-- ============================================================
-- Configuration (Thresholds & Weights)
-- ============================================================
INSERT INTO public.configuration (config_key, config_value, config_type, description) VALUES
  ('fraud.high_threshold', '0.7', 'threshold', 'Score above this triggers fraud investigation'),
  ('fraud.low_threshold', '0.3', 'threshold', 'Score below this allows auto-approval'),
  ('fraud.investigation_cost', '5000', 'threshold', 'Estimated cost of a fraud investigation in currency units'),
  ('fraud.tier_weights', '[0.35, 0.35, 0.30]', 'weight', 'Weights for Tier1, Tier2, Tier3 fraud scores'),
  ('fraud.duplicate_invoice_window_days', '365', 'threshold', 'Days to look back for duplicate invoices'),
  ('fraud.claim_frequency_window_days', '90', 'threshold', 'Days to check for claim frequency anomalies'),
  ('fraud.claim_frequency_max', '3', 'threshold', 'Max claims in frequency window before flagging'),
  ('system.auto_process', 'true', 'feature_flag', 'Whether to auto-run pipeline after extraction'),
  ('extraction.min_confidence', '0.85', 'threshold', 'Minimum extraction confidence for auto-processing')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- Sample Claims (for demo)
-- ============================================================
INSERT INTO public.claims (id, claim_number, policy_id, idempotency_key, status, claimant_name, claimant_phone, incident_date, incident_type, incident_description, claimed_amount, provider_name, invoice_number, extraction_raw, extraction_confidence, extraction_warnings, submitted_at) VALUES
  (
    '9f1c3d4b-2e0b-4b0c-a43f-63bdb6f0a9f1',
    'CLM-2026-000045',
    '2c6f5f5c-7c6a-4e4b-a1c1-3f7841a8e212',
    'seed_claim_001',
    'extracted',
    'Rahul Mehta',
    '+91-9876543210',
    '2026-02-12',
    'accident',
    'Road accident near Velachery. Hospitalized for fracture treatment.',
    12000.00,
    'ABC Hospital',
    'INV-45821',
    '{"policy_number":"POL-IND-2025-0008123","claimant_name":"Rahul Mehta","claimant_phone":"+91-9876543210","incident_date":"2026-02-12","incident_type":"accident","incident_description":"Road accident near Velachery. Hospitalized for fracture treatment.","claimed_amount":12000,"provider_name":"ABC Hospital","invoice_number":"INV-45821","field_confidence":{"policy_number":0.95,"claimant_name":0.98,"incident_date":0.92,"claimed_amount":0.97,"provider_name":0.90,"invoice_number":0.88}}',
    0.93,
    '[]',
    '2026-02-19T10:31:00Z'
  ),
  (
    'a0c2d4e6-3f1b-5c2d-b54g-74cec7g1b0g2',
    'CLM-2026-000046',
    '807d584e-d36e-49d0-92a6-b775986f2dc9',
    'seed_claim_002',
    'finalized',
    'S. Priya',
    '+91-9123456789',
    '2026-01-20',
    'illness',
    'Hospitalized for dengue fever. 3-day treatment at City Hospital.',
    8500.00,
    'City Hospital',
    'INV-33201',
    '{"policy_number":"POL-IND-2025-0009001","claimant_name":"S. Priya","claimant_phone":"+91-9123456789","incident_date":"2026-01-20","incident_type":"illness","incident_description":"Hospitalized for dengue fever. 3-day treatment at City Hospital.","claimed_amount":8500,"provider_name":"City Hospital","invoice_number":"INV-33201","field_confidence":{"policy_number":0.97,"claimant_name":0.99,"incident_date":0.95,"claimed_amount":0.98,"provider_name":0.96,"invoice_number":0.94}}',
    0.96,
    '[]',
    '2026-01-21T08:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;

-- Set finalized claim's decision
UPDATE public.claims
SET final_decision = 'auto_approve',
    approved_amount = 7500.00,
    fraud_score = 0.12,
    fraud_analysis = '{"tier1":{"duplicate_invoice":false,"policy_expired":false,"frequency_anomaly":false,"score":0.05},"tier2":{"similar_claims_found":0,"score":0.1},"tier3":{"graph_risk_score":0.2,"connected_entities":1},"composite_score":0.12}',
    policy_decision = '{"eligible":true,"rules_passed":["coverage_period","amount_within_limit","policy_active"],"rules_failed":[],"rules_flagged":[],"limits":{"per_claim_max":300000,"deductible":1000,"copay_percent":10},"recommended_amount":7500}',
    decision_rationale = 'Low fraud risk (0.12). All policy rules passed. Amount within limits after deductible and copay.',
    decision_output = '{"route":"auto_approve","expected_loss":1020,"fraud_score":0.12,"claimed_amount":8500,"thresholds":{"high":0.7,"low":0.3}}',
    processed_at = '2026-01-21T08:05:00Z'
WHERE id = 'a0c2d4e6-3f1b-5c2d-b54g-74cec7g1b0g2';

-- Sample audit events
INSERT INTO public.audit_events (claim_id, stage, event_type, payload, duration_ms) VALUES
  ('9f1c3d4b-2e0b-4b0c-a43f-63bdb6f0a9f1', 'layer1', 'completed', '{"fields_extracted":9,"warnings":[],"confidence":0.93}', 2340),
  ('a0c2d4e6-3f1b-5c2d-b54g-74cec7g1b0g2', 'layer1', 'completed', '{"fields_extracted":9,"warnings":[],"confidence":0.96}', 1820),
  ('a0c2d4e6-3f1b-5c2d-b54g-74cec7g1b0g2', 'policy_engine', 'completed', '{"rules_evaluated":3,"passed":3,"failed":0}', 45),
  ('a0c2d4e6-3f1b-5c2d-b54g-74cec7g1b0g2', 'fraud_engine', 'completed', '{"fraud_score":0.12,"tiers_evaluated":3}', 320),
  ('a0c2d4e6-3f1b-5c2d-b54g-74cec7g1b0g2', 'decision', 'completed', '{"decision":"auto_approve","expected_loss":1020}', 12);
