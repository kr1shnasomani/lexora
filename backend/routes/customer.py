"""Lexora Backend — Customer Portal APIs"""
from fastapi import APIRouter, HTTPException, Query
from database import get_supabase

router = APIRouter(prefix="/customer", tags=["Customer"])

@router.get("/policies")
async def get_customer_policies(email: str = Query(...), status: str = Query(None)):
    db = get_supabase()
    
    # 1. Fetch policies where holder_email matches
    query = db.table("policies").select("*").eq("holder_email", email)
    if status == "active":
        query = query.eq("is_active", True)
        
    result = query.execute()
    policies = result.data or []
    
    # 2. Fetch specific policy rules based on the user's mapped policy types to enrich UI
    enhanced_policies = []
    
    for p in policies:
        try:
            ptype = p.get("policy_type")
            pversion = p.get("rules_version")
            
            # Fetch the associated rule definition for this exact type and version
            rule_res = db.table("policy_rules").select("rules_definition").eq("policy_type", ptype).eq("version", pversion).execute()
            
            extra_stats = {}
            if rule_res.data and len(rule_res.data) > 0:
                rules_def_str = rule_res.data[0].get("rules_definition")
                if rules_def_str:
                    try:
                        r_json = json.loads(rules_def_str) if isinstance(rules_def_str, str) else rules_def_str
                        # Extract explicit deductible or limits 
                        fins = r_json.get("financials", {})
                        
                        # Grab the first valid category limit
                        annual_limit_dict = fins.get("annual_limit", {})
                        first_limit = next((v for v in annual_limit_dict.values() if v is not None), None)
                        if first_limit is not None:
                            extra_stats["Limit"] = f"₹{first_limit:,.0f}"
                            
                        # Same for deductible
                        deductible_dict = fins.get("deductible", {})
                        first_deduct = next((v for v in deductible_dict.values() if v is not None), None)
                        if first_deduct is not None:
                            extra_stats["Deductible"] = f"₹{first_deduct:,.0f}" if first_deduct > 0 else "None"
                            
                    except Exception as e:
                        print(f"Failed to parse policy rules: {e}")

            # Shape exactly as the UI component wants it
            formatted_policy = {
                "id": p.get("id"),
                "name": f"{ptype.capitalize()} Insurance",
                "policy_number": p.get("policy_number"),
                "type": ptype,
                "status": "active" if p.get("is_active") else "expired",
                "coverage_amount": f"${p.get('annual_limit'):,.0f}" if p.get('annual_limit') else "Unknown",
                "renewal_date": p.get("policy_end_date"),
                "extra_stats": extra_stats
            }
            enhanced_policies.append(formatted_policy)
            
        except Exception as e:
            print(f"Error mapping policy {p.get('id')}: {e}")
            enhanced_policies.append(p)
            
    return {"policies": enhanced_policies}

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
