"""Lexora — Risk Fusion & Decision Engine (Layer 4)

Expected Loss model:
  expected_loss = fraud_score × claimed_amount

Decision logic:
  if expected_loss > investigation_cost → fraud_investigation
  elif fraud_score < low_threshold → auto_approve
  else → manual_review
"""
import json
from database import get_supabase
from services.audit import AuditTimer


def run_decision(claim_id: str) -> dict:
    """
    Fuse risk signals and produce final decision using the SOLUTION.md Flowchart Decision Logic.
    """
    db = get_supabase()
    timer = AuditTimer(claim_id, "decision")
    timer.__enter__()

    try:
        # Fetch claim
        claim = db.table("claims").select("*").eq("id", claim_id).single().execute().data

        fraud_score = float(claim.get("fraud_score") or 0)
        claimed_amount = float(claim.get("claimed_amount") or 0)
        extraction_confidence = float(claim.get("extraction_confidence") or 0)
        policy_decision = claim.get("policy_decision")

        if isinstance(policy_decision, str):
            policy_decision = json.loads(policy_decision)

        # Configurable Dynamic Variables
        investigation_cost = _get_config_float(db, "fraud.investigation_cost", 5000)
        critical_fraud_threshold = _get_config_float(db, "fraud.high_threshold", 0.70)
        low_fraud_threshold = _get_config_float(db, "fraud.low_threshold", 0.30)
        min_confidence_threshold = _get_config_float(db, "routing.min_confidence", 0.60)
        auto_approve_confidence = _get_config_float(db, "routing.auto_approve_confidence", 0.85)

        expected_loss = fraud_score * claimed_amount
        recommended_amount = claimed_amount
        if policy_decision:
            outcome = policy_decision.get("outcome", {})
            if "recommended_amount" in outcome:
                recommended_amount = float(outcome["recommended_amount"])

        # Flowchart Step 1: Data Quality Sufficient?
        if extraction_confidence < min_confidence_threshold:
            route = "manual_review"
            rationale = "Low extraction confidence. Requires manual verification of data quality."
            approved_amount = None
        # Flowchart Step 2: Policy Rules Result?
        elif policy_decision and not policy_decision.get("outcome", {}).get("eligible", True):
            route = "auto_reject"
            failed_rules = ', '.join(policy_decision.get("rules", {}).get("failed", []))
            rationale = f"Policy violation. Failed rules: {failed_rules}."
            approved_amount = 0

        else:
            # Flowchart Step 2b: Layer 2 Review Override
            if policy_decision and policy_decision.get("outcome", {}).get("status") == "REVIEW":
                route = "manual_review"
                review_reasons = [r.get("message") for r in policy_decision.get("reasons", [])]
                reason_str = " | ".join(review_reasons)[:150]
                rationale = f"Layer 2 flagged for review: {reason_str}. (Additional Layer 3 fraud signals acquired for training: Score {fraud_score:.2f})"
                approved_amount = None

            # Flowchart Step 3: Fraud Score Branching
            elif fraud_score >= critical_fraud_threshold:
                # High Fraud -> SIU Investigation
                route = "fraud_investigation"
                rationale = f"High fraud probability detected (Score {fraud_score:.2f} >= {critical_fraud_threshold}). Assiging to SIU."
                approved_amount = None
                
            else:
                treat_as_low_risk = False
                
                if fraud_score >= low_fraud_threshold:
                    # Medium Fraud -> Calculate Expected Loss
                    if expected_loss > investigation_cost:
                        route = "manual_review"
                        rationale = f"Economic threshold reached. Expected Loss (₹{expected_loss:,.0f}) > Investigation Cost (₹{investigation_cost:,.0f}). Requires manual underwriter review."
                        approved_amount = None
                    else:
                        rule_reason = f"Medium fraud risk ({fraud_score:.2f}), but Expected Loss (₹{expected_loss:,.0f}) <= Threshold. Proceeding to confidence check."
                        treat_as_low_risk = True
                else:
                    rule_reason = f"Low fraud risk ({fraud_score:.2f} < {low_fraud_threshold}). Proceeding to confidence check."
                    treat_as_low_risk = True
                
                # Flowchart Step 4 (Low Risk Branch): Confidence check
                if treat_as_low_risk:
                    if extraction_confidence >= auto_approve_confidence:
                        route = "auto_approve"
                        rationale = f"Decision Safe Harbor: {rule_reason} High extraction confidence ({extraction_confidence:.2f} >= {auto_approve_confidence}). Auto-approved."
                        approved_amount = recommended_amount
                    else:
                        route = "manual_review"
                        rationale = f"{rule_reason} However, extraction confidence is only moderate ({extraction_confidence:.2f} < {auto_approve_confidence}). Required manual review."
                        approved_amount = None
        decision_output = {
            "route": route,
            "metrics": {
                "expected_loss": round(expected_loss, 2),
                "fraud_score": fraud_score,
                "extraction_confidence": extraction_confidence,
                "claimed_amount": claimed_amount,
                "recommended_policy_amount": recommended_amount
            },
            "thresholds": {
                "investigation_cost": investigation_cost,
                "critical_fraud": critical_fraud_threshold,
                "low_fraud": low_fraud_threshold,
                "min_confidence": min_confidence_threshold,
                "auto_approve_confidence": auto_approve_confidence
            }
        }

        timer.complete({
            "decision": route,
            "expected_loss": round(expected_loss, 2),
            "fraud_score": fraud_score,
            "extraction_confidence": extraction_confidence
        })

        if route == "auto_reject" and "policy_ineligible" in rationale:
            decision_output["reason"] = "policy_ineligible"
            decision_output["rules_failed"] = policy_decision.get("rules_failed", [])

        return {
            "final_decision": route,
            "decision_output": decision_output,
            "decision_rationale": rationale,
            "approved_amount": approved_amount,
        }

    except Exception as e:
        timer.__exit__(type(e), e, e.__traceback__)
        raise


def _get_config_float(db, key: str, default: float) -> float:
    try:
        result = db.table("configuration").select("config_value").eq("config_key", key).single().execute()
        if result.data:
            val = result.data["config_value"]
            if isinstance(val, str):
                val = json.loads(val)
            return float(val)
    except Exception:
        pass
    return default
