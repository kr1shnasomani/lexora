import time
from uuid import UUID
from app.contracts.pipeline import PipelineResult
from app.contracts.enums import FinalDecision, ClaimStatus
from app.layers.perception import PerceptionLayer
from app.layers.policy import PolicyLayer
from app.layers.fraud import FraudLayer
from app.layers.decision import DecisionLayer
from app.layers.audit_learning import AuditLearningLayer
from app.db.queries import update_claim_status

async def run_pipeline(claim_id: UUID | str, simulate: bool = False) -> PipelineResult:
    """
    Executes the 5-layer pipeline sequentially.
    If simulate is true, we force execution of stubs.
    """
    start = time.perf_counter()
    
    # Instantiate layers
    layers = [
        PerceptionLayer(),
        PolicyLayer(),
        FraudLayer(),
        DecisionLayer(),
        AuditLearningLayer()
    ]
    
    context = {"layer_results": []}
    
    for layer in layers:
        result = await layer.execute(claim_id, context)
        context["layer_results"].append(result)
        
    # Analyze final decision based on DecisionLayer output
    decision_result = next((r for r in context["layer_results"] if r.layer_name == "decision"), None)
    
    final_decision = None
    risk_level = "Low"
    confidence = 98
    status = ClaimStatus.approved
    
    if decision_result:
        confidence = decision_result.details.get("confidence", 98)
        if decision_result.status == "HALT":
            status = ClaimStatus.under_review
            risk_level = "High"
            final_decision = FinalDecision.pending_review
        else:
            status = ClaimStatus.approved
            risk_level = "Low"
            final_decision = FinalDecision.auto_approved

    # Update claim status in DB/Mock
    update_claim_status(claim_id, status, final_decision)
    
    execution_ms = int((time.perf_counter() - start) * 1000)
    
    return PipelineResult(
        claim_id=claim_id,
        decision=final_decision,
        confidence=confidence,
        risk_level=risk_level,
        execution_ms=execution_ms,
        layer_results=context["layer_results"]
    )
