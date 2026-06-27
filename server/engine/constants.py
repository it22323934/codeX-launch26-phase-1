"""
Default physical and protocol constants for the Relic Ring engine.
Every tunable value is defined here exactly once. Logic modules import names — never bare literals.
Values marked "overridable" are defaults only: resolve_constants() merges config metadata over them.
"""
from dataclasses import dataclass

# --- Physics (overridable via universe_metadata) ---------------------------

# Speed of light in vacuum. Source: spec §B. Override key: speed_of_light_kms.
SPEED_OF_LIGHT_KMS: float = 300_000  # km/s

# Fraction of c at which signals travel along subsurface fiber ring arc.
# Source: spec §A. Override key: fiber_speed_fraction.
FIBER_SPEED_FRACTION: float = 0.67  # dimensionless

# Fixed processing penalty per routing tower hit. Source: spec §A.
# Override key: tower_processing_delay_ms.
TOWER_DELAY_MS: float = 7  # ms

# --- Limits (overridable) --------------------------------------------------

# Maximum single void hop distance; farther pairs must relay.
# Source: spec §A. Override key: max_void_hop_distance_km.
LMAX_KM: float = 50_000_000  # km

# --- Geometry (overridable) ------------------------------------------------

# Multiplier from abstract grid units to real kilometres.
# radius_km and atmosphere_thickness_km are already in km — NOT scaled.
# Source: spec §6. Override key: coordinate_scale_unit_km.
COORDINATE_SCALE_UNIT_KM: float = 100_000  # km per grid unit


@dataclass(frozen=True)
class Constants:
    speed_of_light_kms: float
    fiber_speed_fraction: float
    tower_delay_ms: float
    lmax_km: float
    coordinate_scale_unit_km: float


def resolve_constants(metadata: dict | None = None) -> Constants:
    """Merge config universe_metadata over defaults. Missing keys fall back to defaults."""
    m = metadata or {}
    return Constants(
        speed_of_light_kms=m.get("speed_of_light_kms", SPEED_OF_LIGHT_KMS),
        fiber_speed_fraction=m.get("fiber_speed_fraction", FIBER_SPEED_FRACTION),
        tower_delay_ms=m.get("tower_processing_delay_ms", TOWER_DELAY_MS),
        lmax_km=m.get("max_void_hop_distance_km", LMAX_KM),
        coordinate_scale_unit_km=m.get("coordinate_scale_unit_km", COORDINATE_SCALE_UNIT_KM),
    )
