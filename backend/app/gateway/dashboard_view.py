from app.contracts.dashboard import DashboardSummary, KPI, HeatmapCell, PriorityQueueItem, ThreatAlert, AnalyticsKPI, DriftMetric
from app.db.queries import list_claims

def assemble_dashboard_summary() -> DashboardSummary:
    """Assembles the dashboard summary data. Right now primarily driven by simulation mock data to match the UI."""
    summary = DashboardSummary()
    
    # 1. KPIs
    summary.kpis = [
        KPI(label="Risk Exposure", value="$14.2M", delta="+2.4%", icon="currency_exchange"),
        KPI(label="Auto-Resolution", value="92.8%", delta="+0.3%", icon="auto_fix_high"),
        KPI(label="Fraud Flags", value="124", delta="-12%", icon="security"),
        KPI(label="Processing Time", value="1.2s", delta="-0.1s", icon="timer")
    ]
    
    # 2. Priority Queue - simulated from list_claims
    claims, _ = list_claims(page=1, page_size=5)
    summary.priority_queue = [
        PriorityQueueItem(
            id=str(c["id"])[:8],
            holder="Sarah Jenkins",
            amount=f"${c.get('amount', '1,250.00')}",
            risk_score=92,
            status=c["status"]
        ) for c in claims
    ]
    
    # 3. Threat Alerts
    summary.threat_alerts = [
         ThreatAlert(
            id="syndicate", icon="skull", title="Syndicate Cluster #992", 
            detected="2m ago", level="Critical", score=98, 
            description="High-velocity claim pattern detected matching known organized fraud signature."
        ),
         ThreatAlert(
            id="identity", icon="identity_platform", title="Identity Mismatch", 
            detected="15m ago", level="High", score=84, 
            description="SSN provided appears on dark web breach list."
        )
    ]
    
    # 4. Analytics KPIs
    summary.analytics_kpis = [
        AnalyticsKPI(label="Total Prevented Loss", value="$12.4M", change="+12%", sub="Vs. $11.1M expected"),
        AnalyticsKPI(label="Current Accuracy Model", value="94.2%", change="+0.8%", sub="Top percentile performance"),
        AnalyticsKPI(label="Active Fraud Alerts", value="23", change="-5%", sub="Requires immediate review")
    ]
    
    # 5. Drift Metrics
    summary.drift_metrics = [
        DriftMetric(label="Input Drift (PSI)", value="0.04", bar_width="15%"),
        DriftMetric(label="Concept Drift (KL)", value="0.12", bar_width="45%"),
        DriftMetric(label="Output Stability", value="0.21", bar_width="75%")
    ]
    
    # 6. Heatmap mock (small sample)
    summary.heatmap = [
        HeatmapCell(day=1, hour=12, value=45),
        HeatmapCell(day=2, hour=14, value=80),
        HeatmapCell(day=3, hour=9, value=20),
    ]
    
    return summary
