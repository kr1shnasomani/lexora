from pydantic import BaseModel
from typing import List, Optional

class AnalyticsKPICard(BaseModel):
    label: str
    value: str
    change: str
    change_icon: str      # material symbol name
    change_color: str     # e.g. "text-emerald-500"
    sub: str
    icon: str             # material symbol name

class TrajectoryPoint(BaseModel):
    week: str
    expected: float
    prevented: float

class DriftMetric(BaseModel):
    label: str
    value: str
    color: str            # e.g. "text-emerald-500"
    bar_color: str        # e.g. "bg-emerald-500"
    bar_pct: int          # 0-100
    sub: str
    warn: bool = False

class HeatmapCell(BaseModel):
    value: str
    intensity: int        # 0=good, 1=warning, 2=critical
    tooltip: Optional[str] = None

class HeatmapRow(BaseModel):
    archetype: str
    cells: List[HeatmapCell]

class AnalyticsSummary(BaseModel):
    kpi_cards: List[AnalyticsKPICard]
    drift_metrics: List[DriftMetric]
    heatmap_rows: List[HeatmapRow]
    trajectory: List[TrajectoryPoint]
    retraining_alert: Optional[str] = None
