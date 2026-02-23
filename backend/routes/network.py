from fastapi import APIRouter
import random

router = APIRouter(prefix="/network", tags=["Network Graph"])

@router.get("/graph")
async def get_network_graph():
    """
    Returns a connected network graph with pre-computed X/Y layout coordinates 
    for the frontend visualizer.
    """
    return {
        "nodes": [
            {"id": "c1", "label": "Ravi Kumar (CLM-011)", "type": "target", "x": 30, "y": 30, "risk": 95},
            {"id": "c2", "label": "Asha Reddy (CLM-022)", "type": "target", "x": 70, "y": 70, "risk": 88},
            {"id": "c3", "label": "Meera Nair (CLM-033)", "type": "target", "x": 70, "y": 30, "risk": 92},
            {"id": "e1", "label": "Phone: +91-98400-11223", "type": "connected", "x": 50, "y": 50, "risk": 100},
            {"id": "e2", "label": "Provider: SR Property", "type": "provider", "x": 30, "y": 70, "risk": 75},
            {"id": "e3", "label": "IP: 192.168.1.45", "type": "vendor", "x": 90, "y": 50, "risk": 60}
        ],
        "edges": [
            {"from_node": "c1", "to_node": "e1", "label": "Shared Phone"},
            {"from_node": "c2", "to_node": "e1", "label": "Shared Phone"},
            {"from_node": "c3", "to_node": "e1", "label": "Shared Phone"},
            {"from_node": "c1", "to_node": "e2", "label": "Used Provider"},
            {"from_node": "c2", "to_node": "e2", "label": "Used Provider"},
            {"from_node": "c2", "to_node": "e3", "label": "Shared IP"},
            {"from_node": "c3", "to_node": "e3", "label": "Shared IP"},
        ]
    }
