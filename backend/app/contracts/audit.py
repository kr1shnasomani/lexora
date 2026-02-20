from pydantic import BaseModel, UUID4
from typing import Any
from datetime import datetime
from app.contracts.enums import EventType

class AuditEventCreate(BaseModel):
    claim_id: UUID4
    event_type: EventType
    actor: str
    payload: dict[str, Any] = {}

class AuditEvent(AuditEventCreate):
    id: UUID4
    created_at: datetime
