from fastapi import APIRouter, Path
from typing import List
from app.contracts.audit import AuditEvent
from app.audit.writer import get_simulated_events
from app.db.queries import get_claim_events
from app.core.settings import settings

router = APIRouter(prefix="/api/claims/{claim_id}/events", tags=["Audit"])

@router.get("", response_model=List[AuditEvent])
async def list_claim_events(claim_id: str = Path(...)):
    if settings.simulation_mode:
        events = get_simulated_events(claim_id)
        return [e for e in events]
        
    db_events = get_claim_events(claim_id)
    return [AuditEvent(**e) for e in db_events]
