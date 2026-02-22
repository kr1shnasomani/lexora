"""Lexora Backend — Customer Portal APIs"""
from fastapi import APIRouter, HTTPException, Query
from database import get_supabase

router = APIRouter(prefix="/customer", tags=["Customer"])

@router.get("/policies")
async def get_customer_policies(email: str = Query(...)):
    db = get_supabase()
    # Fetch policies where holder_email matches
    result = db.table("policies").select("*").eq("holder_email", email).execute()
    return {"policies": result.data or []}

@router.get("/claims")
async def get_customer_claims(email: str = Query(...)):
    db = get_supabase()
    
    # First get matching policies
    policies = db.table("policies").select("id, policy_number, policy_type").eq("holder_email", email).execute()
    
    if not policies.data:
        return {"claims": []}
        
    policy_ids = [p["id"] for p in policies.data]
    
    # Now get claims for those policies
    claims = db.table("claims").select("*").in_("policy_id", policy_ids).order("created_at", desc=True).execute()
    
    # Enhance with policy details for UI mapping
    policy_map = {p["id"]: p for p in policies.data}
    enhanced_claims = []
    
    for c in (claims.data or []):
        c["policy"] = policy_map.get(c["policy_id"])
        enhanced_claims.append(c)
        
    return {"claims": enhanced_claims}

@router.get("/dashboard-stats")
async def get_dashboard_stats(email: str = Query(...)):
    db = get_supabase()
    
    # Policies
    policies = db.table("policies").select("id, annual_limit, policy_number").eq("holder_email", email).execute()
    active_policies_count = len(policies.data or [])
    total_coverage = sum(float(p.get("annual_limit") or 0) for p in (policies.data or []))
    
    # Claims
    if not policies.data:
        return {
            "active_policies": active_policies_count,
            "total_coverage": total_coverage,
            "claims_in_progress": 0,
            "recent_claims": []
        }
        
    policy_ids = [p["id"] for p in policies.data]
    claims = db.table("claims").select("id, claim_number, status, created_at, policy_id").in_("policy_id", policy_ids).order("created_at", desc=True).limit(5).execute()
    
    all_claims_count_query = db.table("claims").select("id", count="exact").in_("policy_id", policy_ids).execute()
    
    in_progress = 0
    if claims.data:
        for c in claims.data:
            if c["status"] not in ("finalized", "error"):
                in_progress += 1
                
    recent = []
    policy_map = {p["id"]: p for p in policies.data}
    for c in (claims.data or []):
        c["policy"] = policy_map.get(c["policy_id"])
        recent.append(c)
                
    return {
        "active_policies": active_policies_count,
        "total_coverage": total_coverage,
        "claims_in_progress": in_progress,
        "recent_claims": recent
    }
