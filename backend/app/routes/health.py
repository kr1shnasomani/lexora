from fastapi import APIRouter
from app.core.settings import settings
from app.core.supabase_client import get_supabase

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    client_status = "connected" if get_supabase() else "disconnected"
    return {
        "status": "ok",
        "simulation_mode": settings.simulation_mode,
        "supabase_connection": client_status
    }
