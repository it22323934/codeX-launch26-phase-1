"""
Relic Ring Protocol — FastAPI application entry point.

Startup sequence:
  1. Load default universe-config.json (or RELIC_CONFIG path) into module state.
  2. Mount REST router at /api/*.
  3. Expose /health and /ws endpoints directly.

Run with:
  uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router, load_default_universe
from app.api.ws import manager
from app.config import get_config_path


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load universe on startup."""
    load_default_universe()
    yield
    # Nothing to clean up.


app = FastAPI(title="Relic Ring Protocol", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "config": str(get_config_path())}


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            # Keep alive; client messages are ignored (push-only from server)
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
