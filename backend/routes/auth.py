from fastapi import APIRouter
from pydantic import BaseModel

from database import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])

class VerifyEmailRequest(BaseModel):
    email: str

@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest):
    db = get_supabase()
    
    result = db.table("users").select("*").eq("email", req.email.strip().lower()).execute()
    users = result.data or []
    
    if not users:
        return {"exists": False}
        
    user = users[0]
    return {
        "exists": True,
        "role": user.get("role", "customer"),
        "name": user.get("full_name") or "User"
    }
