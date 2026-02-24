from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from database import get_supabase
import io
import time
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color

router = APIRouter(prefix="/claims", tags=["PDF Export"])

LEXORA_BLACK = Color(0.051, 0.051, 0.051)
LEXORA_RED = Color(0.898, 0.224, 0.208)
LEXORA_RED_DARK = Color(0.776, 0.157, 0.157)
LEXORA_WHITE = Color(1.0, 1.0, 1.0)
LEXORA_GREY = Color(0.6, 0.6, 0.6)
LEXORA_GREY_LIGHT = Color(0.93, 0.93, 0.93)
COLOR_APPROVED = Color(0.18, 0.69, 0.31)
COLOR_REJECTED = Color(0.898, 0.224, 0.208)
COLOR_PENDING = Color(0.95, 0.61, 0.07)

def safe_fraud_score(score):
    if score is None:
        return "Unknown"
    if score < 0.30:
        return "Low Risk"
    elif score <= 0.70:
        return "Under Review"
    else:
        return "Flagged for Investigation"

def safe_decision_text(decision):
    decision = decision or "pending"
    decision = decision.lower()
    mapping = {
        "auto_approve": "Your claim has been approved. Payment will be processed within 3–5 business days to your registered account.",
        "auto_reject": "Unfortunately, your claim does not meet the coverage criteria outlined in your policy. You may contact our support team to request a manual review or appeal this decision.",
        "manual_review": "Your claim has been flagged for additional review by our team. You will receive a notification within 2–3 business days with a final decision.",
        "fraud_investigation": "Your claim requires additional verification. Our team will contact you directly within 5 business days. Please have your supporting documents ready.",
        "under_review": "Your claim is currently being reviewed. We will notify you once a decision has been reached."
    }
    return mapping.get(decision, "Your claim is being processed. Please check back shortly or contact support for an update.")

def safe_outcome(outcome):
    if not outcome:
        return "PENDING"
    o = str(outcome).upper()
    if "APPROVE" in o:
        return "APPROVED"
    elif "REJECT" in o:
        return "NOT APPROVED"
    else:
        return "UNDER REVIEW"

@router.get("/{claim_id}/export-pdf")
async def export_pdf(claim_id: str, email: str = Query(...)):
    start_time = time.time()
    db = get_supabase()
    
    try:
        # Fetch claim and policy
        res = db.table("claims").select("*, policy:policies(*)").eq("id", claim_id).execute()
        claims = res.data
        if not claims:
            raise HTTPException(status_code=404, detail="Claim not found")
            
        claim = claims[0]
        policy = claim.get("policy", {})
        
        # Verify ownership
        if not policy or policy.get("holder_email") != email:
            raise HTTPException(status_code=403, detail="Forbidden")
            
        final_decision = claim.get("final_decision")
        if not final_decision:
            raise HTTPException(status_code=409, detail="Claim is still being processed. Report available once a decision has been reached.")
            
        import json
        
        # Extract safe fields
        policy_decision = claim.get("policy_decision") or {}
        if isinstance(policy_decision, str):
            try:
                policy_decision = json.loads(policy_decision)
            except Exception:
                policy_decision = {}
                
        financials = policy_decision.get("financials") or {}
        reasons = policy_decision.get("reasons") or []
        
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        width, height = A4
        
        # 40pt Margins
        margin = 40
        current_y = height - margin
        
        # --- HEADER BACKGROUND ---
        header_height = 80
        c.setFillColor(LEXORA_BLACK)
        c.rect(margin, current_y - header_height, width - 2*margin, header_height, fill=1, stroke=0)
        
        # HEADER ACCENT
        c.setFillColor(LEXORA_RED)
        c.rect(margin, current_y - header_height, width - 2*margin, 4, fill=1, stroke=0)
        
        # HEADER TEXT
        c.setFillColor(LEXORA_WHITE)
        c.setFont("Helvetica-Bold", 20)
        c.drawString(margin + 20, current_y - 30, "LEXORA")
        c.setFont("Helvetica", 10)
        c.drawString(margin + 20, current_y - 45, "Insurance Intelligence")
        
        # BADGE
        outcome_str = safe_outcome(policy_decision.get("outcome") or claim.get("status"))
        badge_color = COLOR_APPROVED if outcome_str == "APPROVED" else (COLOR_REJECTED if outcome_str == "NOT APPROVED" else COLOR_PENDING)
        c.setFillColor(badge_color)
        c.roundRect(width - margin - 120, current_y - 40, 100, 20, 4, fill=1, stroke=0)
        c.setFillColor(LEXORA_WHITE)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(width - margin - 70, current_y - 34, outcome_str)
        
        current_y -= (header_height + 30)
        
        # --- TITLE ---
        c.setFillColor(LEXORA_BLACK)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(margin, current_y, "CLAIM DECISION REPORT")
        current_y -= 15
        c.setFont("Helvetica", 10)
        c.setFillColor(LEXORA_GREY)
        processed_at = claim.get("processed_at", "N/A")[:10]
        c.drawString(margin, current_y, f"Generated: {processed_at}  |  Claim ID: {claim.get('claim_number') or claim_id}")
        
        current_y -= 30
        
        # --- CLAIMANT / POLICY BLOCK ---
        c.setStrokeColor(LEXORA_GREY_LIGHT)
        c.line(margin, current_y + 10, width - margin, current_y + 10)
        
        c.setFillColor(LEXORA_BLACK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, current_y, "CLAIMANT")
        c.drawString(width/2, current_y, "POLICY")
        
        current_y -= 15
        c.setFont("Helvetica", 10)
        c.drawString(margin, current_y, str(claim.get("claimant_name") or "N/A"))
        c.drawString(width/2, current_y, str(policy.get("policy_number") or "N/A"))
        
        current_y -= 15
        c.drawString(margin, current_y, str(policy.get("policy_type") or "N/A"))
        c.drawString(width/2, current_y, f"Active · Expires {policy.get('policy_end_date', 'N/A')[:10]}")
        
        current_y -= 15
        annual_limit = float(policy.get('annual_limit') or 0.0)
        c.drawString(margin, current_y, f"Annual Limit: ₹{annual_limit:,.2f}")
        
        current_y -= 30
        c.line(margin, current_y + 10, width - margin, current_y + 10)
        
        # --- INCIDENT SUMMARY ---
        c.setFillColor(LEXORA_RED)
        c.rect(margin, current_y - 10, 4, 20, fill=1, stroke=0)
        c.setFillColor(LEXORA_BLACK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margin + 10, current_y, "INCIDENT SUMMARY")
        
        current_y -= 20
        c.setFont("Helvetica", 10)
        c.drawString(margin, current_y, f"Type: {claim.get('incident_type', 'N/A')}    Date: {str(claim.get('incident_date', 'N/A'))[:10]}")
        
        current_y -= 15
        c.drawString(margin, current_y, f"Provider: {claim.get('provider_name', 'N/A')}    Invoice: {claim.get('invoice_number', 'N/A')}")
        
        current_y -= 15
        desc = claim.get('incident_description') or "N/A"
        # Wrap simple text
        max_chars = 90
        for i in range(0, min(len(desc), max_chars * 3), max_chars):
            c.drawString(margin, current_y, desc[i:i+max_chars])
            current_y -= 15
            
        current_y -= 15
        c.line(margin, current_y + 10, width - margin, current_y + 10)
        
        # --- CLAIM FINANCIALS ---
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margin, current_y, "CLAIM FINANCIALS")
        
        current_y -= 20
        c.setFont("Helvetica", 10)
        claimed = float(claim.get("claimed_amount") or 0.0)
        c.drawString(margin, current_y, "Amount Claimed:")
        c.drawString(margin + 150, current_y, f"₹{claimed:,.2f}")
        
        current_y -= 15
        deductible = float(financials.get("deductible") or 0.0)
        c.drawString(margin, current_y, "Deductible:")
        c.drawString(margin + 150, current_y, f"₹{deductible:,.2f}")
        
        current_y -= 15
        approved = float(claim.get("approved_amount") or 0.0)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(COLOR_APPROVED if approved > 0 else COLOR_REJECTED)
        c.drawString(margin, current_y, "Approved Amount:")
        c.drawString(margin + 150, current_y, f"₹{approved:,.2f}")
        
        current_y -= 30
        c.setFillColor(LEXORA_BLACK)
        c.line(margin, current_y + 10, width - margin, current_y + 10)
        
        # --- DECISION EXPLANATION ---
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margin, current_y, "DECISION EXPLANATION")
        current_y -= 20
        c.setFont("Helvetica", 10)
        
        if not reasons:
            c.drawString(margin, current_y, "✓ Processed within normal policy guidelines.")
            current_y -= 15
        else:
            for r in reasons[:3]:
                msg = r.get("message", "Processed based on policy rules.")
                c.drawString(margin, current_y, f"✓ {msg}")
                current_y -= 15
                
        warnings = claim.get("extraction_warnings") or []
        if isinstance(warnings, str):
            try:
                warnings = json.loads(warnings)
            except Exception:
                warnings = []
        for w in warnings[:2]:
            c.setFillColor(COLOR_PENDING)
            c.drawString(margin, current_y, f"⚠ Note: {w}")
            current_y -= 15
            
        current_y -= 15
        c.setFillColor(LEXORA_BLACK)
        c.line(margin, current_y + 10, width - margin, current_y + 10)
        
        # --- RISK EVALUATION ---
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margin, current_y, "RISK ASSESSMENT")
        risk_label = safe_fraud_score(claim.get("fraud_score"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin + 150, current_y, f"■ {risk_label}")
        
        current_y -= 30
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margin, current_y, "WHAT HAPPENS NEXT")
        current_y -= 20
        c.setFont("Helvetica", 10)
        
        next_steps = safe_decision_text(final_decision)
        for i in range(0, len(next_steps), max_chars):
            c.drawString(margin, current_y, next_steps[i:i+max_chars])
            current_y -= 15
            
        # --- FOOTER ---
        current_y = margin + 30
        c.setFillColor(LEXORA_GREY)
        c.setFont("Helvetica", 8)
        c.drawString(margin, current_y, "Questions? Contact support@lexora.ai")
        current_y -= 12
        c.drawString(margin, current_y, "This document was generated automatically by Lexora.")
        current_y -= 12
        c.drawString(margin, current_y, f"Claim ID: {claim_id} · Policy: {policy.get('policy_number', 'N/A')}")
        
        c.save()
        pdf_buffer.seek(0)
        
        # Log Audit Event
        try:
            db.table("audit_events").insert({
                "claim_id": claim_id,
                "stage": "pdf_export",
                "event_type": "completed",
                "payload": {
                    "generated_by": "customer_request",
                    "customer_email": email,
                    "redaction_applied": True,
                    "page_count": 1
                },
                "duration_ms": int((time.time() - start_time) * 1000)
            }).execute()
        except BaseException as e:
            print(f"Failed to log audit event: {e}")
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Lexora_Claim_{claim_id}.pdf"'
            }
        )

    except HTTPException:
        raise
    except BaseException as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"PDF Gen Error: {e}\n{err_msg}")
        raise HTTPException(status_code=500, detail=f"Internal server error generating PDF: {str(e)}")
