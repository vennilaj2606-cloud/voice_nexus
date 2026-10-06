from fastapi import FastAPI, WebSocket, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.config import settings
from app.core.logger import logger
from app.database.init_db import init_db
from app.api.deps import get_db

from app.api.v1 import auth, leads, calls, properties, appointments, prompts, analytics, knowledge, webhooks
from app.websocket.call_stream_handler import CallStreamHandler
from app.websocket.connection_manager import ws_manager

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    logger.info("Starting VoiceNexus AI Backend Service...")
    await init_db()

@app.get("/health", tags=["Health Check"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

# Register API v1 Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(leads.router, prefix=api_v1_prefix)
app.include_router(calls.router, prefix=api_v1_prefix)
app.include_router(properties.router, prefix=api_v1_prefix)
app.include_router(appointments.router, prefix=api_v1_prefix)
app.include_router(prompts.router, prefix=api_v1_prefix)
app.include_router(analytics.router, prefix=api_v1_prefix)
app.include_router(knowledge.router, prefix=api_v1_prefix)
app.include_router(webhooks.router, prefix=api_v1_prefix)

# WebSocket Endpoint for Telephony Audio Stream
@app.websocket("/api/v1/ws/call/{call_id}")
async def websocket_call_stream(websocket: WebSocket, call_id: str, db: AsyncSession = Depends(get_db)):
    handler = CallStreamHandler(websocket, call_id, db)
    await handler.handle()

# WebSocket Endpoint for Real-time Dashboard Monitoring
@app.websocket("/api/v1/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await ws_manager.connect_dashboard(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        ws_manager.disconnect_dashboard(websocket)
