"""FastAPI entrypoint: load the universe, mount the API + WebSocket, expose health.

Run with::

    uvicorn app.main:app --reload     # from the server/ directory

CORS is wide open for local dev (the Vite frontend proxies here). The live
universe is loaded once at startup into ``app.state`` and mutated in place, so
node/link failures persist across requests until ``/api/reset``.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.api.ws import websocket_endpoint
from app.config import config_path, read_config
from engine.universe import UniverseState


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the configured universe before serving; expose its path for /health."""
    path = config_path()
    app.state.config_path = str(path)
    app.state.universe = UniverseState.from_config(read_config(path))
    app.state.active_route = None  # last /api/route request, for live reroute
    yield


app = FastAPI(title="Relic Ring Protocol", version="0.1.0", lifespan=lifespan)

# Permissive CORS for local development (Vite dev server / proxy).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.add_api_websocket_route("/ws", websocket_endpoint)


@app.get("/health")
def health() -> dict:
    """Liveness probe; reports which config file is loaded."""
    return {"ok": True, "config": app.state.config_path}
