"""Layer 3 — Fusion: Composite Score, Risk Band, Recommended Action, Top Reasons

Takes outputs from all three tiers and produces the final fraud_analysis block.
"""


def run_fusion(
    tier1_result: dict,
    tier2_result: dict,
    tier3_result: dict,
    cfg: dict,
    diagnostics_dict: dict,
) -> dict:
    """
    Compute the composite fraud score, risk band, recommended action, and top reasons.

    Returns the full `fraud_analysis` dict to be stored in claims.fraud_analysis.
    """
    weights = cfg.get("tier_weights", [0.3, 0.3, 0.4])
    high_threshold = cfg.get("high_threshold", 0.70)
    medium_threshold = cfg.get("medium_threshold", 0.30)

    t1_score = float(tier1_result.get("score", 0.0))
    t2_score = float(tier2_result.get("score", 0.0))
    t3_score = float(tier3_result.get("score", 0.0))

    composite = weights[0] * t1_score + weights[1] * t2_score + weights[2] * t3_score
    composite = round(min(1.0, max(0.0, composite)), 4)

    # ── Risk band ────────────────────────────────────────────────
    if composite >= high_threshold:
        risk_band = "high"
    elif composite >= medium_threshold:
        risk_band = "medium"
    else:
        risk_band = "low"

    # ── Recommended action ────────────────────────────────────────
    action_map = {
        "high": "fraud_investigation",
        "medium": "manual_review",
        "low": "none",
    }
    recommended_action = action_map[risk_band]

    # ── Top reasons ───────────────────────────────────────────────
    reasons: list[dict] = []

    # From Tier 1 flags
    t1_flags = tier1_result.get("flags", {})
    t1_evidence = tier1_result.get("evidence", {})
    t1_contribution = round(weights[0] * t1_score, 4)

    flag_reasons = {
        "duplicate_invoice": ("Duplicate invoice number detected", 0.9),
        "coverage_date_flag": ("Claim date outside policy coverage period", 0.8),
        "claimant_velocity": ("High claim frequency from this claimant", 0.7),
        "provider_velocity": ("High claim velocity from this provider", 0.6),
        "amount_anomaly": ("Claimed amount is statistically anomalous", 0.5),
        "late_reporting": ("Claim reported more than 90 days after incident", 0.3),
    }

    for flag_key, (label, weight_factor) in flag_reasons.items():
        if t1_flags.get(flag_key):
            reasons.append({
                "reason": label,
                "tier": "tier1",
                "weight": round(weight_factor, 2),
                "contribution": round(t1_contribution * weight_factor, 4),
            })

    # From Tier 2
    t2_contribution = round(weights[1] * t2_score, 4)
    doc_reuse = tier2_result.get("doc_reuse", [])
    top_matches = tier2_result.get("top_matches", [])

    if doc_reuse:
        reasons.append({
            "reason": f"Document reuse detected ({len(doc_reuse)} shared file(s))",
            "tier": "tier2",
            "weight": 0.9,
            "contribution": t2_contribution,
        })
    elif top_matches and top_matches[0]["similarity"] >= cfg.get("similarity_score_threshold", 0.80):
        reasons.append({
            "reason": f"High similarity to existing claim (score: {top_matches[0]['similarity']:.2f})",
            "tier": "tier2",
            "weight": 0.7,
            "contribution": t2_contribution,
        })
    elif top_matches:
        reasons.append({
            "reason": f"Partial similarity to existing claim (score: {top_matches[0]['similarity']:.2f})",
            "tier": "tier2",
            "weight": 0.4,
            "contribution": t2_contribution,
        })

    # From Tier 3
    t3_contribution = round(weights[2] * t3_score, 4)
    cluster = tier3_result.get("cluster_summary", {})
    alert = tier3_result.get("alert_summary")

    if alert:
        reasons.append({
            "reason": f"Fraud ring alert: cluster of {cluster.get('size', '?')} claims with shared identifiers",
            "tier": "tier3",
            "weight": 1.0,
            "contribution": t3_contribution,
        })
    elif cluster.get("size", 1) > 3:
        reasons.append({
            "reason": f"Connected to {cluster['size'] - 1} other claims via shared identifiers",
            "tier": "tier3",
            "weight": 0.6,
            "contribution": t3_contribution,
        })
    if cluster.get("provider_hub_degree", 0) >= 5:
        reasons.append({
            "reason": f"Provider is a hub ({cluster['provider_hub_degree']} claims in window)",
            "tier": "tier3",
            "weight": 0.5,
            "contribution": t3_contribution,
        })

    # Sort by contribution descending, take top 5
    reasons.sort(key=lambda r: r["contribution"], reverse=True)
    top_reasons = reasons[:5]

    fraud_analysis = {
        "tier1": tier1_result,
        "tier2": tier2_result,
        "tier3": tier3_result,
        "weights": weights,
        "composite_score": composite,
        "risk_band": risk_band,
        "recommended_action": recommended_action,
        "top_reasons": top_reasons,
        "diagnostics": diagnostics_dict,
    }

    return fraud_analysis
