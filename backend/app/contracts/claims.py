from pydantic import BaseModel, Field, UUID4
from typing import Optional, List, Any
from datetime import datetime

from app.contracts.enums import ClaimStatus, FinalDecision

class ClaimCreate(BaseModel):
    policy_id: UUID4
    claim_type: str
    description: str
    incident_date: str
    idempotency_key: str

class ClaimFlag(BaseModel):
    icon: str
    color: str
    title: str
    description: str
    critical: bool = False

class ClaimListItem(BaseModel):
    id: UUID4 | str
    claim_number: str
    holder_name: str
    type: str
    amount: str
    risk_score: float | None = None
    status: ClaimStatus
    final_decision: FinalDecision | None = None
    date: str
    flags: List[ClaimFlag] = []

class ClaimView(ClaimListItem):
    policy_info: dict[str, Any] = {}
    financial_details: dict[str, Any] = {}
    documents: List[dict[str, Any]] = []
    layer_results: List[dict[str, Any]] = []
    audit_events: List[dict[str, Any]] = []

class PaginatedClaims(BaseModel):
    items: List[ClaimListItem]
    total: int
    page: int
    page_size: int
