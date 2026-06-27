"""
REST API routes for the Relic Ring Protocol server.

Endpoints
---------
GET  /api/universe             — enriched topology snapshot
POST /api/universe             — replace universe from new config JSON
POST /api/route                — compute lowest-latency route
POST /api/nodes/{id}/toggle    — toggle or force-set a node's alive state
POST /api/links/toggle         — toggle or force-set a link's alive state
POST /api/reset                — revive all nodes and links
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Body

from engine.models import UniverseConfig
from engine.universe import Universe
from engine.constants import resolve_constants
from engine.router import find_route
from app.api.schemas import RouteRequest, ToggleNodeRequest, ToggleLinkRequest
from app.api.ws import manager
from app.config import get_config_path

router = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Module-level live universe state
# ---------------------------------------------------------------------------

_universe: Universe | None = None


def get_universe() -> Universe:
    if _universe is None:
        raise HTTPException(status_code=500, detail="Universe not loaded")
    return _universe


def _make_universe(data: dict) -> Universe:
    config = UniverseConfig(**data)
    constants = resolve_constants(config.universe_metadata)
    return Universe(config, constants)


def load_default_universe() -> None:
    """Called on startup to load the config from disk."""
    global _universe
    path = get_config_path()
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    _universe = _make_universe(data)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/universe")
async def api_get_universe() -> dict:
    """Return the enriched universe snapshot (nodes with tower coords + edges)."""
    return get_universe().snapshot()


@router.post("/universe")
async def api_post_universe(body: dict = Body(...)) -> dict:
    """Replace the current universe from a new config JSON body."""
    global _universe
    try:
        _universe = _make_universe(body)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    snap = _universe.snapshot()
    await manager.broadcast_topology(_universe, _universe.constants)
    return snap


@router.post("/route")
async def api_route(req: RouteRequest) -> dict:
    """Compute the lowest-latency route and return hop-by-hop details."""
    u = get_universe()
    # Store for re-broadcast on future topology changes
    manager.last_route_request = {
        "origin": req.origin,
        "destination": req.destination,
        "payload": req.payload,
    }
    result = find_route(req.origin, req.destination, req.payload, u, u.constants)
    return result


@router.post("/nodes/{node_id}/toggle")
async def api_toggle_node(node_id: str, req: ToggleNodeRequest) -> dict:
    """Toggle or force-set a node's alive state, then broadcast."""
    u = get_universe()
    node_ids = {n.id for n in u.config.nodes}
    if node_id not in node_ids:
        raise HTTPException(status_code=404, detail=f"Node {node_id!r} not found")

    if req.alive is None:
        # Flip
        new_alive = not u.is_node_alive(node_id)
    else:
        new_alive = req.alive

    u.set_node_alive(node_id, new_alive)
    snap = u.snapshot()
    await manager.broadcast_topology(u, u.constants)
    if manager.last_route_request:
        await manager.broadcast_reroute(u, u.constants, find_route)
    return snap


@router.post("/links/toggle")
async def api_toggle_link(req: ToggleLinkRequest) -> dict:
    """Toggle or force-set a link's alive state, then broadcast."""
    u = get_universe()
    node_ids = {n.id for n in u.config.nodes}
    if req.a not in node_ids:
        raise HTTPException(status_code=404, detail=f"Node {req.a!r} not found")
    if req.b not in node_ids:
        raise HTTPException(status_code=404, detail=f"Node {req.b!r} not found")

    if req.alive is None:
        new_alive = not u.is_link_alive(req.a, req.b)
    else:
        new_alive = req.alive

    u.set_link_alive(req.a, req.b, new_alive)
    snap = u.snapshot()
    await manager.broadcast_topology(u, u.constants)
    if manager.last_route_request:
        await manager.broadcast_reroute(u, u.constants, find_route)
    return snap


@router.post("/reset")
async def api_reset() -> dict:
    """Revive all nodes and links, broadcast updated topology."""
    u = get_universe()
    u.reset()
    snap = u.snapshot()
    await manager.broadcast_topology(u, u.constants)
    if manager.last_route_request:
        await manager.broadcast_reroute(u, u.constants, find_route)
    return snap
