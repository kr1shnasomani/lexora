from fastapi import APIRouter, HTTPException
from app.contracts.auth import SessionRequest, UserInfo
from app.core.settings import settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/session", response_model=UserInfo)
async def validate_session(request: SessionRequest):
    if settings.simulation_mode:
        # Mock admin user for simulation
        return UserInfo(
            user_id="mock-user-1234",
            email="admin@lexora.com",
            role="admin",
            display_name="Admin User"
        )
        
    # Real validation would verify JWT via Supabase client, skipping for now
    raise HTTPException(status_code=501, detail="Live authentication not yet implemented in skeleton")
