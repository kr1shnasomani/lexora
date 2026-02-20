from enum import Enum

class ClaimStatus(str, Enum):
    submitted = "submitted"
    processing = "processing"
    under_review = "under_review"
    approved = "approved"
    denied = "denied"
    settled = "settled"
    closed = "closed"

class FinalDecision(str, Enum):
    auto_approved = "auto_approved"
    manual_approved = "manual_approved"
    rejected = "rejected"
    pending_review = "pending_review"
    escalated = "escalated"

class EventType(str, Enum):
    claim_created = "claim_created"
    document_uploaded = "document_uploaded"
    layer_started = "layer_started"
    layer_completed = "layer_completed"
    status_changed = "status_changed"
    decision_made = "decision_made"
    action_taken = "action_taken"
