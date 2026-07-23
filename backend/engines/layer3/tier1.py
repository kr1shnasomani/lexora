"""Layer 3 — Tier 1: Deterministic Sentinel Rules (High Precision)

Rules applied (all skip gracefully on missing data):
  1. Duplicate invoice
  2. Claimant velocity (phone preferred, fallback: name+policy)
  3. Provider velocity
  4. Amount anomaly (z-score vs historical finalized claims)
  5. Late reporting (incident_date vs submitted_at)
  6. Coverage consistency (incident_date vs policy_end_date)

Returns:
    {
        "flags": {...},        # bool per signal
        "evidence": {...},     # supporting details
        "score": float,        # 0.0–1.0
    }
"""
import math
from datetime import date, datetime, timedelta

from engines.layer3.canonical import normalize_invoice, normalize_phone


def run_tier1(db, claim: dict, policy: dict | None, cfg: dict) -> dict:
    flags: dict = {}
    evidence: dict = {}
    score = 0.0

    t1_cfg = {
        "velocity_window_days": cfg.get("velocity_window_days", 7),
        "velocity_max_claims": cfg.get("velocity_max_claims", 5),
        "provider_velocity_window_days": cfg.get("provider_velocity_window_days", 7),
        "provider_velocity_max_claims": cfg.get("provider_velocity_max_claims", 20),
        "amount_sigma_threshold": cfg.get("amount_sigma_threshold", 3.0),
    }

    claim_id = claim.get("id", "")
    policy_id = claim.get("policy_id")

    # ── 1. Duplicate Invoice ──────────────────────────────────────
    invoice = normalize_invoice(claim.get("invoice_number") or "")
    if invoice:
        try:
            cutoff = (datetime.utcnow() - timedelta(days=365)).isoformat()
            # Fetch recent claims that have an invoice_number, then compare
            # normalized values in Python to catch casing/whitespace differences.
            candidates = (
                db.table("claims")
                .select("id, claim_number, invoice_number, submitted_at")
                .neq("id", claim_id)
                .gte("submitted_at", cutoff)
                .execute()
            )
            dup_ids = []
            for c in (candidates.data or []):
                other_inv = normalize_invoice(c.get("invoice_number") or "")
                if other_inv and other_inv == invoice:
                    dup_ids.append(c["id"])

            dup_found = len(dup_ids) > 0
            flags["duplicate_invoice"] = dup_found
            if dup_found:
                evidence["duplicate_invoice_claim_ids"] = dup_ids
                score += 0.5
        except Exception as exc:
            flags["duplicate_invoice"] = False
            evidence["duplicate_invoice_error"] = str(exc)

    # ── 2. Claimant Velocity ──────────────────────────────────────
    phone = normalize_phone(claim.get("claimant_phone") or "")
    window_cutoff = (
        datetime.utcnow() - timedelta(days=t1_cfg["velocity_window_days"])
    ).isoformat()
    max_claims = t1_cfg["velocity_max_claims"]

    velocity_triggered = False
    try:
        if phone:
            # Prefer phone match
            recent = (
                db.table("claims")
                .select("id")
                .eq("claimant_phone", claim.get("claimant_phone"))
                .neq("id", claim_id)
                .gte("submitted_at", window_cutoff)
                .execute()
            )
            count = len(recent.data) if recent.data else 0
            flags["claimant_velocity"] = count >= max_claims
            evidence["claimant_velocity_count"] = count
            evidence["claimant_velocity_method"] = "phone"
            if count >= max_claims:
                velocity_triggered = True
        elif claim.get("claimant_name") and policy_id:
            # Fallback: name + policy
            recent = (
                db.table("claims")
                .select("id")
                .eq("claimant_name", claim.get("claimant_name"))
                .eq("policy_id", policy_id)
                .neq("id", claim_id)
                .gte("submitted_at", window_cutoff)
                .execute()
            )
            count = len(recent.data) if recent.data else 0
            flags["claimant_velocity"] = count >= max_claims
            evidence["claimant_velocity_count"] = count
            evidence["claimant_velocity_method"] = "name_policy"
            if count >= max_claims:
                velocity_triggered = True
    except Exception as exc:
        flags["claimant_velocity"] = False
        evidence["claimant_velocity_error"] = str(exc)

    if velocity_triggered:
        score += 0.25

    # ── 3. Provider Velocity ──────────────────────────────────────
    provider = (claim.get("provider_name") or "").strip()
    if provider:
        try:
            prov_cutoff = (
                datetime.utcnow()
                - timedelta(days=t1_cfg["provider_velocity_window_days"])
            ).isoformat()
            prov_max = t1_cfg["provider_velocity_max_claims"]
            prov_claims = (
                db.table("claims")
                .select("id")
                .eq("provider_name", provider)
                .neq("id", claim_id)
                .gte("submitted_at", prov_cutoff)
                .execute()
            )
            prov_count = len(prov_claims.data) if prov_claims.data else 0
            flags["provider_velocity"] = prov_count >= prov_max
            evidence["provider_velocity_count"] = prov_count
            if prov_count >= prov_max:
                score += 0.15
        except Exception as exc:
            flags["provider_velocity"] = False
            evidence["provider_velocity_error"] = str(exc)

    # ── 4. Amount Anomaly ─────────────────────────────────────────
    claimed_amount = claim.get("claimed_amount")
    if claimed_amount is not None:
        try:
            claimed_amount = float(claimed_amount)
            # Fetch historical finalized/approved claims for baseline
            query = (
                db.table("claims")
                .select("approved_amount")
                .eq("status", "finalized")
                .eq("final_decision", "auto_approve")
                .neq("id", claim_id)
            )
            # Try to segment by policy type if policy info available
            policy_type = (policy or {}).get("policy_type") if policy else None
            if policy_type:
                query = query.eq("policy_id", policy_id)

            hist = query.execute()
            amounts = [
                float(r["approved_amount"])
                for r in (hist.data or [])
                if r.get("approved_amount") is not None
            ]

            if len(amounts) >= 5:
                mean_ = sum(amounts) / len(amounts)
                variance = sum((x - mean_) ** 2 for x in amounts) / len(amounts)
                std_ = math.sqrt(variance) if variance > 0 else 0
                sigma_threshold = t1_cfg["amount_sigma_threshold"]

                if std_ > 0:
                    z_score = (claimed_amount - mean_) / std_
                    anomaly = z_score > sigma_threshold
                    flags["amount_anomaly"] = anomaly
                    evidence["amount_anomaly_z_score"] = round(z_score, 3)
                    evidence["amount_baseline_mean"] = round(mean_, 2)
                    evidence["amount_baseline_std"] = round(std_, 2)
                    if anomaly:
                        # Partial weight since this is just an anomaly signal
                        score += 0.10
                else:
                    flags["amount_anomaly"] = False
            else:
                flags["amount_anomaly"] = False
                evidence["amount_anomaly_skip_reason"] = "insufficient_history"
        except Exception as exc:
            flags["amount_anomaly"] = False
            evidence["amount_anomaly_error"] = str(exc)

    # ── 5. Late Reporting ─────────────────────────────────────────
    incident_date_str = claim.get("incident_date")
    submitted_at_str = claim.get("submitted_at")
    if incident_date_str and submitted_at_str:
        try:
            inc_date = date.fromisoformat(str(incident_date_str)[:10])
            submitted = datetime.fromisoformat(str(submitted_at_str)[:19]).date()
            days_late = (submitted - inc_date).days
            # Flag if reported more than 90 days after incident
            late = days_late > 90
            flags["late_reporting"] = late
            evidence["reporting_delay_days"] = days_late
            if late:
                score += 0.05
        except Exception:
            flags["late_reporting"] = False

    # ── 6. Coverage Consistency ───────────────────────────────────
    if incident_date_str and policy:
        try:
            inc_date = date.fromisoformat(str(incident_date_str)[:10])
            policy_end = date.fromisoformat(str(policy.get("policy_end_date", ""))[:10])
            out_of_coverage = inc_date > policy_end
            flags["coverage_date_flag"] = out_of_coverage
            evidence["policy_end_date"] = str(policy_end)
            evidence["incident_date"] = str(inc_date)
            if out_of_coverage:
                score += 0.20
        except Exception:
            flags["coverage_date_flag"] = False

    score = round(min(1.0, max(0.0, score)), 4)

    return {
        "flags": flags,
        "evidence": evidence,
        "score": score,
    }
