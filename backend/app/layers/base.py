import asyncio
from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID
from app.contracts.pipeline import LayerResult
from app.contracts.audit import AuditEventCreate
from app.contracts.enums import EventType
from app.audit.writer import write_event

class LayerBase(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the layer"""
        pass
        
    @property
    @abstractmethod
    def version(self) -> str:
        """Version of the layer/model"""
        pass

    async def execute(self, claim_id: UUID | str, context: dict[str, Any]) -> LayerResult:
        """Executes the layer logic, wrapped with audit logging."""
        await write_event(AuditEventCreate(
            claim_id=claim_id,
            event_type=EventType.layer_started,
            actor=f"system:{self.name}",
            payload={"version": self.version}
        ))
        
        result = await self._run(claim_id, context)
        
        await write_event(AuditEventCreate(
            claim_id=claim_id,
            event_type=EventType.layer_completed,
            actor=f"system:{self.name}",
            payload=result.model_dump()
        ))
        
        return result
        
    @abstractmethod
    async def _run(self, claim_id: UUID | str, context: dict[str, Any]) -> LayerResult:
        """Inner execution logic to be implemented by each layer."""
        pass
