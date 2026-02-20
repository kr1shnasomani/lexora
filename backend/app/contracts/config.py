from pydantic import BaseModel
from typing import List

class ConfigEntry(BaseModel):
    key: str
    value: str
    description: str
    modified: str
    version: str
    highlight: bool = False

class FeatureFlag(BaseModel):
    key: str
    label: str
    description: str
    enabled: bool
    badge: str | None = None
    badgeIcon: str | None = None
    badgeColor: str | None = None

class SystemHealth(BaseModel):
    latency: str
    error_rate: str
    uptime: str
    active_nodes: str

class ConfigResponse(BaseModel):
    thresholds: List[ConfigEntry]
    flags: List[FeatureFlag]
    health: SystemHealth
