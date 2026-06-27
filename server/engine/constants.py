"""
Default physical and protocol constants for the Relic Ring Protocol.

Every tunable value in the engine is defined here exactly once. Logic modules
import these names — they never embed bare literals. Values are "overridable":
they are defaults only. ``resolve_constants()`` merges a universe config's
``universe_metadata`` over them so the rest of the engine reads a single
resolved, immutable :class:`Constants` object.

Governed by the ``constants-config-discipline`` skill: if you need a physical
or protocol value anywhere in the engine, add it here (with units, source, and
an override note) and import it — do not paste a literal into logic.
"""
from __future__ import annotations

from dataclasses import dataclass

# --- Physics (overridable via universe_metadata) ---------------------------

# Speed of light in vacuum; the void-crossing term divides distance by this.
# Source: Relic Ring spec §B. Override: universe_metadata.speed_of_light_kms.
SPEED_OF_LIGHT_KMS = 300_000           # km/s

# Fraction of c at which signals travel along a relay planet's subsurface
# fiber ring (the surface arc between receive and send towers).
# Source: spec §A. Override: universe_metadata.fiber_speed_fraction.
# Safe range: (0, 1]. Values ≤ 0 would divide by zero / invert time.
FIBER_SPEED_FRACTION = 0.67            # dimensionless

# Fixed processing penalty charged once per *distinct* routing tower a packet
# touches on a planet. Source: spec §A. Override: universe_metadata.tower_delay_ms.
TOWER_DELAY_MS = 7                      # ms

# --- Limits (overridable) --------------------------------------------------

# Longest single laser hop across the void. Planet pairs whose void distance
# exceeds this cannot beam directly and must route through a relay.
# Source: spec §A constraints. Override: universe_metadata.lmax_km.
LMAX_KM = 50_000_000                   # km

# --- Geometry (overridable) ------------------------------------------------

# Multiplier turning abstract config x/y grid units into real kilometres for
# planet *centers*. NOTE: radius_km and atmosphere_thickness_km are already in
# km and are NEVER scaled by this — only center coordinates are.
# Source: spec §6 / supporting diagram. Override: universe_metadata.coordinate_scale_unit_km.
COORDINATE_SCALE_UNIT_KM = 100_000     # km per grid unit


@dataclass(frozen=True)
class Constants:
    """Resolved, immutable snapshot of every tunable the engine reads.

    Frozen so a stray assignment can't silently change physics mid-route.
    Construct only via :func:`resolve_constants`.
    """

    speed_of_light_kms: float
    fiber_speed_fraction: float
    tower_delay_ms: float
    lmax_km: float
    coordinate_scale_unit_km: float


def resolve_constants(metadata: dict | None = None) -> Constants:
    """Merge a config's ``universe_metadata`` over the defaults above.

    The rest of the engine reads one resolved, immutable object. Any key the
    config omits falls back to the module default — so a partial metadata block
    is valid and a missing block yields pure defaults.

    Args:
        metadata: The ``universe_metadata`` mapping from a universe config,
            or ``None``. Unknown keys are ignored.

    Returns:
        A frozen :class:`Constants` instance.
    """
    m = metadata or {}
    return Constants(
        speed_of_light_kms=m.get("speed_of_light_kms", SPEED_OF_LIGHT_KMS),
        fiber_speed_fraction=m.get("fiber_speed_fraction", FIBER_SPEED_FRACTION),
        tower_delay_ms=m.get("tower_delay_ms", TOWER_DELAY_MS),
        lmax_km=m.get("lmax_km", LMAX_KM),
        coordinate_scale_unit_km=m.get(
            "coordinate_scale_unit_km", COORDINATE_SCALE_UNIT_KM
        ),
    )
