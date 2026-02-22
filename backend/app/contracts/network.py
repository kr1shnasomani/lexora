from pydantic import BaseModel
from typing import List, Optional

class NetworkNode(BaseModel):
    id: str
    label: str
    x: float              # 0-100 percentage
    y: float              # 0-100 percentage
    type: str             # "target" | "connected" | "vendor" | "provider"
    risk: int             # 0-100

class NetworkEdge(BaseModel):
    from_node: str        # node id
    to_node: str          # node id
    label: str

class NetworkGraph(BaseModel):
    claim_id: Optional[str] = None
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
