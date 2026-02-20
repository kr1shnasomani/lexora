import uuid
from typing import Any, Tuple, List
from app.core.supabase_client import get_supabase
from app.core.settings import settings
from app.core.logging import logger
from app.contracts.enums import ClaimStatus, FinalDecision

def get_claim_by_id(claim_id: uuid.UUID | str) -> dict[str, Any] | None:
    if settings.simulation_mode:
        return _mock_claim(claim_id)
        
    client = get_supabase()
    if not client: return None
    
    response = client.table("claims").select("*").eq("id", str(claim_id)).execute()
    return response.data[0] if response.data else None

def list_claims(page: int = 1, page_size: int = 10, status_filter: str | None = None, risk_band: str | None = None) -> Tuple[List[dict], int]:
    if settings.simulation_mode:
        return [_mock_claim(f"mock-loop-{i}") for i in range(page_size)], 100
        
    client = get_supabase()
    if not client: return [], 0
    
    query = client.table("claims").select("*", count="exact")
    if status_filter:
        query = query.eq("status", status_filter)
        
    response = query.range((page - 1) * page_size, page * page_size - 1).execute()
    return response.data, response.count or 0

def create_claim(data: dict[str, Any]) -> dict[str, Any] | None:
    if settings.simulation_mode:
        claim_id = str(uuid.uuid4())
        mock = _mock_claim(claim_id)
        mock.update(data)
        logger.info(f"Mock created claim {claim_id}")
        return mock
        
    client = get_supabase()
    if not client: return None
    
    # Simple check for idempotency via metadata JSON or logic, here simplified
    logger.info(f"Creating claim via Supabase")
    response = client.table("claims").insert(data).execute()
    return response.data[0] if response.data else None
    
def update_claim_status(claim_id: uuid.UUID | str, status: ClaimStatus, final_decision: FinalDecision | None = None) -> dict[str, Any] | None:
    if settings.simulation_mode:
        mock = _mock_claim(claim_id)
        mock["status"] = status
        if final_decision: mock["final_decision"] = final_decision
        logger.info(f"Mock updated claim {claim_id} to status {status}")
        return mock
        
    client = get_supabase()
    if not client: return None
    
    update_data = {"status": status}
    if final_decision: update_data["final_decision"] = final_decision
    
    response = client.table("claims").update(update_data).eq("id", str(claim_id)).execute()
    return response.data[0] if response.data else None

def get_claim_events(claim_id: uuid.UUID | str) -> List[dict[str, Any]]:
    if settings.simulation_mode:
        return []
        
    client = get_supabase()
    if not client: return []
    
    response = client.table("audit_events").select("*").eq("claim_id", str(claim_id)).order("created_at").execute()
    return response.data

def _mock_claim(claim_id: str | uuid.UUID) -> dict[str, Any]:
    return {
        "id": str(claim_id),
        "claim_number": f"CLM-{str(claim_id)[:8]}",
        "policy_id": str(uuid.uuid4()),
        "status": ClaimStatus.submitted,
        "final_decision": None,
        "extraction_raw": {},
        "fraud_score": 0.1,
        "amount": 1250.00
    }
