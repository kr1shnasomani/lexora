"""Lexora Backend — FastAPI Application"""
import asyncio
import os
import sys

# Add backend dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.analytics import router as analytics_router
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.claims import process_pending
from routes.claims import router as claims_router
from routes.customer import notifications_router, user_router
from routes.customer import router as customer_router
from routes.dashboard import router as dashboard_router
from routes.network import router as network_router
from routes.pdf_export import router as pdf_export_router
from routes.settings import router as config_router
from routes.webhooks import router as webhooks_router

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
app.include_router(chat_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """Start background tasks on server boot."""
    async def claim_sweeper():
        while True:
            try:
                res = await process_pending()
                if res.get("processed_count", 0) > 0:
                    print(f"[System] Swept {res['processed_count']} active claims.")
            except Exception as e:
                print(f"[System] Sweeper error: {e}")

            # Run every 30 seconds
            await asyncio.sleep(30)
            
    asyncio.create_task(claim_sweeper())

@app.get("/")
async def root():
    return {"service": "Lexora Claims Engine", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}



