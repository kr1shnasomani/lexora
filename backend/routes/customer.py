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

@router.get("/policies/{policy_id}")
async def get_policy_detail(policy_id: str, email: str = Query(...)):
    db = get_supabase()
    
    # 1. Fetch the policy, ensuring it belongs to the user
    policy_res = db.table("policies").select("*").eq("id", policy_id).eq("holder_email", email).execute()
    if not policy_res.data:
        raise HTTPException(status_code=404, detail="Policy not found or access denied")
        
    policy = policy_res.data[0]
    
    # 2. Fetch specific policy rules to populate coverage/extra stats
    extra_stats = {}
    try:
        ptype = policy.get("policy_type")
        pversion = policy.get("rules_version")
        rule_res = db.table("policy_rules").select("rules_definition").eq("policy_type", ptype).eq("version", pversion).execute()
        
        if rule_res.data and len(rule_res.data) > 0:
            import json
            rules_def_str = rule_res.data[0].get("rules_definition")
            if rules_def_str:
                r_json = json.loads(rules_def_str) if isinstance(rules_def_str, str) else rules_def_str
                
                # Financials (Limits, Deductibles, Copays)
                fins = r_json.get("financials", {})
                
                for key, val_dict in fins.items():
                    if not val_dict: continue
                    # Grab the first non-null grouped value (e.g., limit for 'medical' in health)
                    first_val = next((v for v in val_dict.values() if v is not None), None)
                    if first_val is not None:
                        label = key.replace("_", " ").title()
                        if "percent" in key:
                            extra_stats[label] = f"{first_val}%"
                        elif first_val > 0:
                            extra_stats[label] = f"₹{first_val:,.0f}" if isinstance(first_val, (int, float)) else str(first_val)
                        elif "deductible" in key:
                            extra_stats["Deductible"] = "None"
                            
                # Eligibility (Waiting Periods)
                eligibility = r_json.get("eligibility", {})
                waiting_dict = eligibility.get("waiting_period_days", {})
                first_waiting = next((v for v in waiting_dict.values() if v is not None), None)
                if first_waiting is not None:
                     extra_stats["Waiting Period"] = f"{first_waiting} days"
                     
    except Exception as e:
        print(f"Failed to parse policy rules for detailed view: {e}")

    # 3. Fetch Claims related to this policy, filtered by the actual user
    # In Lexora, policies.holder_name maps directly to claims.claimant_name
    holder_name = policy.get("holder_name")
    if holder_name:
        claims_res = db.table("claims").select("id, claim_number, status, created_at, claimed_amount").eq("policy_id", policy_id).ilike("claimant_name", f"%{holder_name}%").order("created_at", desc=True).execute()
    else:
        # Fallback if no holder_name exists, but unlikely based on schema
        claims_res = db.table("claims").select("id, claim_number, status, created_at, claimed_amount").eq("policy_id", policy_id).order("created_at", desc=True).execute()
        
    claims = claims_res.data or []
    
    # Format claims for UI
    formatted_claims = []
    for c in claims:
        formatted_claims.append({
            "id": c["id"],
            "claim_number": c["claim_number"],
            "status": c["status"],
            "date": c["created_at"].split("T")[0] if c.get("created_at") else "Unknown",
            "amount": f"₹{float(c['claimed_amount']):,.0f}" if c.get("claimed_amount") else "Unknown"
        })

    # 4. Fetch Documents related to these claims (if any)
    documents = []
    if claims:
        claim_ids = [c["id"] for c in claims]
        docs_res = db.table("claim_documents").select("*").in_("claim_id", claim_ids).execute()
        
        # Map document to appropriate claim number
        claim_id_to_number = {c["id"]: c["claim_number"] for c in claims}
        
        for doc in (docs_res.data or []):
            claim_num = claim_id_to_number.get(doc.get("claim_id"), "Unknown Claim")
            documents.append({
                "id": doc["id"],
                "name": doc.get("file_name", "Unnamed Document"),
                "claim_number": claim_num,
                "url": f"/api/claims/download/{doc['id']}" # Mock URL, normally points to real storage
            })

    # 5. Bring it all together in the expected format for PolicyDetailPage.jsx
    formatted_policy = {
        "id": policy.get("id"),
        "name": f"{policy.get('policy_type').capitalize()} Insurance" if policy.get('policy_type') else "Insurance Policy",
        "policy_number": policy.get("policy_number"),
        "type": policy.get("policy_type"),
        "status": "active" if policy.get("is_active") else "expired",
        "premium": None, # Mock DB doesn't have premium
        "premium_suffix": "",
        "coverage_amount": f"₹{policy.get('annual_limit'):,.0f}" if policy.get('annual_limit') else None,
        "deductible": extra_stats.get("Deductible") or extra_stats.get("Deductible "),
        "renewal_date": policy.get("policy_end_date"),
        "since": policy.get("policy_start_date"),
        "extra_stats": extra_stats,
        "documents": documents,
        "claims": formatted_claims
    }
    
    return formatted_policy

@router.get("/claims")
async def get_customer_claims(email: str = Query(...)):
    db = get_supabase()
    
    # First get matching policies
    policies = db.table("policies").select("id, policy_number, policy_type, holder_name").eq("holder_email", email).execute()
    
    if not policies.data:
        return {"claims": []}
        
    policy_ids = [p["id"] for p in policies.data]
    holder_name = policies.data[0].get("holder_name") if policies.data else None
    
    # Now get claims for those policies filtered by the user
    query = db.table("claims").select("*").in_("policy_id", policy_ids)
    if holder_name:
        query = query.ilike("claimant_name", f"%{holder_name}%")
        
    claims = query.order("created_at", desc=True).execute()
    
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
