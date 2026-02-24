from fastapi import APIRouter
from database import get_supabase
import json
from datetime import datetime
import traceback

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

def time_ago(dt_str):
    if not dt_str:
        return "Unknown"
    # Basic time ago logic
    try:
        # Assuming UTC
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        now = datetime.utcnow()
        now = now.replace(tzinfo=dt.tzinfo)
        diff = now - dt
        secs = int(diff.total_seconds())
        if secs < 60:
            return "Just now"
        if secs < 3600:
            return f"{secs // 60}m ago"
        if secs < 86400:
            return f"{secs // 3600}h ago"
        return f"{secs // 86400}d ago"
    except Exception:
        return dt_str.split("T")[0]

def determine_threat_level(stage, event_type, score):
    if score >= 80 or event_type == "failed":
        return "Critical"
    if score >= 60 or stage in ["fraud_investigation"]:
        return "High"
    if score >= 30 or stage in ["manual_review"] or event_type == "warned":
        return "Medium"
    return "Low"

def determine_icon(stage, event_type):
    if event_type == "failed":
        return "error"
    if stage == "audit":
        return "policy"
    if stage == "fraud_investigation":
        return "policy"
    if "graph" in stage.lower() or "tier3" in stage.lower():
        return "share"
    if "vector" in stage.lower() or "tier2" in stage.lower():
        return "difference"
    if "rule" in stage.lower() or "tier1" in stage.lower():
        return "gavel"
    return "warning"

def format_currency(amount):
    try:
        if amount is None:
            return "—"
        return f"${float(amount):,.2f}"
    except:
        return str(amount)

@router.get("/summary")
async def get_dashboard_summary():
    db = get_supabase()
    
    # 1. Fetch KPI basic numbers
    claims_res = db.table("claims").select("id, status, fraud_score, claimed_amount, final_decision").execute()
    claims = claims_res.data or []
    
    total_claims = len(claims)
    auto_resolved = sum(1 for c in claims if c.get("final_decision") in ("auto_approve", "auto_reject"))
    flagged = sum(1 for c in claims if c.get("status") in ("deciding", "under_review", "fraud_investigation") or c.get("final_decision") == "manual_review")
    
    exposure = sum(float(c.get("claimed_amount") or 0) for c in claims if c.get("status") in ("deciding", "under_review", "fraud_investigation") or c.get("final_decision") == "manual_review")
    
    auto_res_rate = f"{(auto_resolved / total_claims * 100):.1f}%" if total_claims > 0 else "0%"
    
    kpis = [
        {"label": "Risk Exposure", "value": f"${exposure:,.0f}", "delta": "+12.4%"},
        {"label": "Auto-Resolution", "value": auto_res_rate, "delta": "+2.1%"},
        {"label": "Fraud Flags", "value": str(flagged), "delta": "+3"},
        {"label": "Processing Time", "value": "1.2s", "delta": "-0.4s"},
    ]
    
    # 2. Priority Review Queue
    # We want claims requiring manual review, or very high risk, or very high amount
    pq_res = (
        db.table("claims")
        .select("id, claim_number, claimant_name, claimed_amount, fraud_score, status, final_decision")
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )
    
    priority_queue = []
    for c in (pq_res.data or []):
        status = c.get("status") or "Unknown"
        # Skip finalized claims
        if status in ("approved", "auto_approve", "auto_reject", "denied", "finalized"):
            continue

        risk_pct = round((c.get("fraud_score") or 0) * 100)
        amount_val = float(c.get("claimed_amount") or 0)
        
        reason = None
        if status in ("deciding", "under_review", "manual_review"):
            reason = "Pending Review"
        elif status == "fraud_investigation":
            reason = "Escalated"
        elif risk_pct >= 80:
            reason = "High Risk"
        elif amount_val >= 10000:
            reason = "High Amount"
            
        if reason:
            priority_queue.append({
                "id": c.get("claim_number") or c.get("id") or "—",
                "holder": c.get("claimant_name") or "Unknown",
                "amount": format_currency(c.get("claimed_amount")),
                "reason": reason,
                "risk_score": risk_pct,
                "status": status.replace("_", " ")
            })
            if len(priority_queue) >= 10:
                break
        
    # 3. Live Signals (Audit Events)
    audit_res = (
        db.table("audit_events")
        .select("*")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    
    threat_alerts = []
    for e in (audit_res.data or []):
        stage = e.get("stage") or "system"
        evt = e.get("event_type") or "info"
        
        # Maximize information by dumping payload keys
        payload_desc = ""
        payload_raw = e.get("payload")
        
        # Filter empty payloads completely
        if not payload_raw or payload_raw == "{}" or payload_raw == "":
            continue
            
        score = 0  # Initialize score
        level = None
        try:
            p = json.loads(payload_raw) if isinstance(payload_raw, str) else payload_raw
            if not p or not isinstance(p, dict):
                continue
                
            # Format something readable
            parts = []
            if "fraud_score" in p:
                score = round(p['fraud_score'] * 100)
                parts.append(f"Risk: {score:.1f}%")
            elif "score" in p: # Fallback to 'score' if 'fraud_score' not present
                score = round(p['score'] * 100)
                parts.append(f"Score: {score:.1f}%")
                
            # Explicit Threat Level Assignment Mapping
            if p.get("status") == "REJECT" or p.get("status") == "DENY" or p.get("decision") == "auto_reject":
                level = "Critical"
            elif p.get("status") == "REVIEW" or p.get("decision") == "manual_review":
                level = "High"
            elif p.get("decision") == "auto_approve" or p.get("status") == "APPROVE":
                level = "Low"
                
            for k, v in list(p.items())[:6]:  # Show a few top-level keys
                if k not in ("score", "fraud_score", "diagnostics", "timing_ms", "fallbacks"):
                    short_v = str(v)
                    if len(short_v) > 60:
                        short_v = short_v[:57] + "..."
                    parts.append(f"{k}: {short_v}")
            payload_desc = " | ".join(parts)
        except:
            payload_desc = str(payload_raw)
            
        if not payload_desc or payload_desc.strip() == "":
            continue
            
        if len(payload_desc) > 200:
            payload_desc = payload_desc[:197] + "..."
            
        if not level:
            level = determine_threat_level(stage, evt, score)
            
        threat_alerts.append({
            "id": e.get("id"),
            "level": level, # Assign parsed level or determined level
            "score": score, # Include the extracted score
            "icon": determine_icon(stage, evt), # Get icon based on stage/event
            "title": f"[{str(e.get('claim_id'))[:8]}] {stage.upper().replace('_', ' ')}", # Simplified title
            "description": payload_desc,
            "detected": time_ago(e.get("created_at"))
        })
        
    # 4. Fetch Tier 3 Graph Excerpt from recent claims
    graph_excerpt = {"nodes": [], "edges": []}
    
    # Get a recent claim with a tier3 analysis
    # We look directly in the claims table for parsed fraud_analysis
    recent_claims = (
        db.table("claims")
        .select("id, fraud_analysis")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    
    for c in (recent_claims.data or []):
        fa = c.get("fraud_analysis")
        if fa and isinstance(fa, dict) and "tier3" in fa:
            t3 = fa["tier3"]
            if t3 and isinstance(t3, dict) and "graph_excerpt" in t3:
                excerpt = t3["graph_excerpt"]
                if excerpt and isinstance(excerpt, dict):
                    if excerpt.get("nodes") and excerpt.get("edges"):
                        graph_excerpt = excerpt
                        break
    
    return {
        "kpis": kpis,
        "priority_queue": priority_queue,
        "threat_alerts": threat_alerts,
        "graph_excerpt": graph_excerpt
    }
