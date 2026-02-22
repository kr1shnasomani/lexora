"""Lexora — Policy Engine Rule Registry (Layer 2)

Maps rule.type -> Python evaluation function.
Every function is pure/deterministic — no LLM.

Signature:
    rule_fn(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict

Return structure:
    {
        "passed": bool,
        "severity": "reject" | "review" | "info",
        "code": str,
        "message": str,
        "financial_impact": float | None   # optional adjustment
    }
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Callable

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_date(val) -> date | None:
    """Parse a date value from string, date, or datetime.  Returns None on failure."""
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


def _ok(code: str, message: str, severity: str = "info") -> dict:
    return {"passed": True, "severity": severity, "code": code, "message": message, "financial_impact": None}


def _fail(code: str, message: str, severity: str = "reject", financial_impact=None) -> dict:
    return {"passed": False, "severity": severity, "code": code, "message": message, "financial_impact": financial_impact}


def _review(code: str, message: str) -> dict:
    return {"passed": False, "severity": "review", "code": code, "message": message, "financial_impact": None}


# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL Rules (apply to all policy types)
# ─────────────────────────────────────────────────────────────────────────────

def rule_policy_active(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Verify the policy is marked active."""
    if policy.get("is_active", False):
        return _ok("POLICY_ACTIVE", "Policy is active.")
    return _fail("POLICY_INACTIVE", "Policy is not active — claims cannot be processed.")


def rule_date_within_term(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Incident date must fall within policy start/end dates."""
    incident = _parse_date(claim.get("incident_date"))
    start = _parse_date(policy.get("policy_start_date"))
    end = _parse_date(policy.get("policy_end_date"))

    if not incident:
        return _fail("DATE_MISSING", "Incident date is missing or unparseable.", severity="reject")
    if not start or not end:
        return _review("POLICY_DATES_MISSING", "Policy start/end dates are not available for validation.")
    if start <= incident <= end:
        return _ok("DATE_WITHIN_TERM", f"Incident date {incident} is within policy term {start}–{end}.")
    return _fail("DATE_OUTSIDE_TERM",
                 f"Incident date {incident} is outside policy term {start}–{end}.")


def rule_claimed_amount_positive(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Claimed amount must be a positive number."""
    amount = float(claim.get("claimed_amount") or 0)
    if amount > 0:
        return _ok("AMOUNT_POSITIVE", f"Claimed amount ₹{amount:,.2f} is positive.")
    return _fail("AMOUNT_NOT_POSITIVE", "Claimed amount must be greater than zero.")


def rule_missing_core_fields(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """All core claim fields must be present."""
    required = rule_config.get("required_fields", ["claimant_name", "incident_date", "claimed_amount"])
    missing = [f for f in required if not claim.get(f)]
    if not missing:
        return _ok("CORE_FIELDS_OK", "All required core fields are present.")
    return _fail("MISSING_CORE_FIELDS",
                 f"Missing required fields: {', '.join(missing)}.",
                 severity="reject")


def rule_coverage_match(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Verify incident type is covered by this policy type."""
    covered_incident_types = rule_config.get("covered_incident_types", [])
    incident_type = (claim.get("incident_type") or "").lower()

    if not covered_incident_types:
        return _ok("COVERAGE_MATCH", "No coverage restriction defined; incident type accepted.")
    if incident_type in [c.lower() for c in covered_incident_types]:
        return _ok("COVERAGE_MATCH", f"Incident type '{incident_type}' is covered by this policy.")
    return _fail("COVERAGE_MISMATCH",
                 f"Incident type '{incident_type}' is not covered. Covered: {covered_incident_types}.")


def rule_waiting_period(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Incident date must be >= policy_start + waiting_period_days."""
    waiting_days = int(rule_config.get("waiting_period_days", 0))
    if waiting_days <= 0:
        return _ok("WAITING_PERIOD_NA", "No waiting period defined.")

    start = _parse_date(policy.get("policy_start_date"))
    incident = _parse_date(claim.get("incident_date"))
    if not start or not incident:
        return _review("WAITING_PERIOD_DATE_MISSING", "Cannot check waiting period — date data missing.")

    earliest_eligible = start + timedelta(days=waiting_days)
    if incident >= earliest_eligible:
        return _ok("WAITING_PERIOD_MET",
                   f"Incident date {incident} is after waiting period end {earliest_eligible}.")
    return _fail("WAITING_PERIOD_NOT_MET",
                 f"Incident date {incident} is within waiting period. Eligible from {earliest_eligible}.")


def rule_exclusions_keyword(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Scan incident_description for hard/soft exclusion keywords."""
    description = str(claim.get("incident_description") or "").lower()
    hard_exclusions = [k.lower() for k in rule_config.get("hard_exclusions", [])]
    soft_exclusions = [k.lower() for k in rule_config.get("soft_exclusions", [])]

    for kw in hard_exclusions:
        if kw in description:
            return _fail("HARD_EXCLUSION_MATCH",
                         f"Hard exclusion keyword '{kw}' matched in incident description.",
                         severity="reject")
    for kw in soft_exclusions:
        if kw in description:
            return _review("SOFT_EXCLUSION_MATCH",
                           f"Soft exclusion keyword '{kw}' found — claim requires review.")
    return _ok("NO_EXCLUSION_MATCH", "No exclusion keywords matched.")


def rule_required_docs(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Validate required documents against uploaded file names."""
    documents: list[dict] = context.get("documents", [])
    doc_names = [d.get("file_name", "").lower() for d in documents]
    claimed_amount = float(claim.get("claimed_amount") or 0)

    required_doc_specs = rule_config.get("required_docs", [])
    missing_docs = []

    for spec in required_doc_specs:
        is_required = spec.get("required", True)
        if not is_required:
            if_amount_gt = spec.get("if_amount_gt")
            if if_amount_gt is not None and claimed_amount <= float(if_amount_gt):
                continue  # Not required for this amount

        hints = [h.lower() for h in spec.get("filename_hints", [])]
        doc_type = spec.get("type", "document")

        found = any(
            any(hint in fname for hint in hints)
            for fname in doc_names
        ) if hints else False

        if not found:
            missing_docs.append(doc_type)

    context["doc_gaps_count"] = context.get("doc_gaps_count", 0) + len(missing_docs)

    if not missing_docs:
        return _ok("DOCS_OK", "All required documents are present.")
    return _review("MISSING_DOCS",
                   f"Missing required documents: {', '.join(missing_docs)}. "
                   f"({len(missing_docs)} gap(s) detected)")


def rule_amount_outlier_review(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Flag for review if claimed amount exceeds outlier threshold."""
    threshold = float(rule_config.get("outlier_threshold", 0))
    if threshold <= 0:
        return _ok("OUTLIER_CHECK_SKIPPED", "No outlier threshold configured.")
    claimed = float(claim.get("claimed_amount") or 0)
    if claimed > threshold:
        return _review("AMOUNT_OUTLIER",
                       f"Claimed amount ₹{claimed:,.2f} exceeds outlier threshold ₹{threshold:,.2f}.")
    return _ok("AMOUNT_WITHIN_RANGE",
               f"Claimed amount ₹{claimed:,.2f} is within acceptable range (threshold ₹{threshold:,.2f}).")


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH Rules
# ─────────────────────────────────────────────────────────────────────────────

def rule_copay_apply(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Record the copay percentage for financial computation.  Always passes."""
    copay_pct = float(rule_config.get("copay_percent", 0))
    context["copay_percent"] = copay_pct
    return _ok("COPAY_NOTED", f"Copay of {copay_pct}% will be applied.", severity="info")


def rule_annual_limit_cap(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Check that remaining annual limit is > 0; otherwise reject."""
    annual_limit = float(policy.get("annual_limit") or rule_config.get("annual_limit", 0))
    annual_used = float(context.get("annual_used", 0))
    remaining = annual_limit - annual_used

    context["annual_limit"] = annual_limit
    context["annual_used"] = annual_used
    context["annual_remaining"] = max(0.0, remaining)

    if remaining <= 0:
        return _fail("ANNUAL_LIMIT_EXHAUSTED",
                     f"Annual limit of ₹{annual_limit:,.2f} has been exhausted "
                     f"(used ₹{annual_used:,.2f}).",
                     severity="reject")
    return _ok("ANNUAL_LIMIT_OK",
               f"Annual limit: ₹{annual_limit:,.2f}. Used: ₹{annual_used:,.2f}. "
               f"Remaining: ₹{remaining:,.2f}.")


# ─────────────────────────────────────────────────────────────────────────────
# LIFE Rules
# ─────────────────────────────────────────────────────────────────────────────

def rule_suicide_exclusion_within_days(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Reject claims with suicide keywords if incident is within N days of policy start."""
    keywords = [k.lower() for k in rule_config.get("keywords", ["suicide", "self-harm", "self inflicted"])]
    within_days = int(rule_config.get("within_days", 365))
    description = str(claim.get("incident_description") or "").lower()

    keyword_matched = any(kw in description for kw in keywords)
    if not keyword_matched:
        return _ok("SUICIDE_EXCLUSION_NA", "No suicide-related keywords found in description.")

    start = _parse_date(policy.get("policy_start_date"))
    incident = _parse_date(claim.get("incident_date"))
    if not start or not incident:
        return _fail("SUICIDE_EXCLUSION_DATES_MISSING",
                     "Suicide keyword matched but cannot verify exclusion period — dates missing.",
                     severity="reject")

    exclusion_end = start + timedelta(days=within_days)
    if incident <= exclusion_end:
        return _fail("SUICIDE_EXCLUSION",
                     f"Suicide-related claim within {within_days}-day exclusion period "
                     f"(policy start: {start}, incident: {incident}, exclusion ends: {exclusion_end}).",
                     severity="reject")
    return _review("SUICIDE_POST_EXCLUSION",
                   f"Suicide-related claim but beyond {within_days}-day exclusion period. "
                   "Requires manual underwriter review.")


def rule_contestability_period_review(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Flag claims within the contestability period for manual review."""
    contestability_days = int(rule_config.get("contestability_days", 730))
    start = _parse_date(policy.get("policy_start_date"))
    incident = _parse_date(claim.get("incident_date"))
    if not start or not incident:
        return _ok("CONTESTABILITY_DATES_MISSING", "Cannot verify contestability period — proceeding.")

    period_end = start + timedelta(days=contestability_days)
    if incident <= period_end:
        return _review("CONTESTABILITY_PERIOD",
                       f"Claim falls within {contestability_days}-day contestability period "
                       f"(ends {period_end}). Flagged for review.")
    return _ok("CONTESTABILITY_CLEAR",
               f"Claim is outside the {contestability_days}-day contestability period.")


# ─────────────────────────────────────────────────────────────────────────────
# AUTO / PROPERTY Rules
# ─────────────────────────────────────────────────────────────────────────────

def rule_deductible_apply(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Record the deductible for financial computation.  Always passes."""
    deductible = float(rule_config.get("deductible", 0))
    context["deductible"] = deductible
    return _ok("DEDUCTIBLE_NOTED",
               f"Deductible of ₹{deductible:,.2f} will be applied.",
               severity="info")


def rule_per_incident_cap(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Record the per-incident limit for financial computation.  Always passes."""
    cap = float(rule_config.get("per_incident_limit", 0) or rule_config.get("per_claim_max", 0))
    if cap > 0:
        context["per_incident_limit"] = cap
        return _ok("PER_INCIDENT_CAP_NOTED",
                   f"Per-incident limit of ₹{cap:,.2f} will be applied.",
                   severity="info")
    return _ok("PER_INCIDENT_CAP_NA", "No per-incident limit configured.", severity="info")


# ─────────────────────────────────────────────────────────────────────────────
# Registry Map
# ─────────────────────────────────────────────────────────────────────────────

RULE_REGISTRY: dict[str, Callable] = {
    # Global
    "policy_active": rule_policy_active,
    "date_within_term": rule_date_within_term,
    "claimed_amount_positive": rule_claimed_amount_positive,
    "missing_core_fields": rule_missing_core_fields,
    "coverage_match": rule_coverage_match,
    "waiting_period": rule_waiting_period,
    "exclusions_keyword": rule_exclusions_keyword,
    "required_docs": rule_required_docs,
    "amount_outlier_review": rule_amount_outlier_review,
    # Health
    "copay_apply": rule_copay_apply,
    "annual_limit_cap": rule_annual_limit_cap,
    # Life
    "suicide_exclusion_within_days": rule_suicide_exclusion_within_days,
    "contestability_period_review": rule_contestability_period_review,
    # Auto / Property (shared)
    "deductible_apply": rule_deductible_apply,
    "per_incident_cap": rule_per_incident_cap,
}


def dispatch_rule(rule_config: dict, claim: dict, policy: dict, context: dict) -> dict:
    """Look up and execute a rule from the registry.

    Returns a standardised result dict. Unknown rule types are silently passed
    (non-blocking) so forward-compatibility is maintained.
    """
    rule_type = rule_config.get("type", "")
    fn = RULE_REGISTRY.get(rule_type)
    if fn is None:
        return _ok(f"UNKNOWN_RULE_{rule_type.upper()}",
                   f"Rule type '{rule_type}' is not registered; skipping (non-blocking).",
                   severity="info")
    try:
        return fn(rule_config, claim, policy, context)
    except Exception as exc:  # pragma: no cover
        return _ok(f"RULE_EVAL_ERROR_{rule_type.upper()}",
                   f"Rule '{rule_type}' raised an error ({exc}); skipping.",
                   severity="info")
