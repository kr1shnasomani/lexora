import uuid
from fastapi import APIRouter, Query
from typing import Optional
from app.contracts.user import UserProfile, PolicySummary, PolicyDetail, PaginatedPolicies

router = APIRouter(prefix="/api", tags=["User & Policies"])

# ── Simulated user (replace with Supabase auth lookup) ─────────────────────
SIMULATED_USER = UserProfile(
    id="usr-001",
    name="Kumud Sharma",
    email="kumud.sharma@example.com",
    avatar_url=None,
    member_since="2021",
    policy_count=2,
    active_claim_count=1,
)

# ── Simulated policies ──────────────────────────────────────────────────────
SIMULATED_POLICIES = [
    PolicySummary(
        id="pol-h-001",
        policy_number="H-992-883",
        name="Health Shield Premier",
        type="health",
        status="active",
        icon="cardiology",
        coverage_amount="$500,000",
        premium="$420",
        premium_suffix="/mo",
        renewal_date="Oct 24, 2025",
        since="2021",
        extra_stats={"deductible": "$250", "network": "PPO Gold"},
    ),
    PolicySummary(
        id="pol-a-002",
        policy_number="A-110-442",
        name="Auto Drive Secure",
        type="auto",
        status="active",
        icon="directions_car",
        coverage_amount="$50,000",
        premium="$182",
        premium_suffix="/mo",
        renewal_date="Nov 01, 2025",
        since="2023",
        extra_stats={"vehicle": "Tesla Model 3", "deductible": "$500"},
    ),
    PolicySummary(
        id="pol-t-003",
        policy_number="T-332-901",
        name="Global Travel Plus",
        type="travel",
        status="expired",
        icon="flight",
        renewal_date="Sep 15, 2024",
        since="2022",
    ),
    PolicySummary(
        id="pol-p-004",
        policy_number="P-441-229",
        name="Pet Wellness Basic",
        type="pet",
        status="expired",
        icon="pets",
        renewal_date="Aug 01, 2024",
        since="2022",
    ),
]


@router.get("/user/profile", response_model=UserProfile)
async def get_user_profile():
    return SIMULATED_USER


@router.get("/policies", response_model=PaginatedPolicies)
async def get_policies(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    items = SIMULATED_POLICIES
    if status:
        statuses = status.split(",")
        items = [p for p in items if p.status in statuses]

    start = (page - 1) * page_size
    return PaginatedPolicies(
        items=items[start : start + page_size],
        total=len(items),
        page=page,
        page_size=page_size,
    )


@router.get("/policies/{policy_id}", response_model=PolicyDetail)
async def get_policy_detail(policy_id: str):
    policy = next((p for p in SIMULATED_POLICIES if p.id == policy_id), None)
    if not policy:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Policy not found")
    return PolicyDetail(
        **policy.model_dump(),
        documents=["Policy Certificate", "Terms & Conditions", "Schedule of Benefits"],
        beneficiaries=["Kumud Sharma (Primary)", "Priya Sharma (Secondary)"],
        deductible=policy.extra_stats.get("deductible") if policy.extra_stats else None,
        description=f"Comprehensive {policy.type} coverage with 24/7 support and fast claims processing.",
    )
