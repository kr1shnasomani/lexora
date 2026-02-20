import asyncio
import time
from uuid import UUID
from typing import Any
from app.layers.base import LayerBase
from app.contracts.pipeline import LayerResult

class DecisionLayer(LayerBase):
    @property
    def name(self) -> str:
        return "decision"
        
    @property
    def version(self) -> str:
        return "Economic Opt. v1.1"

    async def _run(self, claim_id: UUID | str, context: dict[str, Any]) -> LayerResult:
        start = time.perf_counter()
        await asyncio.sleep(0.02)
        
        prior_results: list[LayerResult] = context.get("layer_results", [])
        
        # If any prior layer warned, we halt for manual review
        halted = any(r.status == "WARN" for r in prior_results)
        status = "HALT" if halted else "PASS"
        
        latency = int((time.perf_counter() - start) * 1000)
        
        return LayerResult(
            layer_name=self.name,
            status=status,
            latency_ms=latency,
            details={"confidence": 92 if not halted else 45, "halted": halted},
            model_version=self.version
        )
