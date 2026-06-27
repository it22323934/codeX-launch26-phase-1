"""
Pydantic DTOs for all REST request/response types.
"""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


class RouteRequest(BaseModel):
    origin: str
    destination: str
    payload: str


class ToggleNodeRequest(BaseModel):
    """alive=None means flip current state; True/False forces a specific state."""
    alive: Optional[bool] = None


class ToggleLinkRequest(BaseModel):
    a: str
    b: str
    alive: Optional[bool] = None


# ---------------------------------------------------------------------------
# Latency sub-models
# ---------------------------------------------------------------------------


class FiberSegment(BaseModel):
    arc_km: float
    ms: float
    segments_s: int = 0


class CrossingSegment(BaseModel):
    to: str
    h_out_km: float = 0.0
    n_out: float = 1.0
    atmosphere_out_ms: float
    void_km: float
    void_ms: float
    h_in_km: float = 0.0
    n_in: float = 1.0
    atmosphere_in_ms: float
    total_ms: float


class HopEntry(BaseModel):
    planet: str
    role: str  # "origin" | "relay" | "destination"
    codex: int
    recv_tower: Optional[int]
    send_tower: Optional[int]
    towers_hit: int
    tower_delay_ms: float
    fiber: Optional[FiberSegment]
    crossing: Optional[CrossingSegment]
    # Raw formula inputs
    radius_km: float = 0.0
    atmosphere_km: float = 0.0
    refraction_n: float = 1.0
    active_towers_n: int = 0
    fiber_segments_s: int = 0
    tower_delay_each_ms: float = 7.0
    fiber_speed_fraction: float = 0.67
    speed_of_light_kms: float = 300_000.0


class LatencySummary(BaseModel):
    void_ms: float
    atmosphere_ms: float
    fiber_ms: float
    tower_ms: float
    total_ms: float


class TranslationStage(BaseModel):
    planet_id: str
    codex: int
    received_as: list[str]
    ascii: str
    sent_as: Optional[list[str]]
    binary_stream: str


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------


class RouteResponse(BaseModel):
    deliverable: bool
    reason: Optional[str] = None
    origin_id: Optional[str] = None
    destination_id: Optional[str] = None
    payload: Optional[str] = None
    path: Optional[list[str]] = None
    latency: Optional[LatencySummary] = None
    hop_log: Optional[list[HopEntry]] = None
    translation: Optional[list[TranslationStage]] = None


class TowerPosition(BaseModel):
    x: float
    y: float
    index: int


class NodeSnapshot(BaseModel):
    id: str
    codex: int
    x: float
    y: float
    radius_km: float
    active_towers: int
    atmosphere_thickness_km: float
    refraction_index: float
    alive: bool
    tower_positions: list[TowerPosition]


class EdgeSnapshot(BaseModel):
    a: str
    b: str
    void_km: float
    alive: bool


class UniverseSnapshot(BaseModel):
    nodes: list[NodeSnapshot]
    edges: list[EdgeSnapshot]
