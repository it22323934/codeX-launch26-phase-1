from pydantic import BaseModel, field_validator, model_validator
from typing import Any, Optional


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
    universe_metadata: dict[str, Any] = {}
    nodes: list[Node]

    @model_validator(mode="after")
    def unique_ids(self) -> "UniverseConfig":
        ids = [n.id for n in self.nodes]
        if len(ids) != len(set(ids)):
            raise ValueError("Node ids must be unique")
        return self
