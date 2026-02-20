import uuid
from datetime import datetime, timezone
from app.contracts.audit import AuditEventCreate, AuditEvent
from app.core.supabase_client import get_supabase
from app.core.settings import settings
from app.core.logging import logger

_simulation_events: list[AuditEvent] = []

async def write_event(event: AuditEventCreate) -> AuditEvent:
    """
    Appends an event to the audit_events table.
    Enforces append-only paradigm.
    """
    new_event = AuditEvent(
        id=uuid.uuid4(),
        created_at=datetime.now(timezone.utc),
        **event.model_dump()
    )
    
    if settings.simulation_mode:
        _simulation_events.append(new_event)
        logger.info(f"Mock Audit: {event.event_type} for claim {event.claim_id}")
        return new_event
        
    client = get_supabase()
    if not client:
        return new_event
        
    data = {
        "id": str(new_event.id),
        "claim_id": str(new_event.claim_id),
        "event_type": new_event.event_type,
        "actor": new_event.actor,
        "payload": new_event.payload,
        "created_at": new_event.created_at.isoformat()
    }
    
    try:
        client.table("audit_events").insert(data).execute()
        logger.info(f"Audit event {new_event.id} written for claim {new_event.claim_id}")
    except Exception as e:
        logger.error(f"Failed to write audit event: {e}")
        
    return new_event

def get_simulated_events(claim_id: uuid.UUID | str) -> list[AuditEvent]:
    """Helper to retrieve simulation mode events"""
    return [e for e in _simulation_events if str(e.claim_id) == str(claim_id)]
