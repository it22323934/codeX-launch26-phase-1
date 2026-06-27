"""WebSocket broadcast: push topology/route updates to every connected client.

The :class:`ConnectionManager` is the single fan-out point. ``routes.py``
mutates the universe then calls ``manager.broadcast(...)``; on connect, a client
immediately receives the current topology so it can render without a REST round
trip. Message shapes:

    {"type": "topology", "snapshot": <universe snapshot>}
    {"type": "route",    "result":   <route result>}
"""
from __future__ import annotations

from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    """Tracks open sockets and fans messages out to all of them."""

    def __init__(self) -> None:
        self.active: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        """Send ``message`` to every live socket; drop any that error out."""
        dead: list[WebSocket] = []
        for websocket in list(self.active):
            try:
                await websocket.send_json(message)
            except Exception:  # client vanished mid-send; prune it
                dead.append(websocket)
        for websocket in dead:
            self.disconnect(websocket)


# Module-level singleton shared with the REST routes.
manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket) -> None:
    """Accept a client, send it the current topology, then keep the socket open.

    Inbound frames are ignored (the protocol is server→client push only); the
    loop exists purely to detect disconnects.
    """
    await manager.connect(websocket)
    try:
        await websocket.send_json(
            {"type": "topology", "snapshot": websocket.app.state.universe.snapshot()}
        )
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
