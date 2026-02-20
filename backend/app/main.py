from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.settings import settings
from app.core.logging import correlation_id_middleware, logger

from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.claims import router as claims_router
from app.routes.config import router as config_router
from app.routes.audit import router as audit_router
from app.routes.webhooks import router as webhooks_router

app = FastAPI(title="Lexora API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Correlation ID middleware
app.middleware("http")(correlation_id_middleware)

@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting Lexora Backend. Simulation Mode: {settings.simulation_mode}")

# Mount routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(claims_router)
app.include_router(config_router)
app.include_router(audit_router)
app.include_router(webhooks_router)

