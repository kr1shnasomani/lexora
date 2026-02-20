from fastapi import APIRouter
from app.contracts.dashboard import DashboardSummary
from app.gateway.dashboard_view import assemble_dashboard_summary

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary():
    # Assembler handles simulation gracefully
    return assemble_dashboard_summary()
