"""
WebSocket connection manager.

Broadcasts topology and route updates to all connected clients when the
universe topology changes.

Message types pushed to clients:
  {"type": "topology", "snapshot": <UniverseSnapshot dict>}
  {"type": "route",    "result":   <RouteResponse dict>}
"""

from __future__ import annotations

import json
import asyncio
from typing import TYPE_CHECKING

from fastapi import WebSocket

if TYPE_CHECKING:
    from engine.universe import Universe
    from engine.constants import Constants


class ConnectionManager:
    def __init__(self) -> None:
        self.active: set[WebSocket] = set()
        # Stores the last route request so it can be recomputed on topology change.
        self.last_route_request: dict | None = None  # {origin, destination, payload}

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.active.discard(ws)

    async def broadcast(self, data: dict) -> None:
        """Send JSON to all connected clients; silently drop dead connections."""
        message = json.dumps(data)
        dead: set[WebSocket] = set()
        for ws in list(self.active):
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        self.active -= dead

    async def broadcast_topology(self, universe: "Universe", constants: "Constants") -> None:
        """Broadcast current topology snapshot to all clients."""
        await self.broadcast({"type": "topology", "snapshot": universe.snapshot()})

    async def broadcast_reroute(
        self,
        universe: "Universe",
        constants: "Constants",
        router_fn,
    ) -> None:
        """Recompute the last stored route and broadcast the result."""
        if self.last_route_request is None:
            return
        req = self.last_route_request
        result = router_fn(
            req["origin"],
            req["destination"],
            req["payload"],
            universe,
            constants,
        )
        await self.broadcast({"type": "route", "result": result})


manager = ConnectionManager()
