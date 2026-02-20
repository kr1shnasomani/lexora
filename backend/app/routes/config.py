from fastapi import APIRouter
from app.contracts.config import ConfigResponse, ConfigEntry, FeatureFlag, SystemHealth

router = APIRouter(prefix="/api/config", tags=["Config"])

@router.get("", response_model=ConfigResponse)
async def get_config():
    # Mock data to match frontend config page
    return ConfigResponse(
        thresholds=[
            ConfigEntry(key="fraud.high_threshold", value="0.85", description="Critical limit for immediate rejection", modified="2 mins ago", version="v2.1", highlight=True),
            ConfigEntry(key="fraud.auto_reject_score", value="0.92", description="Score triggering auto-reject workflow", modified="14 hrs ago", version="v2.0")
        ],
        flags=[
            FeatureFlag(key="graph", label="Tier 3 Graph Analysis", description="Enables deep-link parsing", enabled=True, badge_icon="bolt", badge_color="text-amber-400"),
            FeatureFlag(key="auto", label="Auto-Approval Engine", description="Automatic adjudications", enabled=False)
        ],
        health=SystemHealth(latency="24ms", error_rate="0.01%", uptime="99.99%", active_nodes="12/12")
    )

@router.put("/{key}", response_model=ConfigEntry)
async def update_config(key: str, entry: ConfigEntry):
    # Mock successful update
    entry.highlight = True
    return entry
