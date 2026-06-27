"""Pydantic request DTOs for the HTTP API.

Responses are plain dicts straight from the engine (snapshot / route result),
so only inbound bodies need schemas here. The default payload mirrors the
frontend's default so a bare Transmit "just works".
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    """Body for ``POST /api/route``."""

    origin: str
    destination: str
    payload: str = Field(default="Hello world", min_length=1)


class NodeToggle(BaseModel):
    """Body for ``POST /api/nodes/{id}/toggle``. Omit ``alive`` to flip."""

    alive: bool | None = None


class LinkToggle(BaseModel):
    """Body for ``POST /api/links/toggle``. Omit ``alive`` to flip."""

    a: str
    b: str
    alive: bool | None = None
