from pydantic import BaseModel
from typing import List

class KPI(BaseModel):
    label: str
    value: str
    delta: str
    icon: str

class HeatmapCell(BaseModel):
    hour: int
    day: int
    value: float

class PriorityQueueItem(BaseModel):
    id: str
    holder: str
    amount: str
    risk_score: int
    status: str

class ThreatAlert(BaseModel):
    id: str
    icon: str
    title: str
    detected: str
    level: str
    score: int
    description: str

class AnalyticsKPI(BaseModel):
    label: str
    value: str
    change: str
    sub: str

class DriftMetric(BaseModel):
    label: str
    value: str
    bar_width: str

class DashboardSummary(BaseModel):
    kpis: List[KPI] = []
    heatmap: List[HeatmapCell] = []
    priority_queue: List[PriorityQueueItem] = []
    threat_alerts: List[ThreatAlert] = []
    analytics_kpis: List[AnalyticsKPI] = []
    drift_metrics: List[DriftMetric] = []
