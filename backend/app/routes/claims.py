import uuid
from typing import Optional, Any
from fastapi import APIRouter, HTTPException, Query, Path, Body
from app.contracts.claims import ClaimCreate, ClaimView, PaginatedClaims, ClaimListItem
from app.contracts.enums import ClaimStatus
from app.db.queries import create_claim, list_claims, get_claim_by_id, update_claim_status
from app.gateway.claim_view import assemble_claim_view
from app.orchestrator.pipeline import run_pipeline

router = APIRouter(prefix="/api/claims", tags=["Claims"])

@router.post("", response_model=ClaimView, status_code=201)
async def submit_claim(claim_data: ClaimCreate):
    # Simulated idempotency key check would go here in DB
    result = create_claim(claim_data.model_dump())
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create claim")
    
    view = assemble_claim_view(result["id"])
    return view

@router.get("", response_model=PaginatedClaims)
async def get_claims(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    risk_band: Optional[str] = None
):
    claims, total = list_claims(page, page_size, status, risk_band)
    
    items = []
    for c in claims:
        # Mini assembly for list items
        items.append(ClaimListItem(
            id=c["id"],
            claim_number=c["claim_number"],
            holder_name=c.get("holder_name", "Sarah Jenkins"),
            type=c.get("claim_type", "Medical"),
            amount=f"${c.get('amount', '1,250.00')}",
            risk_score=c.get("fraud_score", 0.1) * 100,
            status=c["status"],
            final_decision=c.get("final_decision"),
            date="Oct 12, 2023", # mock date
            flags=[]
        ))
        
    return PaginatedClaims(items=items, total=total, page=page, page_size=page_size)

@router.get("/{claim_id}", response_model=ClaimView)
async def get_single_claim(claim_id: str = Path(...)):
    view = assemble_claim_view(claim_id)
    if not view:
        raise HTTPException(status_code=404, detail="Claim not found")
    return view

@router.post("/{claim_id}/documents")
async def upload_document(claim_id: str = Path(...)):
    # Mock upload returning file ID
    return {"document_id": f"doc-{uuid.uuid4()}", "sha256": "mockedhashval"}

@router.post("/{claim_id}/actions", response_model=ClaimView)
async def claim_action(
    claim_id: str = Path(...), 
    payload: dict[str, Any] = Body(...)
):
    action = payload.get("action")
    
    if action == "simulate":
        await run_pipeline(claim_id, simulate=True)
    elif action == "approve":
        update_claim_status(claim_id, ClaimStatus.approved)
    elif action == "reject":
        update_claim_status(claim_id, ClaimStatus.denied)
    elif action == "escalate":
        update_claim_status(claim_id, ClaimStatus.under_review)
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    return assemble_claim_view(claim_id)
