from fastapi import APIRouter
from app.contracts.analytics import (
    AnalyticsSummary, AnalyticsKPICard, DriftMetric,
    HeatmapRow, HeatmapCell, TrajectoryPoint,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary():
    return AnalyticsSummary(
        kpi_cards=[
            AnalyticsKPICard(
                label="Total Prevented Loss",
                value="$12.4M",
                change="+12%",
                change_icon="trending_up",
                change_color="text-emerald-500",
                sub="Vs. $11.1M expected",
                icon="monetization_on",
            ),
            AnalyticsKPICard(
                label="Current Model Accuracy",
                value="94.2%",
                change="+0.8%",
                change_icon="arrow_upward",
                change_color="text-emerald-500",
                sub="Top percentile performance",
                icon="model_training",
            ),
            AnalyticsKPICard(
                label="Active Fraud Alerts",
                value="23",
                change="-5%",
                change_icon="arrow_downward",
                change_color="text-emerald-500",
                sub="Requires immediate review",
                icon="notification_important",
            ),
        ],
        drift_metrics=[
            DriftMetric(label="Input Drift (PSI)",   value="0.04", color="text-emerald-500", bar_color="bg-emerald-500", bar_pct=15,  sub="Distribution remains stable within expected bounds."),
            DriftMetric(label="Concept Drift (KL)",  value="0.12", color="text-amber-500",   bar_color="bg-amber-500",   bar_pct=45,  sub="Minor shifts detected in Property claims data."),
            DriftMetric(label="Output Stability",    value="0.21", color="text-primary",     bar_color="bg-primary",     bar_pct=75,  sub="Warning: Casualty model predictions deviating.", warn=True),
        ],
        heatmap_rows=[
            HeatmapRow(archetype="Medical",   cells=[
                HeatmapCell(value="98%", intensity=0),
                HeatmapCell(value="96%", intensity=0),
                HeatmapCell(value="82%", intensity=1, tooltip="Review discrepancy"),
                HeatmapCell(value="91%", intensity=0),
                HeatmapCell(value="99%", intensity=0),
            ]),
            HeatmapRow(archetype="Property",  cells=[
                HeatmapCell(value="97%", intensity=0),
                HeatmapCell(value="74%", intensity=2),
                HeatmapCell(value="52%", intensity=2, tooltip="Critical Drift"),
                HeatmapCell(value="78%", intensity=2),
                HeatmapCell(value="88%", intensity=1),
            ]),
            HeatmapRow(archetype="Casualty",  cells=[
                HeatmapCell(value="95%", intensity=0),
                HeatmapCell(value="94%", intensity=0),
                HeatmapCell(value="89%", intensity=0),
                HeatmapCell(value="81%", intensity=1),
                HeatmapCell(value="68%", intensity=2),
            ]),
        ],
        trajectory=[
            TrajectoryPoint(week="Week 1", expected=9.2,  prevented=8.8),
            TrajectoryPoint(week="Week 2", expected=10.1, prevented=10.5),
            TrajectoryPoint(week="Week 3", expected=11.3, prevented=11.8),
            TrajectoryPoint(week="Week 4", expected=11.8, prevented=12.4),
        ],
        retraining_alert="Casualty v4.1 showing signs of degradation.",
    )
