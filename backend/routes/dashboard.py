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

def determine_threat_level(stage, event_type):
    if event_type == "failed":
        return "Critical"
    if event_type == "warned" or stage in ["fraud_investigation", "manual_review"]:
        return "Warning"
    if stage == "audit":
        return "System"
    return "Low"

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
    claims_res = db.table("claims").select("id, status, fraud_score, claimed_amount").execute()
    claims = claims_res.data or []
    
    total_claims = len(claims)
    auto_resolved = sum(1 for c in claims if c.get("status") in ("approved", "auto_approve", "auto_reject", "denied"))
    flagged = sum(1 for c in claims if c.get("status") in ("deciding", "under_review", "fraud_investigation"))
    
    exposure = sum(float(c.get("claimed_amount") or 0) for c in claims if c.get("status") in ("deciding", "under_review", "fraud_investigation"))
    
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
        if payload_raw:
            try:
                p = json.loads(payload_raw) if isinstance(payload_raw, str) else payload_raw
                if p and isinstance(p, dict):
                    # Format something readable
                    parts = []
                    if "fraud_score" in p:
                        parts.append(f"Risk: {p['fraud_score']*100:.1f}%")
                    if "recommended_action" in p:
                        parts.append(f"Action: {p['recommended_action'].upper()}")
                    if "status" in p:
                        parts.append(f"Status: {p['status']}")
                    if "rules_failed" in p and p["rules_failed"]:
                        parts.append(f"Failed: {', '.join(p['rules_failed'])}")
                    
                    if parts:
                        payload_desc = " | ".join(parts)
                    else:
                        payload_desc = json.dumps(p)
            except:
                payload_desc = str(payload_raw)
                
        if not payload_desc:
            payload_desc = f"Processed {stage} layer."
            
        # Ensure it doesn't overflow incredibly
        if len(payload_desc) > 150:
            payload_desc = payload_desc[:147] + "..."
            
        threat_alerts.append({
            "id": e.get("id"),
            "level": determine_threat_level(stage, evt),
            "title": f"[{e.get('claim_id')[:8]}] {stage.upper().replace('_', ' ')}: {evt.upper()}",
            "description": payload_desc,
            "detected": time_ago(e.get("created_at"))
        })
        
    return {
        "kpis": kpis,
        "priority_queue": priority_queue,
        "threat_alerts": threat_alerts
    }
