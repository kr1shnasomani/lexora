"""Lexora Backend — n8n Webhook Handler"""
import asyncio
import json
from datetime import datetime

import httpx
from config import get_settings
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from models import N8NExtractionPayload
from services.audit import log_audit_event

from database import get_supabase
from routes.claims import run_full_pipeline

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

settings = get_settings()


async def trigger_pipeline(claim_id: str):
    """Background task to chain L2 -> L3 -> L4."""
    # Add a small delay so the frontend has time to see "extracted" before it blips
    await asyncio.sleep(2)
    await run_full_pipeline(claim_id)


@router.post("/n8n-extraction")
async def receive_extraction(payload: N8NExtractionPayload, background_tasks: BackgroundTasks):
    """
    Receives extracted data from n8n Layer 1 workflow.

    Flow:
    1. Create claim record with status 'submitted'
    2. Transition to 'extracting'
    3. Store extraction results
    4. Transition to 'extracted' (or 'under_review' if needs_review)
    5. Trigger L2, L3, L4 background pipeline.
    """
    db = get_supabase()

    # Check idempotency
    if payload.execution_id:
        existing = (
            db.table("claims")
            .select("*")
            .eq("idempotency_key", payload.execution_id)
            .execute()
        )
        if existing.data:
            return {"status": "duplicate", "claim": existing.data[0]}

    # Generate claim number
    claim_number = payload.claim_number or f"CLM-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # Resolve policy_id from policy_number
    policy_id = None
    if payload.policy_number:
        policy_result = (
            db.table("policies")
            .select("id")
            .eq("policy_number", payload.policy_number)
            .execute()
        )
        if policy_result.data:
            policy_id = policy_result.data[0]["id"]

    # Fallback: use the same default policy as n8n workflow
    if not policy_id:
        policy_id = "807d584e-d36e-49d0-92a6-b775986f2dc9"

    # Determine target status
    target_status = "under_review" if payload.needs_review else "extracted"

    # Build claim record
    record = {
        "claim_number": claim_number,
        "policy_id": policy_id,
        "idempotency_key": payload.execution_id,
        "status": target_status,
        "claimant_name": payload.claimant_name,
        "claimant_phone": payload.claimant_phone,
        "incident_date": payload.incident_date,
        "incident_type": payload.incident_type,
        "incident_description": payload.incident_description,
        "claimed_amount": payload.claimed_amount,
        "provider_name": payload.provider_name,
        "invoice_number": payload.invoice_number,
        "extraction_raw": json.dumps(payload.extraction_raw or {}),
        "extraction_confidence": payload.extraction_confidence,
        "extraction_warnings": json.dumps(payload.extraction_warnings or []),
    }

    # Remove None values
    record = {k: v for k, v in record.items() if v is not None}

    result = db.table("claims").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create claim from extraction")

    claim = result.data[0]

    # Audit events for the extraction lifecycle
    log_audit_event(
        claim["id"],
        "layer1",
        "completed",
        {
            "execution_id": payload.execution_id,
            "fields_extracted": sum(1 for v in [
                payload.claimant_name, payload.claimant_phone, payload.incident_date,
                payload.incident_type, payload.incident_description, payload.claimed_amount,
                payload.provider_name, payload.invoice_number, payload.policy_number,
            ] if v is not None),
            "confidence": payload.extraction_confidence,
            "warnings": payload.extraction_warnings,
            "needs_review": payload.needs_review,
        },
    )

    # Automatically progress the pipeline for successfully extracted claims
    if target_status == "extracted":
        background_tasks.add_task(trigger_pipeline, claim["id"])

    return {
        "status": "created",
        "claim_id": claim["id"],
        "claim_number": claim["claim_number"],
        "target_status": target_status,
    }


@router.post("/n8n/claim-upload")
async def proxy_to_n8n(
    file: UploadFile = File(...),
    policy_id: str = Form(None),
    policy_number: str = Form(None)
):
    """
    Proxy endpoint that forwards file uploads from the frontend to the n8n webhook.
    
    This endpoint:
    1. Receives files from the customer dashboard
    2. Forwards them to the n8n workflow
    3. Returns the response back to the frontend
    """
    try:
        # Read the file content
        file_content = await file.read()
        
        # Prepare the file for forwarding
        files = {
            'data': (file.filename, file_content, file.content_type)
        }
        
        # Prepare form data
        data = {}
        if policy_id:
            data['policy_id'] = policy_id
        if policy_number:
            data['policy_number'] = policy_number
        
        # Forward to n8n webhook - use production endpoint
        n8n_url = f"{settings.n8n_webhook_url}/webhook/claim-upload"
        
        # Increase timeout to 5 minutes for AI processing
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                n8n_url,
                files=files,
                data=data
            )
            
            # Check if the request was successful
            response.raise_for_status()
            
        return {
            "status": "success",
            "message": "File uploaded to n8n successfully",
            "filename": file.filename,
            "n8n_response": response.text if response.text else "OK"
        }
        
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="n8n workflow timed out - it may still be processing in the background"
        )
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to forward file to n8n: {e!s}. Make sure n8n is running at {settings.n8n_webhook_url}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {e!s}"
        )
