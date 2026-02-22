from fastapi import APIRouter
from app.contracts.config import ConfigResponse, ConfigEntry, FeatureFlag, SystemHealth

router = APIRouter(prefix="/api/config", tags=["Config"])

@router.get("", response_model=ConfigResponse)
async def get_config():
    return ConfigResponse(
        thresholds=[
            ConfigEntry(key="fraud.high_threshold",           value="0.85", description="Critical limit for immediate rejection",         modified="2 mins ago",  version="v2.1", highlight=True),
            ConfigEntry(key="fraud.auto_reject_score",        value="0.92", description="Score triggering auto-reject workflow",          modified="14 hrs ago",  version="v2.0"),
            ConfigEntry(key="claims.review_queue_limit",      value="250",  description="Max claims held in the adjudication queue",      modified="3 days ago",  version="v1.4"),
            ConfigEntry(key="sanctions.fuzzy_match_tolerance",value="0.80", description="Minimum similarity for sanctions list matches",  modified="1 week ago",  version="v1.1"),
        ],
        flags=[
            FeatureFlag(key="graph",       label="Tier 3 Graph Analysis",    description="Enables deep-link network parsing for organized fraud detection",         enabled=True,  badge_icon="bolt",       badge_color="text-amber-400"),
            FeatureFlag(key="auto",        label="Auto-Approval Engine",      description="Automatically adjudicates low-risk claims without human review",         enabled=False),
            FeatureFlag(key="rag",         label="RAG Evidence Retrieval",    description="Augments fraud analysis with retrieved case precedents via vector store", enabled=True,  badge_icon="electric_bolt",badge_color="text-indigo-400"),
            FeatureFlag(key="drift_alerts",label="Model Drift Alerts",        description="Sends alerts when fraud model accuracy deviates beyond threshold",        enabled=True),
        ],
        health=SystemHealth(latency="24ms", error_rate="0.01%", uptime="99.99%", active_nodes="12/12")
    )


@router.put("/{key}", response_model=ConfigEntry)
async def update_config(key: str, entry: ConfigEntry):
    # Mock successful update
    entry.highlight = True
    return entry
