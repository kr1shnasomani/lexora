"""Lexora Backend — Pydantic Models"""
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import date, datetime
from enum import Enum


# ── Enums ─────────────────────────────────────────────────────
class ClaimStatus(str, Enum):
    submitted = "submitted"
    extracting = "extracting"
    extracted = "extracted"
    policy_evaluating = "policy_evaluating"
    fraud_checking = "fraud_checking"
    deciding = "deciding"
    finalized = "finalized"
    under_review = "under_review"
    fraud_investigation = "fraud_investigation"
    error = "error"


class FinalDecision(str, Enum):
    auto_approve = "auto_approve"
    auto_reject = "auto_reject"
    manual_review = "manual_review"
    fraud_investigation = "fraud_investigation"


class IncidentType(str, Enum):
    accident = "accident"
    illness = "illness"
    theft = "theft"
    damage = "damage"
    other = "other"


# ── Request Models ────────────────────────────────────────────
class ClaimCreateRequest(BaseModel):
    claim_number: str
    policy_number: str
    idempotency_key: Optional[str] = None
    claimant_name: Optional[str] = None
    claimant_phone: Optional[str] = None
    incident_date: Optional[str] = None
    incident_type: Optional[str] = None
    incident_description: Optional[str] = None
    claimed_amount: Optional[float] = None
    provider_name: Optional[str] = None
    invoice_number: Optional[str] = None
    extraction_raw: Optional[dict] = Field(default_factory=dict)
    extraction_confidence: Optional[float] = None
    extraction_warnings: Optional[list] = Field(default_factory=list)


class N8NExtractionPayload(BaseModel):
    """Payload from n8n webhook after extraction completes"""
    execution_id: str
    claim_number: Optional[str] = None
    policy_number: Optional[str] = None
    claimant_name: Optional[str] = None
    claimant_phone: Optional[str] = None
    incident_date: Optional[str] = None
    incident_type: Optional[str] = None
    incident_description: Optional[str] = None
    claimed_amount: Optional[float] = None
    provider_name: Optional[str] = None
    invoice_number: Optional[str] = None
    extraction_raw: Optional[dict] = Field(default_factory=dict)
    extraction_confidence: Optional[float] = None
    extraction_warnings: Optional[list] = Field(default_factory=list)
    needs_review: bool = False
    file_names: Optional[list[str]] = Field(default_factory=list)
    storage_keys: Optional[list[str]] = Field(default_factory=list)


class ManualReviewRequest(BaseModel):
    reviewer_id: str
    decision: FinalDecision
    approved_amount: Optional[float] = None
    rationale: Optional[str] = None
    feedback_category: Optional[str] = None
    feedback_notes: Optional[str] = None


# ── Response Models ───────────────────────────────────────────
class ClaimResponse(BaseModel):
    id: str
    claim_number: str
    policy_id: Optional[str] = None
    status: str
    final_decision: Optional[str] = None
    claimant_name: Optional[str] = None
    claimant_phone: Optional[str] = None
    incident_date: Optional[str] = None
    incident_type: Optional[str] = None
    incident_description: Optional[str] = None
    claimed_amount: Optional[float] = None
    approved_amount: Optional[float] = None
    provider_name: Optional[str] = None
    invoice_number: Optional[str] = None
    extraction_confidence: Optional[float] = None
    extraction_warnings: Optional[Any] = None
    extraction_raw: Optional[Any] = None
    policy_decision: Optional[Any] = None
    fraud_score: Optional[float] = None
    fraud_analysis: Optional[Any] = None
    decision_rationale: Optional[str] = None
    decision_output: Optional[Any] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    submitted_at: Optional[str] = None
    processed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AuditEventResponse(BaseModel):
    id: str
    claim_id: str
    stage: str
    event_type: str
    payload: Optional[Any] = None
    model_versions: Optional[Any] = None
    duration_ms: Optional[int] = None
    created_at: Optional[str] = None


class PolicyInfo(BaseModel):
    id: str
    policy_number: str
    policy_type: str
    holder_name: str
    policy_start_date: str
    policy_end_date: str
    annual_limit: float
    is_active: bool
