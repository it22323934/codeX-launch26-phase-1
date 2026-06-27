"""REST endpoints. One live :class:`UniverseState` lives in ``app.state`` so
failure state persists across requests; topology changes are pushed over the
WebSocket. Validation errors become clean 4xx responses — the engine never
crashes the process.
"""
from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException, Request
from pydantic import ValidationError

from app.api import ws
from app.api.schemas import LinkToggle, NodeToggle, RouteRequest
from engine import router as routing
from engine.universe import UniverseState

router = APIRouter(prefix="/api")


def _universe(request: Request) -> UniverseState:
    return request.app.state.universe


async def _broadcast(request: Request) -> dict:
    """Push topology to all clients and, if a route is active, re-route live.

    Returns the fresh snapshot so the calling HTTP handler can return it too.
    The route recompute is guarded: until ``engine.router`` is implemented it
    raises ``NotImplementedError``, which we swallow so toggles still succeed.
    """
    uni = _universe(request)
    snapshot = uni.snapshot()
    await ws.manager.broadcast({"type": "topology", "snapshot": snapshot})

    active = getattr(request.app.state, "active_route", None)
    if active:
        try:
            result = routing.find_route(
                uni, active["origin"], active["destination"], active["payload"]
            )
            await ws.manager.broadcast({"type": "route", "result": result})
        except (NotImplementedError, KeyError):
            pass  # router stub / stale ids — topology was still pushed
    return snapshot


@router.get("/universe")
def get_universe(request: Request) -> dict:
    """Enriched snapshot of the current universe (M1)."""
    return _universe(request).snapshot()


@router.post("/universe")
def replace_universe(request: Request, config: dict = Body(...)) -> dict:
    """Replace the live universe with a posted config; revives all failures."""
    try:
        request.app.state.universe = UniverseState.from_config(config)
    except (ValidationError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"invalid config: {exc}")
    request.app.state.active_route = None
    return request.app.state.universe.snapshot()


@router.post("/route")
def post_route(request: Request, body: RouteRequest) -> dict:
    """Compute the lowest-latency route for a payload (M2/M3)."""
    uni = _universe(request)
    if body.origin not in uni.nodes or body.destination not in uni.nodes:
        raise HTTPException(status_code=400, detail="unknown origin/destination id")
    request.app.state.active_route = body.model_dump()
    try:
        return routing.find_route(uni, body.origin, body.destination, body.payload)
    except NotImplementedError as exc:
        # Scaffold: router not implemented yet. Fill engine/router.py to enable.
        raise HTTPException(status_code=501, detail=str(exc))


@router.post("/nodes/{node_id}/toggle")
async def toggle_node(
    request: Request, node_id: str, body: NodeToggle | None = Body(default=None)
) -> dict:
    """Kill or revive a planet, then broadcast the new topology (M4)."""
    uni = _universe(request)
    if node_id not in uni.nodes:
        raise HTTPException(status_code=404, detail=f"unknown node id: {node_id}")
    alive = (
        body.alive if body and body.alive is not None else not uni.is_node_alive(node_id)
    )
    uni.set_node_alive(node_id, alive)
    return await _broadcast(request)


@router.post("/links/toggle")
async def toggle_link(
    request: Request, body: LinkToggle = Body(...)
) -> dict:
    """Kill or revive a link between two planets, then broadcast (M4)."""
    uni = _universe(request)
    for nid in (body.a, body.b):
        if nid not in uni.nodes:
            raise HTTPException(status_code=404, detail=f"unknown node id: {nid}")
    # Omitting `alive` flips the current state.
    alive = (
        body.alive
        if body.alive is not None
        else not uni.is_link_alive(body.a, body.b)
    )
    uni.set_link_alive(body.a, body.b, alive)
    return await _broadcast(request)


@router.post("/reset")
async def reset(request: Request) -> dict:
    """Revive every node and link, then broadcast the restored topology."""
    _universe(request).reset()
    return await _broadcast(request)
