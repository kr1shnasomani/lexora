import asyncio
import time
import random
from uuid import UUID
from typing import Any
from app.layers.base import LayerBase
from app.contracts.pipeline import LayerResult

class FraudLayer(LayerBase):
    @property
    def name(self) -> str:
        return "fraud"
        
    @property
    def version(self) -> str:
        return "Graph Neural Net v1.4"

    async def _run(self, claim_id: UUID | str, context: dict[str, Any]) -> LayerResult:
        start = time.perf_counter()
        await asyncio.sleep(0.15) # Sim latency
        
        # 20% chance to trigger a WARN to exercise the frontend UI
        is_warn = random.random() < 0.2
        status = "WARN" if is_warn else "PASS"
        
        details = {
            "score": round(random.uniform(0.7, 0.95), 2) if is_warn else round(random.uniform(0.01, 0.2), 2)
        }
        
        if is_warn:
            details["flag"] = "Location anomaly matched against high-risk IP pool."
            
        latency = int((time.perf_counter() - start) * 1000)
        
        return LayerResult(
            layer_name=self.name,
            status=status,
            latency_ms=latency,
            details=details,
            model_version=self.version
        )
