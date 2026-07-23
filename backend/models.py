"""Lexora Backend — Pydantic Models"""
from datetime import date, datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


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
    idempotency_key: str | None = None
    claimant_name: str | None = None
    claimant_phone: str | None = None
    incident_date: str | None = None
    incident_type: str | None = None
    incident_description: str | None = None
    claimed_amount: float | None = None
    provider_name: str | None = None
    invoice_number: str | None = None
    extraction_raw: dict | None = Field(default_factory=dict)
    extraction_confidence: float | None = None
    extraction_warnings: list | None = Field(default_factory=list)


class N8NExtractionPayload(BaseModel):
    """Payload from n8n webhook after extraction completes"""
    execution_id: str
    claim_number: str | None = None
    policy_number: str | None = None
    claimant_name: str | None = None
    claimant_phone: str | None = None
    incident_date: str | None = None
    incident_type: str | None = None
    incident_description: str | None = None
    claimed_amount: float | None = None
    provider_name: str | None = None
    invoice_number: str | None = None
    extraction_raw: dict | None = Field(default_factory=dict)
    extraction_confidence: float | None = None
    extraction_warnings: list | None = Field(default_factory=list)
    needs_review: bool = False
    file_names: list[str] | None = Field(default_factory=list)
    storage_keys: list[str] | None = Field(default_factory=list)


class ManualReviewRequest(BaseModel):
    reviewer_id: str
    decision: FinalDecision
    approved_amount: float | None = None
    rationale: str | None = None
    feedback_category: str | None = None
    feedback_notes: str | None = None


# ── Response Models ───────────────────────────────────────────
class ClaimResponse(BaseModel):
    id: str
    claim_number: str
    policy_id: str | None = None
    status: str
    final_decision: str | None = None
    claimant_name: str | None = None
    claimant_phone: str | None = None
    incident_date: str | None = None
    incident_type: str | None = None
    incident_description: str | None = None
    claimed_amount: float | None = None
    approved_amount: float | None = None
    provider_name: str | None = None
    invoice_number: str | None = None
    extraction_confidence: float | None = None
    extraction_warnings: Any | None = None
    extraction_raw: Any | None = None
    policy_decision: Any | None = None
    fraud_score: float | None = None
    fraud_analysis: Any | None = None
    decision_rationale: str | None = None
    decision_output: Any | None = None
    reviewed_by: str | None = None
    reviewed_at: str | None = None
    submitted_at: str | None = None
    processed_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class AuditEventResponse(BaseModel):
    id: str
    claim_id: str
    stage: str
    event_type: str
    payload: Any | None = None
    model_versions: Any | None = None
    duration_ms: int | None = None
    created_at: str | None = None


class PolicyInfo(BaseModel):
    id: str
    policy_number: str
    policy_type: str
    holder_name: str
    policy_start_date: str
    policy_end_date: str
    annual_limit: float
    is_active: bool
