from fastapi import APIRouter, Query
from typing import Optional
from app.contracts.network import NetworkGraph, NetworkNode, NetworkEdge

router = APIRouter(prefix="/api/network", tags=["Network Graph"])

# Default simulated graph (claim-agnostic overview)
DEFAULT_NODES = [
    NetworkNode(id="N1", label="Sarah M.",     x=50, y=25, type="target",    risk=94),
    NetworkNode(id="N2", label="James P.",     x=20, y=55, type="connected", risk=72),
    NetworkNode(id="N3", label="Nina P.",      x=80, y=60, type="connected", risk=88),
    NetworkNode(id="N4", label="Body Shop A",  x=50, y=75, type="vendor",    risk=76),
    NetworkNode(id="N5", label="Dr. Martinez", x=30, y=20, type="provider",  risk=55),
    NetworkNode(id="N6", label="Emma J.",      x=70, y=20, type="connected", risk=88),
]

DEFAULT_EDGES = [
    NetworkEdge(from_node="N1", to_node="N2", label="Shared Address"),
    NetworkEdge(from_node="N1", to_node="N3", label="Same Incident"),
    NetworkEdge(from_node="N1", to_node="N4", label="Repair Vendor"),
    NetworkEdge(from_node="N2", to_node="N4", label="Repair Vendor"),
    NetworkEdge(from_node="N1", to_node="N5", label="Treating Physician"),
    NetworkEdge(from_node="N6", to_node="N1", label="Prior Claim"),
]


@router.get("/graph", response_model=NetworkGraph)
async def get_network_graph(claim_id: Optional[str] = Query(None)):
    # In production: query the DB for claim-specific network graph
    # For now: return the same simulation regardless of claim_id
    return NetworkGraph(
        claim_id=claim_id,
        nodes=DEFAULT_NODES,
        edges=DEFAULT_EDGES,
    )
