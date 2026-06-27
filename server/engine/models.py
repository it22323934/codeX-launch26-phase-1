from pydantic import BaseModel, field_validator, model_validator
from typing import Optional


# ── Universe-level physics / protocol constants ──────────────────────────────

class UniverseMetadata(BaseModel):
    system_name: str
    speed_of_light_kms: float
    max_void_hop_distance_km: float
    coordinate_scale_unit_km: float
    tower_processing_delay_ms: float
    fiber_speed_fraction: float

    @field_validator("speed_of_light_kms", "max_void_hop_distance_km", "coordinate_scale_unit_km")
    @classmethod
    def must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("must be > 0")
        return v

    @field_validator("tower_processing_delay_ms")
    @classmethod
    def non_negative_delay(cls, v: float) -> float:
        if v < 0:
            raise ValueError("must be >= 0")
        return v

    @field_validator("fiber_speed_fraction")
    @classmethod
    def fraction_range(cls, v: float) -> float:
        if not (0 < v <= 1):
            raise ValueError("must be in (0, 1] — a fraction of the speed of light")
        return v


# ── Per-planet node ───────────────────────────────────────────────────────────

class Node(BaseModel):
    id: str
    codex: int
    x: float
    y: float
    radius_km: float
    active_towers: int
    atmosphere_thickness_km: float
    refraction_index: float

    @field_validator("codex")
    @classmethod
    def codex_range(cls, v: int) -> int:
        if not (2 <= v <= 36):
            raise ValueError(f"codex must be 2–36, got {v}")
        return v

    @field_validator("radius_km")
    @classmethod
    def positive_radius(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("radius_km must be > 0")
        return v

    @field_validator("active_towers")
    @classmethod
    def min_towers(cls, v: int) -> int:
        if v < 4:
            raise ValueError("active_towers must be >= 4")
        return v

    @field_validator("atmosphere_thickness_km")
    @classmethod
    def non_negative_atmosphere(cls, v: float) -> float:
        if v < 0:
            raise ValueError("atmosphere_thickness_km must be >= 0")
        return v

    @field_validator("refraction_index")
    @classmethod
    def min_refraction(cls, v: float) -> float:
        if v < 1.0:
            raise ValueError("refraction_index must be >= 1.0")
        return v


class UniverseConfig(BaseModel):
    universe_metadata: UniverseMetadata
    nodes: list[Node]

    @model_validator(mode="after")
    def unique_ids(self) -> "UniverseConfig":
        ids = [n.id for n in self.nodes]
        if len(ids) != len(set(ids)):
            raise ValueError("Node ids must be unique")
        return self
