from pydantic import BaseModel, UUID4
from typing import List, Any
from app.contracts.enums import FinalDecision

class LayerResult(BaseModel):
    layer_name: str
    status: str
    latency_ms: int
    details: dict[str, Any] = {}
    model_version: str | None = None

class PipelineResult(BaseModel):
    claim_id: UUID4
    decision: FinalDecision | None
    confidence: int | None
    risk_level: str | None
    execution_ms: int
    layer_results: List[LayerResult]
