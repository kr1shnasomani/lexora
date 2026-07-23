"""Lexora Backend — Claims API Routes"""
import json
from datetime import datetime

from engines.fraud_engine import run_fraud_check
from engines.layer2 import evaluate_policy
from engines.risk_fusion import run_decision
from fastapi import APIRouter, HTTPException, Query
from models import (
    AuditEventResponse,
    ClaimCreateRequest,
    ClaimResponse,
    ManualReviewRequest,
)
from services.audit import get_audit_trail, log_audit_event
from state_machine import enforce_transition

from database import get_supabase

router = APIRouter(prefix="/claims", tags=["Claims"])


# ─────────────────────────────────────────────────────────────
# POST /claims — Create a new claim
# ─────────────────────────────────────────────────────────────
@router.post("", response_model=ClaimResponse)
async def create_claim(req: ClaimCreateRequest):
    db = get_supabase()

    # Check idempotency
    if req.idempotency_key:
        existing = (
            db.table("claims")
            .select("*")
            .eq("idempotency_key", req.idempotency_key)
            .execute()
        )
        if existing.data:
            return existing.data[0]

    # Resolve policy_id from policy_number
    policy_id = None
    if req.policy_number:
        policy_result = (
            db.table("policies")
            .select("id")
            .eq("policy_number", req.policy_number)
            .execute()
        )
        if policy_result.data:
            policy_id = policy_result.data[0]["id"]

    # Fallback: use the same default policy as n8n workflow
    if not policy_id:
        policy_id = "807d584e-d36e-49d0-92a6-b775986f2dc9"

    record = {
        "claim_number": req.claim_number,
        "policy_id": policy_id,
        "idempotency_key": req.idempotency_key,
        "status": "submitted",
        "claimant_name": req.claimant_name,
        "claimant_phone": req.claimant_phone,
        "incident_date": req.incident_date,
        "incident_type": req.incident_type,
        "incident_description": req.incident_description,
        "claimed_amount": req.claimed_amount,
        "provider_name": req.provider_name,
        "invoice_number": req.invoice_number,
        "extraction_raw": json.dumps(req.extraction_raw or {}),
        "extraction_confidence": req.extraction_confidence,
        "extraction_warnings": json.dumps(req.extraction_warnings or []),
    }

    # Remove None values
    record = {k: v for k, v in record.items() if v is not None}

    result = db.table("claims").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create claim")

    claim = result.data[0]
    log_audit_event(claim["id"], "submission", "completed", {"claim_number": claim["claim_number"]})

    return claim


# ─────────────────────────────────────────────────────────────
# GET /claims — List all claims
# ─────────────────────────────────────────────────────────────
@router.get("")
async def list_claims(
    status: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    db = get_supabase()
    query = db.table("claims").select("*, policies(policy_number, policy_start_date), users(full_name)").order("created_at", desc=True).limit(limit).offset(offset)

    if status:
        query = query.eq("status", status)

    result = query.execute()
    return {"items": result.data or [], "count": len(result.data or [])}


# ─────────────────────────────────────────────────────────────
# GET /claims/{id} — Get single claim with full detail
# ─────────────────────────────────────────────────────────────
@router.get("/{claim_id}")
async def get_claim(claim_id: str):
    db = get_supabase()
    result = db.table("claims").select("*").eq("id", claim_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Also fetch audit trail
    audit = get_audit_trail(claim_id)

    # Fetch documents
    docs = db.table("claim_documents").select("*").eq("claim_id", claim_id).execute()

    return {
        "claim": result.data,
        "audit_trail": audit,
        "documents": docs.data or [],
    }

# ─────────────────────────────────────────────────────────────
# GET /claims/{id}/documents/{doc_id}/download — Get document preview URL
# ─────────────────────────────────────────────────────────────
@router.get("/{claim_id}/documents/{doc_id}/download")
async def get_document_url(claim_id: str, doc_id: str):
    db = get_supabase()
    
    # Verify the document belongs to the claim
    doc_result = db.table("claim_documents").select("*").eq("id", doc_id).eq("claim_id", claim_id).single().execute()
    
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document not found")
        
    storage_key = doc_result.data.get("storage_key")
    if not storage_key:
        raise HTTPException(status_code=400, detail="Document has no associated file")
        
    try:
        # Generate a signed URL valid for 3600 seconds (1 hour)
        res = db.storage.from_("claim_documents").create_signed_url(storage_key, 3600)
        signed_url = res.get("signedURL") or res.get("signedUrl")
        
        if not signed_url:
            raise RuntimeError("Failed to generate signed URL")
            
        return {"url": signed_url}
    except Exception as e:
        # Fallback for public bucket just in case
        try:
            public_url = db.storage.from_("claim_documents").get_public_url(storage_key)
            return {"url": public_url}
        except:
            raise HTTPException(status_code=500, detail="Failed to fetch document URL. Please try again.")


# ─────────────────────────────────────────────────────────────
# POST /claims/{id}/run-policy — Run policy engine
# ─────────────────────────────────────────────────────────────
@router.post("/{claim_id}/run-policy")
async def run_policy_engine(claim_id: str):
    db = get_supabase()

    # Fetch current claim
    claim = db.table("claims").select("id, status").eq("id", claim_id).single().execute()
    if not claim.data:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Enforce state transition
    enforce_transition(claim.data["status"], "policy_evaluating")

    # Update status
    db.table("claims").update({"status": "policy_evaluating"}).eq("id", claim_id).execute()

    # Run policy engine
    try:
        policy_result = evaluate_policy(claim_id)

        # Store result and advance status
        db.table("claims").update({
            "policy_decision": json.dumps(policy_result),
            "status": "fraud_checking",  # auto-advance after policy
        }).eq("id", claim_id).execute()

        return {"status": "completed", "policy_decision": policy_result}

    except Exception as e:
        db.table("claims").update({
            "status": "error",
            "current_state_context": json.dumps({"error": str(e), "stage": "policy_engine"}),
        }).eq("id", claim_id).execute()
        log_audit_event(claim_id, "policy_engine", "failed", {"error": str(e)})
        raise HTTPException(status_code=500, detail="Policy engine failed. Check audit log for details.")


# ─────────────────────────────────────────────────────────────
# POST /claims/{id}/run-fraud — Run fraud engine
# ─────────────────────────────────────────────────────────────
@router.post("/{claim_id}/run-fraud")
async def run_fraud_engine(claim_id: str):
    db = get_supabase()

    claim = db.table("claims").select("id, status").eq("id", claim_id).single().execute()
    if not claim.data:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Allow running from fraud_checking status
    if claim.data["status"] != "fraud_checking":
        enforce_transition(claim.data["status"], "fraud_checking")
        db.table("claims").update({"status": "fraud_checking"}).eq("id", claim_id).execute()

    try:
        fraud_result = run_fraud_check(claim_id)

        db.table("claims").update({
            "fraud_score": fraud_result["fraud_score"],
            "fraud_analysis": json.dumps(fraud_result["fraud_analysis"]),
            "status": "deciding",  # auto-advance after fraud
        }).eq("id", claim_id).execute()

        return {"status": "completed", "fraud_result": fraud_result}

    except Exception as e:
        db.table("claims").update({
            "status": "error",
            "current_state_context": json.dumps({"error": str(e), "stage": "fraud_engine"}),
        }).eq("id", claim_id).execute()
        log_audit_event(claim_id, "fraud_engine", "failed", {"error": str(e)})
        raise HTTPException(status_code=500, detail="Fraud engine failed. Check audit log for details.")


# ─────────────────────────────────────────────────────────────
# POST /claims/{id}/decide — Run risk fusion & decision
# ─────────────────────────────────────────────────────────────
@router.post("/{claim_id}/decide")
async def decide_claim(claim_id: str):
    db = get_supabase()

    claim = db.table("claims").select("id, status").eq("id", claim_id).single().execute()
    if not claim.data:
        raise HTTPException(status_code=404, detail="Claim not found")

    if claim.data["status"] != "deciding":
        enforce_transition(claim.data["status"], "deciding")
        db.table("claims").update({"status": "deciding"}).eq("id", claim_id).execute()

    try:
        decision = run_decision(claim_id)

        # Map decision route to status
        route = decision["final_decision"]
        if route == "auto_approve" or route == "auto_reject":
            new_status = "finalized"
        elif route == "fraud_investigation":
            new_status = "fraud_investigation"
        else:
            new_status = "under_review"

        update = {
            "status": new_status,
            "final_decision": route,
            "decision_output": json.dumps(decision["decision_output"]),
            "decision_rationale": decision["decision_rationale"],
            "processed_at": datetime.utcnow().isoformat(),
        }

        if decision.get("approved_amount") is not None:
            update["approved_amount"] = decision["approved_amount"]

        db.table("claims").update(update).eq("id", claim_id).execute()

        return {"status": "completed", "decision": decision, "new_status": new_status}

    except Exception as e:
        db.table("claims").update({
            "status": "error",
            "current_state_context": json.dumps({"error": str(e), "stage": "decision"}),
        }).eq("id", claim_id).execute()
        log_audit_event(claim_id, "decision", "failed", {"error": str(e)})
        raise HTTPException(status_code=500, detail="Decision engine failed. Check audit log for details.")


# ─────────────────────────────────────────────────────────────
# POST /claims/{id}/run-all — Run full pipeline (convenience)
# ─────────────────────────────────────────────────────────────
@router.post("/{claim_id}/run-all")
async def run_full_pipeline(claim_id: str):
    """Convenience endpoint: runs policy → fraud → decision in sequence."""
    db = get_supabase()

    claim = db.table("claims").select("id, status").eq("id", claim_id).single().execute()
    if not claim.data:
        raise HTTPException(status_code=404, detail="Claim not found")

    results = {}

    # Step 1: Policy
    current = db.table("claims").select("status").eq("id", claim_id).single().execute().data
    if current["status"] in ("extracted", "submitted"):
        if current["status"] == "submitted":
            db.table("claims").update({"status": "extracted"}).eq("id", claim_id).execute()
        enforce_transition("extracted", "policy_evaluating")
        db.table("claims").update({"status": "policy_evaluating"}).eq("id", claim_id).execute()
        results["policy"] = evaluate_policy(claim_id)

        # Inspect if Layer 2 outright rejected it
        if results["policy"].get("outcome", {}).get("status") == "REJECT":
            update_payload = {
                "policy_decision": json.dumps(results["policy"]),
                "status": "finalized",
                "final_decision": "auto_reject",
                "processed_at": datetime.utcnow().isoformat(),
            }
            db.table("claims").update(update_payload).eq("id", claim_id).execute()
            results["new_status"] = "finalized"
            return results

        # Determine target state based on Layer 2 status
        l2_status = results["policy"].get("outcome", {}).get("status")
        next_status = "fraud_checking"
        
        db.table("claims").update({
            "policy_decision": json.dumps(results["policy"]),
            "status": next_status,
        }).eq("id", claim_id).execute()

    # Step 2: Fraud
    current = db.table("claims").select("status, policy_decision").eq("id", claim_id).single().execute().data
    
    if current["status"] == "fraud_checking":
        fraud_result = run_fraud_check(claim_id)
        results["fraud"] = fraud_result
        
        # We always proceed to deciding so Layer 4 can weigh fraud vs policy review
        next_status = "deciding"
        
        db.table("claims").update({
            "fraud_score": fraud_result["fraud_score"],
            "fraud_analysis": json.dumps(fraud_result["fraud_analysis"]),
            "status": next_status,
        }).eq("id", claim_id).execute()

    # Step 3: Decision
    current = db.table("claims").select("status").eq("id", claim_id).single().execute().data
    if current["status"] == "deciding":
        decision = run_decision(claim_id)
        results["decision"] = decision

        route = decision["final_decision"]
        if route in ("auto_approve", "auto_reject"):
            new_status = "finalized"
        elif route == "fraud_investigation":
            new_status = "fraud_investigation"
        else:
            new_status = "under_review"

        update = {
            "status": new_status,
            "final_decision": route,
            "decision_output": json.dumps(decision["decision_output"]),
            "decision_rationale": decision["decision_rationale"],
            "processed_at": datetime.utcnow().isoformat(),
        }
        if decision.get("approved_amount") is not None:
            update["approved_amount"] = decision["approved_amount"]

        db.table("claims").update(update).eq("id", claim_id).execute()
        results["new_status"] = new_status

    return results


# ─────────────────────────────────────────────────────────────
# POST /claims/{id}/manual-review — Human override
# ─────────────────────────────────────────────────────────────
@router.post("/{claim_id}/manual-review")
async def manual_review(claim_id: str, req: ManualReviewRequest):
    db = get_supabase()

    claim = db.table("claims").select("*").eq("id", claim_id).single().execute()
    if not claim.data:
        raise HTTPException(status_code=404, detail="Claim not found")

    current_status = claim.data["status"]
    current_decision = claim.data.get("final_decision")

    if current_decision == req.decision:
        raise HTTPException(
            status_code=409,
            detail=f"Claim is already routed as {req.decision}. No explicit override needed.",
        )

    import uuid
    def is_valid_uuid(val):
        try:
            uuid.UUID(str(val))
            return True
        except (ValueError, TypeError):
            return False

    reviewer_uuid = req.reviewer_id if is_valid_uuid(req.reviewer_id) else None
    
    # Fallback to the first available user in DB to satisfy foreign key / not-null UUID constraints
    # if the frontend passes a dummy mock ID like 'demo-user-001' or 'system'
    if not reviewer_uuid:
        fallback = db.table("users").select("id").limit(1).execute()
        if fallback.data:
            reviewer_uuid = fallback.data[0]["id"]

    # Update claim. If they manual override to "fraud_investigation", that's a valid status.
    # Otherwise, "manual_review" isn't a valid status ENUM... it must be "under_review"
    new_status = "finalized"
    if req.decision == "fraud_investigation":
        new_status = "fraud_investigation"
    elif req.decision in ["manual_review", "under_review"]:
        new_status = "under_review"

    update = {
        "status": new_status,
        "final_decision": req.decision,
        "reviewed_at": datetime.utcnow().isoformat(),
        "decision_rationale": req.rationale or f"Manual override: {req.decision}",
        "processed_at": datetime.utcnow().isoformat(),
    }
    
    if reviewer_uuid:
        update["reviewed_by"] = reviewer_uuid

    if req.approved_amount is not None:
        update["approved_amount"] = req.approved_amount

    db.table("claims").update(update).eq("id", claim_id).execute()

    # Audit
    log_audit_event(
        claim_id,
        "manual_review",
        "completed",
        {
            "reviewer_id": req.reviewer_id,
            "decision": req.decision,
            "approved_amount": req.approved_amount,
        },
    )

    # Insert feedback record
    system_decision = claim.data.get("final_decision")
    if system_decision and system_decision != req.decision:
        feedback_record = {
            "claim_id": claim_id,
            "reviewed_by": reviewer_uuid,
            "system_decision": system_decision,
            "human_decision": req.decision,
            "feedback_category": req.feedback_category or "manual_override",
            "feedback_notes": req.feedback_notes,
            "flagged_for_retraining": True,
        }
        db.table("feedback").insert(feedback_record).execute()

    return {"status": "finalized", "decision": req.decision}


# ─────────────────────────────────────────────────────────────
# GET /claims/{id}/audit — Get audit trail
# ─────────────────────────────────────────────────────────────
@router.get("/{claim_id}/audit")
async def get_claim_audit(claim_id: str):
    trail = get_audit_trail(claim_id)
    return {"audit_trail": trail}


# ─────────────────────────────────────────────────────────────
# POST /claims/run-layer2 — Batch run Layer 2 on pending claims
# ─────────────────────────────────────────────────────────────
@router.post("/run-layer2")
async def run_layer2_batch():
    """Run Layer 2 policy engine on all pending claims.

    Pending = status='extracted' AND policy_decision IS NULL.
    """
    db = get_supabase()

    result = (
        db.table("claims")
        .select("id, claim_number")
        .eq("status", "extracted")
        .is_("policy_decision", "null")
        .order("created_at", desc=False)
        .execute()
    )
    pending = result.data or []

    if not pending:
        return {"processed_count": 0, "claim_ids_success": [], "claim_ids_failed": []}

    success_ids: list[str] = []
    failed_entries: list[dict] = []

    for row in pending:
        claim_id = row["id"]
        try:
            evaluate_policy(claim_id)
            success_ids.append(claim_id)
        except Exception as exc:
            failed_entries.append({"claim_id": claim_id, "error": "Policy evaluation failed — see audit log"})

    return {
        "processed_count": len(pending),
        "claim_ids_success": success_ids,
        "claim_ids_failed": failed_entries,
    }


# ─────────────────────────────────────────────────────────────
# POST /claims/process-pending — Sweep for automated pipeline progression
# ─────────────────────────────────────────────────────────────
@router.post("/process-pending")
async def process_pending():
    """Find claims stuck in intermediate states and systematically bounce them through run_full_pipeline"""
    db = get_supabase()
    
    # Target any states that constitute intermediate automation
    result = (
        db.table("claims")
        .select("id, status")
        .in_("status", ["submitted", "extracted", "policy_evaluating", "fraud_checking", "deciding"])
        .order("created_at", desc=False)
        .execute()
    )
    pending = result.data or []

    if not pending:
        return {"processed_count": 0, "logs": [], "message": "No intermediate claims pending pipeline processing"}

    logs = []
    
    for row in pending:
        claim_id = row["id"]
        try:
            res = await run_full_pipeline(claim_id)
            logs.append({"claim_id": claim_id, "status": "success", "new_status": res.get("new_status")})
        except Exception as e:
            # Catch errors to permit other claims to finish
            logs.append({"claim_id": claim_id, "status": "error", "error": "Pipeline failed — see audit log"})

    return {"processed_count": len(pending), "logs": logs}
