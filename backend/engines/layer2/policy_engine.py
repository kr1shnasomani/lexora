"""Lexora — Policy Engine (Layer 2) — Live Supabase Integration

Architecture:
    evaluate_policy(claim_id)        ← public entry point
        _load_claim_and_policy()     ← claims JOIN policies
        _load_documents()            ← claim_documents
        _select_ruleset()            ← effective-date-aware policy_rules lookup
        _classify_incident()         ← category_mapping → coverage_categories
        _run_core_checks()           ← policy active, date, amount, waiting, exclusions
        _compute_financials()        ← deductible → copay → per-incident → annual cap
        _determine_routing()         ← FAST_TRACK / AUTO_REVIEW / MANUAL_REVIEW
        _build_decision_payload()    ← full policy_decision JSON
        _persist_decision()          ← write claims.policy_decision (native JSONB)
        _emit_audit_event()          ← insert into audit_events

Constraints:
  - No LLM. Pure deterministic Python.
  - No schema changes.
  - Only reads: claims, policies, policy_rules, claim_documents.
  - Public signature: evaluate_policy(claim_id: str) -> dict
"""

from __future__ import annotations

import json
import time
from datetime import date, datetime, timedelta
from typing import Any

from database import get_supabase
from services.audit import log_audit_event

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

LAYER = 2
STAGE = "policy_engine"


# ─────────────────────────────────────────────────────────────────────────────
# Public Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_policy(claim_id: str) -> dict:
    """Run Layer 2 Policy Governance Engine against a claim.

    Returns:
        Full policy_decision dict.
        Also persists to claims.policy_decision (native JSONB) and emits audit.
    """
    start_ts = time.time()
    db = get_supabase()

    log_audit_event(claim_id, STAGE, "started")

    try:
        # ── 1. Load data ──────────────────────────────────────────────────
        claim, policy = _load_claim_and_policy(db, claim_id)
        documents = _load_documents(db, claim_id)

        if not policy:
            decision = _hard_reject_payload(
                code="NO_POLICY_LINKED",
                message="No policy is linked to this claim.",
                claimed_amount=float(claim.get("claimed_amount") or 0),
            )
            _persist_decision(db, claim_id, decision)
            _emit_audit_event(claim_id, decision, start_ts, ruleset_id=None)
            return decision

        # ── 2. Select ruleset ─────────────────────────────────────────────
        ruleset, rulepack = _select_ruleset(db, policy, claim)

        if ruleset is None:
            decision = _hard_reject_payload(
                code="NO_ACTIVE_RULESET",
                message=f"No active ruleset found for policy type "
                        f"'{policy.get('policy_type')}' effective on incident date.",
                claimed_amount=float(claim.get("claimed_amount") or 0),
            )
            _persist_decision(db, claim_id, decision)
            _emit_audit_event(claim_id, decision, start_ts, ruleset_id=None)
            return decision

        ruleset_id = str(ruleset.get("id", ""))

        # ── 3. Classify incident ──────────────────────────────────────────
        incident_type = claim.get("incident_type") or "other"
        category, category_config, classification_reasons = _classify_incident(
            incident_type, rulepack
        )

        # ── 4. Run deterministic checks ───────────────────────────────────
        context: dict[str, Any] = {
            "documents": documents,
            "doc_gaps_count": 0,
            "coverage_category": category,
        }

        passed_ids: list[str] = []
        failed_ids: list[str] = []
        flagged_ids: list[str] = []
        reasons: list[dict] = list(classification_reasons)
        status = "APPROVE"

        # If not covered at all, hard reject
        if not category_config.get("covered", True):
            status = "REJECT"
            failed_ids.append("COVERAGE_NOT_COVERED")
            reasons.append({
                "code": "COVERAGE_NOT_COVERED",
                "severity": "reject",
                "message": f"Coverage category '{category}' is not covered by this policy.",
            })
        else:
            # Run core checks
            check_results = _run_core_checks(claim, policy, category_config, context)
            for cr in check_results:
                _record_result(cr, cr["code"], passed_ids, failed_ids, flagged_ids, reasons)
                if not cr["passed"] and cr["severity"] == "reject":
                    status = "REJECT"
                    break  # stop on first hard reject

        # If no hard reject, check for flagged items
        if status != "REJECT" and flagged_ids:
            status = "REVIEW"

        # ── 5. Compute financials ─────────────────────────────────────────
        _populate_annual_used(db, claim, policy, context)

        if status != "REJECT":
            financials = _compute_financials(claim, policy, category_config, context)
        else:
            financials = _minimal_financials(claim)

        # ── 6. Determine routing ──────────────────────────────────────────
        routing = _determine_routing(status, financials, context)

        # ── 7. Build payload ──────────────────────────────────────────────
        covered = category_config.get("covered", False) if category_config else False
        decision = _build_decision_payload(
            claim=claim,
            policy=policy,
            ruleset=ruleset,
            category=category,
            covered=covered,
            status=status,
            financials=financials,
            passed_ids=passed_ids,
            failed_ids=failed_ids,
            flagged_ids=flagged_ids,
            reasons=reasons,
            routing=routing,
            context=context,
        )

        # ── 8. Persist & audit ────────────────────────────────────────────
        _persist_decision(db, claim_id, decision)
        _emit_audit_event(claim_id, decision, start_ts, ruleset_id=ruleset_id)

        return decision

    except Exception as exc:
        duration_ms = int((time.time() - start_ts) * 1000)
        log_audit_event(claim_id, STAGE, "failed", {"error": str(exc)}, duration_ms=duration_ms)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Data Loading
# ─────────────────────────────────────────────────────────────────────────────

def _load_claim_and_policy(db, claim_id: str) -> tuple[dict, dict | None]:
    result = db.table("claims").select("*, policies(*)").eq("id", claim_id).single().execute()
    claim = result.data or {}
    policy = claim.pop("policies", None) or {}
    return claim, policy or None


def _load_documents(db, claim_id: str) -> list[dict]:
    result = db.table("claim_documents").select("*").eq("claim_id", claim_id).execute()
    return result.data or []


# ─────────────────────────────────────────────────────────────────────────────
# Ruleset Selection (effective-date-aware)
# ─────────────────────────────────────────────────────────────────────────────

def _select_ruleset(db, policy: dict, claim: dict) -> tuple[dict | None, dict]:
    """Select the correct ruleset using effective dates.

    Query: policy_rules WHERE
        policy_type = X
        AND is_active = True
        AND effective_from <= incident_date
    ORDER BY effective_from DESC, take first where effective_to is NULL or >= incident_date.
    """
    policy_type = policy.get("policy_type")
    incident_date = _parse_date(claim.get("incident_date")) or date.today()
    incident_date_str = incident_date.isoformat()

    result = (
        db.table("policy_rules")
        .select("*")
        .eq("policy_type", policy_type)
        .eq("is_active", True)
        .lte("effective_from", incident_date_str)
        .order("effective_from", desc=True)
        .limit(10)
        .execute()
    )

    rows = result.data or []
    for row in rows:
        effective_to_str = row.get("effective_to")
        if effective_to_str:
            effective_to = _parse_date(effective_to_str)
            if effective_to and incident_date > effective_to:
                continue
        rules_def = row.get("rules_definition") or {}
        if isinstance(rules_def, str):
            rules_def = json.loads(rules_def)
        return row, rules_def

    return None, {}


# ─────────────────────────────────────────────────────────────────────────────
# Incident Classification (uses real RulePack structure)
# ─────────────────────────────────────────────────────────────────────────────

def _classify_incident(
    incident_type: str, rulepack: dict
) -> tuple[str, dict, list[dict]]:
    """Map incident_type → coverage_category using rulepack.category_mapping.

    Returns (category_name, category_config_dict, reasons_list).
    """
    category_mapping = rulepack.get("category_mapping", {})
    coverage_categories = rulepack.get("coverage_categories", {})
    reasons: list[dict] = []

    # Map incident type to category
    category = category_mapping.get(incident_type)
    if not category:
        # Fallback: try "other" mapping, then use incident_type directly
        category = category_mapping.get("other", incident_type)

    # Look up the category config
    category_config = coverage_categories.get(category, {})

    if not category_config:
        reasons.append({
            "code": "UNKNOWN_COVERAGE_CATEGORY",
            "severity": "review",
            "message": f"Incident type '{incident_type}' mapped to category "
                       f"'{category}' which has no coverage definition. "
                       f"Flagged for manual review.",
        })

    return category, category_config, reasons


# ─────────────────────────────────────────────────────────────────────────────
# Rule Result Recording
# ─────────────────────────────────────────────────────────────────────────────

def _record_result(
    result: dict,
    rule_id: str,
    passed_ids: list,
    failed_ids: list,
    flagged_ids: list,
    reasons: list,
) -> None:
    """Sort a check result into passed / failed / flagged buckets."""
    if result["passed"]:
        passed_ids.append(rule_id)
    elif result["severity"] == "review":
        flagged_ids.append(rule_id)
        reasons.append({
            "code": result.get("code", rule_id),
            "severity": "review",
            "message": result.get("message", ""),
        })
    else:
        failed_ids.append(rule_id)
        reasons.append({
            "code": result.get("code", rule_id),
            "severity": result.get("severity", "reject"),
            "message": result.get("message", ""),
        })


# ─────────────────────────────────────────────────────────────────────────────
# Core Deterministic Checks
# ─────────────────────────────────────────────────────────────────────────────

def _run_core_checks(
    claim: dict,
    policy: dict,
    category_config: dict,
    context: dict,
) -> list[dict]:
    """Run all deterministic checks against the claim. Returns list of result dicts."""
    results: list[dict] = []

    # 1) Policy active
    if policy.get("is_active", False):
        results.append(_ok("POLICY_ACTIVE", "Policy is active."))
    else:
        results.append(_fail("POLICY_INACTIVE", "Policy is not active."))
        return results  # hard stop

    # 2) Date within policy term
    incident = _parse_date(claim.get("incident_date"))
    start = _parse_date(policy.get("policy_start_date"))
    end = _parse_date(policy.get("policy_end_date"))

    if not incident:
        results.append(_fail("DATE_MISSING", "Incident date is missing."))
        return results
    if start and end:
        if start <= incident <= end:
            results.append(_ok("DATE_WITHIN_TERM",
                               f"Incident {incident} within policy term {start}–{end}."))
        else:
            results.append(_fail("DATE_OUTSIDE_TERM",
                                 f"Incident {incident} outside policy term {start}–{end}."))
            return results

    # 3) Claimed amount positive
    claimed = float(claim.get("claimed_amount") or 0)
    if claimed > 0:
        results.append(_ok("AMOUNT_POSITIVE", f"Claimed ₹{claimed:,.2f} is positive."))
    else:
        results.append(_fail("AMOUNT_NOT_POSITIVE", "Claimed amount must be > 0."))
        return results

    # 4) Waiting period
    waiting_days = int(category_config.get("waiting_period_days", 0))
    if waiting_days > 0 and start and incident:
        earliest = start + timedelta(days=waiting_days)
        if incident >= earliest:
            results.append(_ok("WAITING_PERIOD_MET",
                               f"Incident {incident} after waiting period end {earliest}."))
        else:
            results.append(_fail("WAITING_PERIOD_NOT_MET",
                                 f"Incident {incident} within {waiting_days}-day waiting period. "
                                 f"Eligible from {earliest}."))
            return results
    elif waiting_days == 0:
        results.append(_ok("WAITING_PERIOD_NA", "No waiting period for this category."))

    # 5) Exclusions (keyword scan against incident_description)
    description = str(
        claim.get("incident_description") or claim.get("description") or ""
    ).lower()
    exclusions = category_config.get("exclusions", [])

    exclusion_hit = False
    for kw in exclusions:
        kw_lower = str(kw).lower().replace("_", " ")
        if kw_lower in description:
            results.append(_fail("EXCLUSION_MATCH",
                                 f"Exclusion keyword '{kw}' matched in incident description."))
            exclusion_hit = True
            break

    if not exclusion_hit and exclusions:
        results.append(_ok("NO_EXCLUSION_MATCH", "No exclusion keywords matched."))

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Financial Computation (reads from category_config, not legacy limits{})
# ─────────────────────────────────────────────────────────────────────────────

def _populate_annual_used(db, claim: dict, policy: dict, context: dict) -> None:
    """Sum approved_amount for same policy in same calendar year."""
    policy_id = claim.get("policy_id") or policy.get("id")
    incident_date = _parse_date(claim.get("incident_date"))
    if not policy_id or not incident_date:
        context["annual_used"] = 0.0
        return

    year_start = date(incident_date.year, 1, 1).isoformat()
    year_end = date(incident_date.year, 12, 31).isoformat()

    try:
        result = (
            db.table("claims")
            .select("id, approved_amount")
            .eq("policy_id", policy_id)
            .gte("incident_date", year_start)
            .lte("incident_date", year_end)
            .execute()
        )
        rows = result.data or []
        claim_id = claim.get("id")
        total = sum(
            float(r.get("approved_amount") or 0)
            for r in rows
            if r.get("id") != claim_id and r.get("approved_amount") is not None
        )
        context["annual_used"] = total
    except Exception:
        context["annual_used"] = 0.0


def _compute_financials(
    claim: dict, policy: dict, category_config: dict, context: dict
) -> dict:
    """Apply deductible → copay → per-incident cap → annual limit cap.

    Reads financial params from category_config (real RulePack structure).
    """
    claimed = float(claim.get("claimed_amount") or 0)
    trace: list[str] = []

    # Read from category_config (real RulePack keys)
    deductible = float(category_config.get("deductible", 0))
    copay_pct = float(category_config.get("copay_percentage", 0))
    per_incident_limit = float(category_config.get("per_incident_limit", 0))

    # Annual limit: prefer category_config, fall back to policy.annual_limit
    annual_limit_raw = category_config.get("annual_limit")
    if annual_limit_raw is not None:
        annual_limit = float(annual_limit_raw)
    else:
        annual_limit = float(policy.get("annual_limit") or 0)

    annual_used = float(context.get("annual_used", 0))
    annual_remaining = max(0.0, annual_limit - annual_used) if annual_limit > 0 else 0.0

    payable = claimed

    # 1) Deductible
    if deductible > 0:
        payable = max(0.0, payable - deductible)
        trace.append(f"Deductible ₹{deductible:,.2f} applied → ₹{payable:,.2f} remaining")

    # 2) Copay
    if copay_pct > 0:
        payable = payable * (1 - copay_pct / 100)
        trace.append(f"Copay {copay_pct}% applied → ₹{payable:,.2f} payable")

    payable_before_limits = payable

    # 3) Per-incident cap
    if per_incident_limit > 0 and payable > per_incident_limit:
        payable = per_incident_limit
        trace.append(f"Per-incident cap ₹{per_incident_limit:,.2f} applied → ₹{payable:,.2f}")

    # 4) Annual limit
    if annual_limit > 0:
        if annual_remaining <= 0:
            trace.append("Annual limit exhausted — payable capped to ₹0.00")
            payable = 0.0
        elif payable > annual_remaining:
            payable = annual_remaining
            trace.append(
                f"Annual limit cap: remaining ₹{annual_remaining:,.2f} "
                f"(limit ₹{annual_limit:,.2f}, used ₹{annual_used:,.2f}) → ₹{payable:,.2f}"
            )
        else:
            trace.append(
                f"Annual limit check: ₹{payable:,.2f} within remaining "
                f"₹{annual_remaining:,.2f}"
            )

    recommended = max(0.0, round(payable, 2))

    if not trace:
        trace.append("No adjustments applied — full claimed amount recommended.")

    return {
        "claimed_amount": round(claimed, 2),
        "deductible": round(deductible, 2),
        "copay_percent": round(copay_pct, 2),
        "per_incident_limit": round(per_incident_limit, 2),
        "annual_limit": round(annual_limit, 2),
        "annual_used": round(annual_used, 2),
        "annual_remaining": round(max(0.0, annual_remaining), 2),
        "payable_before_limits": round(payable_before_limits, 2),
        "payable_after_limits": round(recommended, 2),
        "recommended_amount": recommended,
        "calculation_trace": trace,
        "currency": "INR",
    }


def _minimal_financials(claim: dict) -> dict:
    """Minimal financial block for hard-reject cases."""
    claimed = float(claim.get("claimed_amount") or 0)
    return {
        "claimed_amount": round(claimed, 2),
        "deductible": 0,
        "copay_percent": 0,
        "per_incident_limit": 0,
        "annual_limit": 0,
        "annual_used": 0,
        "annual_remaining": 0,
        "payable_before_limits": 0,
        "payable_after_limits": 0,
        "recommended_amount": 0,
        "calculation_trace": ["Hard reject — no financial calculation performed"],
        "currency": "INR",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Routing
# ─────────────────────────────────────────────────────────────────────────────

def _determine_routing(
    status: str, financials: dict, context: dict
) -> dict:
    """Determine routing queue based on outcome status and amount."""
    recommended = financials.get("recommended_amount", 0)
    doc_gaps = context.get("doc_gaps_count", 0)

    if status == "REJECT":
        return {
            "queue": "MANUAL_REVIEW",
            "priority": "HIGH",
            "next_action": "Underwriter to review rejection rationale and confirm or override.",
        }
    elif status == "REVIEW":
        return {
            "queue": "AUTO_REVIEW",
            "priority": "MEDIUM",
            "next_action": "Claims examiner to verify flagged items and supporting documents.",
        }
    else:  # APPROVE
        if recommended <= 20000 and doc_gaps == 0:
            return {
                "queue": "FAST_TRACK",
                "priority": "LOW",
                "next_action": "Eligible for straight-through processing.",
            }
        return {
            "queue": "AUTO_REVIEW",
            "priority": "LOW",
            "next_action": "Approved — routed for automated quality review before disbursement.",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Decision Payload Builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_decision_payload(
    claim: dict,
    policy: dict,
    ruleset: dict,
    category: str,
    covered: bool,
    status: str,
    financials: dict,
    passed_ids: list,
    failed_ids: list,
    flagged_ids: list,
    reasons: list,
    routing: dict,
    context: dict,
) -> dict:
    eligible = status == "APPROVE"
    policy_violation_count = len(failed_ids)
    doc_gaps_count = context.get("doc_gaps_count", 0)
    hard_reject = status == "REJECT" and any(
        r.get("severity") == "reject" for r in reasons
    )
    review_required = status == "REVIEW"

    return {
        "layer": LAYER,
        "policy": {
            "policy_id": str(policy.get("id", "")),
            "policy_type": policy.get("policy_type", ""),
            "ruleset_id": str(ruleset.get("id", "")),
            "ruleset_version": ruleset.get("version", ""),
            "effective_from": str(ruleset.get("effective_from", "")),
        },
        "classification": {
            "incident_type": claim.get("incident_type", ""),
            "coverage_category": category,
            "covered": covered,
        },
        "outcome": {
            "status": status,
            "eligible": eligible,
            "recommended_amount": financials.get("recommended_amount", 0),
            "currency": "INR",
        },
        "financials": financials,
        "rules": {
            "passed": passed_ids,
            "failed": failed_ids,
            "flagged": flagged_ids,
        },
        "reasons": reasons,
        "routing": routing,
        "analytics_tags": {
            "policy_violation_count": policy_violation_count,
            "doc_gaps_count": doc_gaps_count,
            "hard_reject": hard_reject,
            "review_required": review_required,
        },
    }


def _hard_reject_payload(code: str, message: str, claimed_amount: float = 0) -> dict:
    """Minimal but schema-compliant payload for pre-ruleset hard rejects."""
    return {
        "layer": LAYER,
        "policy": {},
        "classification": {},
        "outcome": {
            "status": "REJECT",
            "eligible": False,
            "recommended_amount": 0,
            "currency": "INR",
        },
        "financials": {
            "claimed_amount": round(claimed_amount, 2),
            "deductible": 0,
            "copay_percent": 0,
            "per_incident_limit": 0,
            "annual_limit": 0,
            "annual_used": 0,
            "annual_remaining": 0,
            "payable_before_limits": 0,
            "payable_after_limits": 0,
            "recommended_amount": 0,
            "calculation_trace": ["Hard reject — no financial calculation performed"],
            "currency": "INR",
        },
        "rules": {"passed": [], "failed": [code], "flagged": []},
        "reasons": [{"code": code, "severity": "reject", "message": message}],
        "routing": {
            "queue": "MANUAL_REVIEW",
            "priority": "HIGH",
            "next_action": "System could not process this claim. Manual review required.",
        },
        "analytics_tags": {
            "policy_violation_count": 1,
            "doc_gaps_count": 0,
            "hard_reject": True,
            "review_required": False,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Persistence & Audit
# ─────────────────────────────────────────────────────────────────────────────

def _persist_decision(db, claim_id: str, decision: dict) -> None:
    """Write policy_decision as native JSONB dict + set processed_at."""
    now_iso = datetime.utcnow().isoformat() + "Z"
    db.table("claims").update({
        "policy_decision": decision,          # native dict → Supabase JSONB
        "processed_at": now_iso,
    }).eq("id", claim_id).execute()


def _emit_audit_event(
    claim_id: str,
    decision: dict,
    start_ts: float,
    ruleset_id: str | None,
) -> None:
    duration_ms = int((time.time() - start_ts) * 1000)
    status = decision.get("outcome", {}).get("status", "UNKNOWN")
    rules = decision.get("rules", {})
    log_audit_event(
        claim_id=claim_id,
        stage=STAGE,
        event_type="completed",
        payload={
            "layer": LAYER,
            "ruleset_id": ruleset_id,
            "status": status,
            "rules_failed": rules.get("failed", []),
            "rules_flagged": rules.get("flagged", []),
            "recommended_amount": decision.get("outcome", {}).get("recommended_amount", 0),
            "analytics_tags": decision.get("analytics_tags", {}),
        },
        duration_ms=duration_ms,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _ok(code: str, message: str) -> dict:
    return {"passed": True, "severity": "info", "code": code, "message": message}


def _fail(code: str, message: str, severity: str = "reject") -> dict:
    return {"passed": False, "severity": severity, "code": code, "message": message}


def _review(code: str, message: str) -> dict:
    return {"passed": False, "severity": "review", "code": code, "message": message}


def _parse_date(val) -> date | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    try:
        return datetime.strptime(str(val)[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None
