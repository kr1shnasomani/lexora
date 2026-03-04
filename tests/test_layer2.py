"""Lexora — Layer 2 Policy Engine Test Harness

Self-contained test suite covering 6 required policy evaluation scenarios.
Stubs out database and config modules entirely before importing the engine,
so tests run WITHOUT a live database or .env file.

Usage (from project root):
    cd backend && source venv/bin/activate   # Mac/Linux
    cd backend && .\\venv\\Scripts\\Activate.ps1  # Windows
    python ../tests/test_layer2.py
"""

from __future__ import annotations

import json
import sys
import types
import uuid
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import MagicMock

# ─── Path resolution ─────────────────────────────────────────────────────────
_backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

# ─── Module stubbing BEFORE any engine import ────────────────────────────────
_DB_STUB = MagicMock()


def _stub_get_supabase():
    return _DB_STUB


def _stub_log_audit_event(*args, **kwargs):
    return {}


_config_mod = types.ModuleType("config")
_config_mod.get_settings = MagicMock()

_database_mod = types.ModuleType("database")
_database_mod.get_supabase = _stub_get_supabase

_audit_mod = types.ModuleType("services.audit")
_audit_mod.log_audit_event = _stub_log_audit_event
_audit_mod.AuditTimer = MagicMock()

_services_mod = types.ModuleType("services")
_services_mod.audit = _audit_mod

sys.modules.setdefault("config", _config_mod)
sys.modules.setdefault("database", _database_mod)
sys.modules.setdefault("services", _services_mod)
sys.modules.setdefault("services.audit", _audit_mod)

from engines.layer2 import policy_engine as pe  # noqa: E402

# ─── Rule packs ──────────────────────────────────────────────────────────────

HEALTH_RULEPACK = {
    "rules": [
        {"id": "policy_active", "type": "policy_active"},
        {"id": "date_within_term", "type": "date_within_term"},
        {"id": "claimed_amount_positive", "type": "claimed_amount_positive"},
        {"id": "missing_core_fields", "type": "missing_core_fields",
         "required_fields": ["claimant_name", "incident_date", "claimed_amount"]},
        {"id": "waiting_period", "type": "waiting_period", "waiting_period_days": 30},
        {"id": "exclusions_keyword", "type": "exclusions_keyword",
         "hard_exclusions": ["cosmetic", "aesthetic", "beauty treatment"],
         "soft_exclusions": ["experimental", "elective"]},
        {"id": "required_docs", "type": "required_docs",
         "required_docs": [
             {"type": "hospital_bill", "filename_hints": ["bill", "invoice", "hospital"], "required": True},
             {"type": "discharge_summary", "filename_hints": ["discharge", "summary"], "required": True},
         ]},
        {"id": "amount_outlier_review", "type": "amount_outlier_review", "outlier_threshold": 500000},
        {"id": "copay_apply", "type": "copay_apply", "copay_percent": 10},
        {"id": "annual_limit_cap", "type": "annual_limit_cap"},
    ],
    "limits": {"copay_percent": 10, "deductible": 0, "per_incident_limit": 200000, "annual_limit": 500000},
    "routing": {"fast_track": {"max_amount": 15000}, "default_queue": "AUTO_REVIEW"},
}

LIFE_RULEPACK = {
    "rules": [
        {"id": "policy_active", "type": "policy_active"},
        {"id": "date_within_term", "type": "date_within_term"},
        {"id": "claimed_amount_positive", "type": "claimed_amount_positive"},
        {"id": "missing_core_fields", "type": "missing_core_fields",
         "required_fields": ["claimant_name", "incident_date", "claimed_amount"]},
        {"id": "required_docs", "type": "required_docs",
         "required_docs": [
             {"type": "death_certificate", "filename_hints": ["death", "certificate"], "required": True},
         ]},
        {"id": "suicide_exclusion_within_days", "type": "suicide_exclusion_within_days",
         "keywords": ["suicide", "self-harm", "self harm", "self-inflicted"], "within_days": 365},
        {"id": "contestability_period_review", "type": "contestability_period_review",
         "contestability_days": 730},
    ],
    "limits": {"deductible": 0, "copay_percent": 0, "per_incident_limit": 0},
    "routing": {"fast_track": {"max_amount": 50000}, "default_queue": "MANUAL_REVIEW"},
}

AUTO_RULEPACK = {
    "rules": [
        {"id": "policy_active", "type": "policy_active"},
        {"id": "date_within_term", "type": "date_within_term"},
        {"id": "claimed_amount_positive", "type": "claimed_amount_positive"},
        {"id": "missing_core_fields", "type": "missing_core_fields",
         "required_fields": ["claimant_name", "incident_date", "claimed_amount"]},
        {"id": "exclusions_keyword", "type": "exclusions_keyword",
         "hard_exclusions": ["drunk driving", "dui", "racing", "illegal"],
         "soft_exclusions": ["hit and run"]},
        {"id": "required_docs", "type": "required_docs",
         "required_docs": [
             {"type": "repair_estimate", "filename_hints": ["estimate", "repair", "quote"], "required": True},
             {"type": "police_report", "filename_hints": ["fir", "police", "report"],
              "required": False, "if_amount_gt": 50000},
         ]},
        {"id": "deductible_apply", "type": "deductible_apply", "deductible": 5000},
        {"id": "per_incident_cap", "type": "per_incident_cap", "per_incident_limit": 100000},
    ],
    "limits": {"deductible": 5000, "copay_percent": 0, "per_incident_limit": 100000},
    "routing": {"fast_track": {"max_amount": 20000}, "default_queue": "AUTO_REVIEW"},
}

PROPERTY_RULEPACK = {
    "rules": [
        {"id": "policy_active", "type": "policy_active"},
        {"id": "date_within_term", "type": "date_within_term"},
        {"id": "claimed_amount_positive", "type": "claimed_amount_positive"},
        {"id": "missing_core_fields", "type": "missing_core_fields",
         "required_fields": ["claimant_name", "incident_date", "claimed_amount"]},
        {"id": "waiting_period", "type": "waiting_period", "waiting_period_days": 7},
        {"id": "exclusions_keyword", "type": "exclusions_keyword",
         "hard_exclusions": ["intentional damage", "arson", "fraud"],
         "soft_exclusions": ["wear and tear", "gradual deterioration"]},
        {"id": "required_docs", "type": "required_docs",
         "required_docs": [
             {"type": "fir_report", "filename_hints": ["fir", "police_report"], "required": True},
             {"type": "loss_assessment", "filename_hints": ["assessment", "valuation", "loss"], "required": True},
         ]},
        {"id": "per_incident_cap", "type": "per_incident_cap", "per_incident_limit": 300000},
    ],
    "limits": {"deductible": 0, "copay_percent": 0, "per_incident_limit": 300000},
    "routing": {"fast_track": {"max_amount": 25000}, "default_queue": "AUTO_REVIEW"},
}

# ─── Mock DB helpers ─────────────────────────────────────────────────────────

def _install_mock_db(claim_data, policy_data, ruleset_row, documents, approved_claims):
    def table_side_effect(table_name):
        t = MagicMock()

        if table_name == "claims":
            claim_with_policy = dict(claim_data)
            claim_with_policy["policies"] = dict(policy_data)
            single_exec = MagicMock()
            single_exec.data = claim_with_policy
            t.select.return_value.eq.return_value.single.return_value.execute.return_value = single_exec

            approved_exec = MagicMock()
            approved_exec.data = approved_claims
            (t.select.return_value
               .eq.return_value
               .eq.return_value
               .gte.return_value
               .lte.return_value
               .execute.return_value) = approved_exec

            t.update.return_value.eq.return_value.execute.return_value = MagicMock()

        elif table_name == "policy_rules":
            pr_result = MagicMock()
            pr_result.data = [ruleset_row]
            (t.select.return_value
               .eq.return_value
               .eq.return_value
               .lte.return_value
               .order.return_value
               .limit.return_value
               .execute.return_value) = pr_result

        elif table_name == "claim_documents":
            doc_result = MagicMock()
            doc_result.data = documents
            t.select.return_value.eq.return_value.execute.return_value = doc_result

        elif table_name == "audit_events":
            t.insert.return_value.execute.return_value.data = [{"id": str(uuid.uuid4())}]

        return t

    _DB_STUB.table.side_effect = table_side_effect


def _make_ruleset_row(policy_type, rulepack):
    return {
        "id": str(uuid.uuid4()),
        "policy_type": policy_type,
        "version": "v2.0",
        "rules_definition": rulepack,
        "effective_from": "2024-01-01",
        "effective_to": None,
        "is_active": True,
    }


def _run_test(scenario_name, claim, policy, rulepack, policy_type,
              documents, approved_claims, expected_status, expected_queue=""):
    ruleset_row = _make_ruleset_row(policy_type, rulepack)
    _install_mock_db(claim, policy, ruleset_row, documents, approved_claims)

    decision = pe.evaluate_policy(claim["id"])

    status = decision["outcome"]["status"]
    queue = decision["routing"]["queue"]
    ok = status == expected_status and (not expected_queue or queue == expected_queue)

    tag = "PASS" if ok else "FAIL"
    exp = f"(expected status={expected_status}" + (f", queue={expected_queue}" if expected_queue else "") + ")"
    got = f"(got status={status}, queue={queue})"

    print(f"\n{'='*70}")
    print(f"[{tag}]  {scenario_name}")
    print(f"       {exp} {got}")
    print(f"{'='*70}")
    print(json.dumps(decision, indent=2, default=str))

    return ok, decision


# ─── Scenarios ───────────────────────────────────────────────────────────────

def test_health_approve():
    """Scenario 1 — Health claim under annual limit → APPROVE."""
    today = date.today()
    policy_id = str(uuid.uuid4())
    claim = {
        "id": str(uuid.uuid4()), "policy_id": policy_id,
        "claimant_name": "Rahul Mehta",
        "incident_date": (today - timedelta(days=30)).isoformat(),
        "incident_type": "illness",
        "incident_description": "Hospitalized for dengue fever treatment at Apollo Hospital.",
        "claimed_amount": 45000.00,
    }
    policy = {
        "id": policy_id, "policy_number": "POL-HEALTH-001", "policy_type": "health",
        "holder_name": "Rahul Mehta",
        "policy_start_date": (today - timedelta(days=365)).isoformat(),
        "policy_end_date": (today + timedelta(days=365)).isoformat(),
        "annual_limit": 500000.00, "is_active": True,
    }
    return _run_test(
        "Scenario 1 — Health Under Annual Limit",
        claim, policy, HEALTH_RULEPACK, "health",
        [{"file_name": "hospital_bill.pdf"}, {"file_name": "discharge_summary.pdf"}],
        [{"approved_amount": 100000.00}],
        expected_status="APPROVE",
    )


def test_health_cosmetic_reject():
    """Scenario 2 — Cosmetic procedure → REJECT (hard exclusion keyword)."""
    today = date.today()
    policy_id = str(uuid.uuid4())
    claim = {
        "id": str(uuid.uuid4()), "policy_id": policy_id,
        "claimant_name": "Priya Nair",
        "incident_date": (today - timedelta(days=15)).isoformat(),
        "incident_type": "illness",
        "incident_description": "Cosmetic rhinoplasty surgery for aesthetic nose correction.",
        "claimed_amount": 85000.00,
    }
    policy = {
        "id": policy_id, "policy_number": "POL-HEALTH-002", "policy_type": "health",
        "holder_name": "Priya Nair",
        "policy_start_date": (today - timedelta(days=365)).isoformat(),
        "policy_end_date": (today + timedelta(days=365)).isoformat(),
        "annual_limit": 500000.00, "is_active": True,
    }
    return _run_test(
        "Scenario 2 — Health Cosmetic Procedure",
        claim, policy, HEALTH_RULEPACK, "health",
        [{"file_name": "cosmetic_surgery_bill.pdf"}], [],
        expected_status="REJECT",
    )


def test_life_suicide_within_year_reject():
    """Scenario 3 — Life suicide within 1-year exclusion period → REJECT."""
    today = date.today()
    policy_id = str(uuid.uuid4())
    claim = {
        "id": str(uuid.uuid4()), "policy_id": policy_id,
        "claimant_name": "Kumar Family",
        "incident_date": (today - timedelta(days=10)).isoformat(),
        "incident_type": "other",
        "incident_description": "Death by suicide — found at home by family members.",
        "claimed_amount": 2000000.00,
    }
    policy = {
        "id": policy_id, "policy_number": "POL-LIFE-001", "policy_type": "life",
        "holder_name": "Suresh Kumar",
        "policy_start_date": (today - timedelta(days=180)).isoformat(),
        "policy_end_date": (today + timedelta(days=5 * 365)).isoformat(),
        "annual_limit": 0, "is_active": True,
    }
    return _run_test(
        "Scenario 3 — Life Suicide Within 1 Year",
        claim, policy, LIFE_RULEPACK, "life",
        [{"file_name": "death_certificate.pdf"}], [],
        expected_status="REJECT",
    )


def test_auto_small_amount_fast_track():
    """Scenario 4 — Auto small amount → APPROVE + FAST_TRACK (after deductible)."""
    today = date.today()
    policy_id = str(uuid.uuid4())
    claim = {
        "id": str(uuid.uuid4()), "policy_id": policy_id,
        "claimant_name": "Deepak Sharma",
        "incident_date": (today - timedelta(days=5)).isoformat(),
        "incident_type": "accident",
        "incident_description": "Minor rear-end collision in parking lot — bumper dent.",
        "claimed_amount": 12000.00,
    }
    policy = {
        "id": policy_id, "policy_number": "POL-AUTO-001", "policy_type": "auto",
        "holder_name": "Deepak Sharma",
        "policy_start_date": (today - timedelta(days=200)).isoformat(),
        "policy_end_date": (today + timedelta(days=165)).isoformat(),
        "annual_limit": 0, "is_active": True,
    }
    return _run_test(
        "Scenario 4 — Auto Small Amount Fast Track",
        claim, policy, AUTO_RULEPACK, "auto",
        [{"file_name": "repair_estimate.pdf"}], [],
        expected_status="APPROVE", expected_queue="FAST_TRACK",
    )


def test_property_theft_waiting_period_reject():
    """Scenario 5 — Property theft within 7-day waiting period → REJECT."""
    today = date.today()
    policy_id = str(uuid.uuid4())
    claim = {
        "id": str(uuid.uuid4()), "policy_id": policy_id,
        "claimant_name": "Ananya Rao",
        "incident_date": (today - timedelta(days=1)).isoformat(),
        "incident_type": "theft",
        "incident_description": "Laptop and mobile phone stolen from office.",
        "claimed_amount": 85000.00,
    }
    policy = {
        "id": policy_id, "policy_number": "POL-PROP-001", "policy_type": "property",
        "holder_name": "Ananya Rao",
        "policy_start_date": (today - timedelta(days=3)).isoformat(),
        "policy_end_date": (today + timedelta(days=362)).isoformat(),
        "annual_limit": 0, "is_active": True,
    }
    return _run_test(
        "Scenario 5 — Property Theft Within Waiting Period",
        claim, policy, PROPERTY_RULEPACK, "property",
        [{"file_name": "fir_report.pdf"}, {"file_name": "loss_assessment.pdf"}], [],
        expected_status="REJECT",
    )


def test_property_theft_missing_fir_review():
    """Scenario 6 — Property theft (past waiting period) missing FIR → REVIEW."""
    today = date.today()
    policy_id = str(uuid.uuid4())
    claim = {
        "id": str(uuid.uuid4()), "policy_id": policy_id,
        "claimant_name": "Vijay Krishnan",
        "incident_date": (today - timedelta(days=20)).isoformat(),
        "incident_type": "theft",
        "incident_description": "Jewelry stolen during home burglary while on vacation.",
        "claimed_amount": 95000.00,
    }
    policy = {
        "id": policy_id, "policy_number": "POL-PROP-002", "policy_type": "property",
        "holder_name": "Vijay Krishnan",
        "policy_start_date": (today - timedelta(days=90)).isoformat(),  # past waiting period
        "policy_end_date": (today + timedelta(days=275)).isoformat(),
        "annual_limit": 0, "is_active": True,
    }
    # FIR is missing — only loss assessment uploaded
    return _run_test(
        "Scenario 6 — Property Theft Missing FIR",
        claim, policy, PROPERTY_RULEPACK, "property",
        [{"file_name": "loss_assessment_report.pdf"}], [],
        expected_status="REVIEW",
    )


# ─── Runner ──────────────────────────────────────────────────────────────────

def run_all():
    print("\n" + "=" * 70)
    print("  LEXORA — Layer 2 Policy Engine Test Harness (6 Scenarios)")
    print("=" * 70)

    scenarios = [
        test_health_approve,
        test_health_cosmetic_reject,
        test_life_suicide_within_year_reject,
        test_auto_small_amount_fast_track,
        test_property_theft_waiting_period_reject,
        test_property_theft_missing_fir_review,
    ]

    results = []
    for fn in scenarios:
        try:
            passed, _ = fn()
            results.append(passed)
        except Exception as exc:
            print(f"\n[EXCEPTION] {fn.__name__}: {exc}")
            import traceback
            traceback.print_exc()
            results.append(False)

    nb_passed = sum(results)
    nb_failed = len(results) - nb_passed
    print("\n" + "=" * 70)
    print(f"  RESULTS: {nb_passed}/{len(results)} passed, {nb_failed} failed")
    print("=" * 70 + "\n")
    return nb_failed


if __name__ == "__main__":
    sys.exit(0 if run_all() == 0 else 1)
