from pydantic import BaseModel
from typing import Optional, List

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    member_since: str        # e.g. "2021"
    policy_count: int = 0
    active_claim_count: int = 0

class PolicySummary(BaseModel):
    id: str
    policy_number: str
    name: str
    type: str                # "health" | "auto" | "travel" | "pet" | "life"
    status: str              # "active" | "expired" | "expiring"
    icon: str
    coverage_amount: Optional[str] = None
    premium: Optional[str] = None
    premium_suffix: Optional[str] = None
    renewal_date: Optional[str] = None
    since: Optional[str] = None
    extra_stats: Optional[dict] = None  # flexible per-policy stats

class PolicyDetail(PolicySummary):
    documents: List[str] = []
    beneficiaries: List[str] = []
    deductible: Optional[str] = None
    description: Optional[str] = None

class PaginatedPolicies(BaseModel):
    items: List[PolicySummary]
    total: int
    page: int
    page_size: int
