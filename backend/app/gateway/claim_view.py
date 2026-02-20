import uuid
from typing import Any
from datetime import datetime
from app.contracts.claims import ClaimView, ClaimFlag
from app.contracts.enums import ClaimStatus
from app.db.queries import get_claim_by_id, get_claim_events
from app.audit.writer import get_simulated_events
from app.core.settings import settings

def assemble_claim_view(claim_id: uuid.UUID | str) -> ClaimView | None:
    claim_data = get_claim_by_id(claim_id)
    if not claim_data:
        return None
        
    # Build core fields
    view_data = {
        "id": claim_data["id"],
        "claim_number": claim_data["claim_number"],
        "holder_name": "Sarah Jenkins" if settings.simulation_mode else claim_data.get("holder_name", "Unknown Holder"),
        "type": claim_data.get("claim_type", "Medical"),
        "amount": f"${claim_data.get('amount', '1,250.00')}",
        "risk_score": claim_data.get("fraud_score", 0.1) * 100,
        "status": claim_data["status"],
        "final_decision": claim_data["final_decision"],
        "date": datetime.now().strftime("%b %d, %Y"),
        "flags": []
    }
    
    # Flags logic based on risk score
    if view_data["risk_score"] > 80:
        view_data["flags"].append(ClaimFlag(
            icon="location_off", color="text-primary", title="Location Anomaly", 
            description="Claimant location contradicts policy region.", critical=True
        ))
    elif view_data["risk_score"] > 40:
        view_data["flags"].append(ClaimFlag(
            icon="warning", color="text-amber-500", title="Unusual Amount", 
            description="Claim amount is above average for this policy type."
        ))
        
    # Additional view data
    view = ClaimView(**view_data)
    
    # Mock related data for now
    view.policy_info = {
        "policy_id": claim_data["policy_id"],
        "type": "Comprehensive Auto",
        "active": True
    }
    view.financial_details = {"deductible": "$500", "coverage_limit": "$50,000"}
    view.documents = [
        {"id": "doc-1", "type": "invoice", "name": "repair_bill.pdf", "status": "verified"},
        {"id": "doc-2", "type": "photos", "name": "damage1.jpg", "status": "pending"}
    ]
    
    # Layer Results and Audit Events from simulation
    if settings.simulation_mode:
        events = get_simulated_events(claim_id)
        view.audit_events = [e.model_dump() for e in events]
        # In a real impl, we'd extract layer results from specific pipeline audit payloads
        view.layer_results = [] 
        
    return view
