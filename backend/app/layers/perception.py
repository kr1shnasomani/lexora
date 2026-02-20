import asyncio
import time
from uuid import UUID
from typing import Any
from app.layers.base import LayerBase
from app.contracts.pipeline import LayerResult

class PerceptionLayer(LayerBase):
    @property
    def name(self) -> str:
        return "perception"
        
    @property
    def version(self) -> str:
        return "1.0.0"

    async def _run(self, claim_id: UUID | str, context: dict[str, Any]) -> LayerResult:
        start = time.perf_counter()
        await asyncio.sleep(0.4) # Simulate latency
        
        details = {
            "model": "GPT-4o Vision",
            "tokens": 482,
            "analysis": "Extracted invoice data matches user input. No tampering visually detected in uploaded documents."
        }
        
        latency = int((time.perf_counter() - start) * 1000)
        
        return LayerResult(
            layer_name=self.name,
            status="PASS",
            latency_ms=latency,
            details=details,
            model_version=self.version
        )
