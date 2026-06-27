"""Pydantic v2 domain models: planetary nodes, universe metadata, payload.

These validate the raw ``universe-config.json`` strictly so the rest of the
engine can trust its inputs. Field constraints mirror the spec node schema;
violations raise ``pydantic.ValidationError``, which the API maps to a clean
400-style response (the engine never crashes on a malformed config).
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class UniverseMetadata(BaseModel):
    """Optional per-universe overrides for any engine constant.

    Every field is optional; omitted keys fall back to ``engine.constants``
    defaults via :func:`engine.constants.resolve_constants`. Extra keys are
    rejected so typos surface instead of silently doing nothing.
    """

    model_config = ConfigDict(extra="forbid")

    speed_of_light_kms: float | None = Field(default=None, gt=0)
    fiber_speed_fraction: float | None = Field(default=None, gt=0, le=1)
    tower_delay_ms: float | None = Field(default=None, ge=0)
    lmax_km: float | None = Field(default=None, gt=0)
    coordinate_scale_unit_km: float | None = Field(default=None, gt=0)

    def as_overrides(self) -> dict:
        """Return only the explicitly-set keys, for merging over defaults."""
        return self.model_dump(exclude_none=True)


class Node(BaseModel):
    """A single planet in the network. Field bounds enforce the spec schema.

    Coordinates ``x``/``y`` are abstract grid units (scaled to km for centers
    by ``coordinate_scale_unit_km``); ``radius_km`` and
    ``atmosphere_thickness_km`` are already in km and are never scaled.
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)                       # unique; checked at universe load
    codex: int = Field(ge=2, le=36)                     # numeric base 2–36 for this planet
    x: float                                            # grid units
    y: float                                            # grid units
    radius_km: float = Field(gt=0)                      # planet surface radius
    active_towers: int = Field(ge=4)                    # routing towers on the equator
    atmosphere_thickness_km: float = Field(ge=0)        # shell light must cross
    refraction_index: float = Field(ge=1)               # slows light to c/n in the shell


class Universe(BaseModel):
    """The whole parsed config: the node list plus optional metadata overrides.

    ``id`` uniqueness across ``nodes`` is validated by the loader
    (``engine.universe``), not here, so the error message can name the dupe.
    """

    model_config = ConfigDict(extra="forbid")

    nodes: list[Node]
    universe_metadata: UniverseMetadata = Field(default_factory=UniverseMetadata)


class Packet(BaseModel):
    """A transmission request: send ``payload`` from ``origin`` to ``destination``."""

    model_config = ConfigDict(extra="forbid")

    origin: str
    destination: str
    payload: str = Field(min_length=1)
