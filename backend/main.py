"""Lexora Backend — FastAPI Application"""
import sys
import os
import asyncio

# Add backend dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from routes.claims import router as claims_router, process_pending
from routes.webhooks import router as webhooks_router
from routes.customer import router as customer_router, user_router, notifications_router
from routes.dashboard import router as dashboard_router
from routes.auth import router as auth_router
from routes.pdf_export import router as pdf_export_router
from routes.config import router as config_router
from routes.network import router as network_router


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Insurance Claims Processing Engine — Lexora",
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(claims_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(customer_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(pdf_export_router, prefix="/api")
app.include_router(config_router, prefix="/api")
app.include_router(network_router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """Start background tasks on server boot."""
    async def claim_sweeper():
        while True:
            try:
                # Log active sweep (remove in production if too noisy)
                print("[System] Running automated background claim sweep...")
                res = await process_pending()
                if res.get("processed_count", 0) > 0:
                    print(f"[System] Swept {res['processed_count']} active claims. Log: {res.get('logs')}")
            except Exception as e:
                print(f"[System] Automated pipeline sweeper error: {e}")
            
            # Run every 30 seconds
            await asyncio.sleep(30)
            
    asyncio.create_task(claim_sweeper())

@app.get("/")
async def root():
    return {"service": "Lexora Claims Engine", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# ── Additional utility endpoints ──────────────────────────────

@app.get("/api/policies")
async def list_policies():
    from database import get_supabase
    db = get_supabase()
    result = db.table("policies").select("*").execute()
    return {"policies": result.data or []}


@app.get("/api/configuration")
async def list_configuration():
    from database import get_supabase
    db = get_supabase()
    result = db.table("configuration").select("*").execute()
    return {"configuration": result.data or []}


@app.get("/api/users")
async def list_users():
    from database import get_supabase
    db = get_supabase()
    result = db.table("users").select("*").execute()
    return {"users": result.data or []}
