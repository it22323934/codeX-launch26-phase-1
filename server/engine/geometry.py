"""Planetary geometry: centers, tower placement, void distance, fiber arcs.

Pure 2D math on the validated config. Uses stdlib ``math`` (the values are
2-vectors; ``hypot`` is exact and dependency-free). The angle convention here
is shared verbatim with the frontend so towers line up with the hop log:

    Tower k of N sits at angle θ_k = 2π·k/N measured CLOCKWISE from +y,
    so Tower 0 is at the top. Offset from center: (R·sin θ_k, R·cos θ_k).

Distances are in kilometres. Only planet *centers* are scaled by
``coordinate_scale_unit_km``; ``radius_km`` / ``atmosphere_thickness_km`` are
already km and are never scaled (see ``engine.constants``).
"""
from __future__ import annotations

import math

from engine.models import Node

# A full turn, in radians. Structural geometry constant (not a domain tunable).
TAU = 2.0 * math.pi


def planet_center_km(node: Node, scale: float) -> tuple[float, float]:
    """World-space center of a planet: grid coords scaled to kilometres."""
    return (node.x * scale, node.y * scale)


def tower_angle(k: int, n: int) -> float:
    """Angle (radians) of tower ``k`` of ``n``, clockwise from +y."""
    return TAU * k / n


def tower_offset_km(node: Node, k: int) -> tuple[float, float]:
    """Tower ``k`` position relative to its planet center: (R·sinθ, R·cosθ)."""
    theta = tower_angle(k, node.active_towers)
    r = node.radius_km
    return (r * math.sin(theta), r * math.cos(theta))


def tower_world_km(node: Node, k: int, scale: float) -> tuple[float, float]:
    """Absolute world position of tower ``k`` (scaled center + surface offset)."""
    cx, cy = planet_center_km(node, scale)
    ox, oy = tower_offset_km(node, k)
    return (cx + ox, cy + oy)


def void_distance_km(a: Node, b: Node, scale: float) -> float:
    """Line-of-sight gap between two atmospheres, clamped to ≥ 0.

    ``‖center_a − center_b‖ − (R_a + h_a) − (R_b + h_b)``. Tower angle is
    deliberately excluded from this length — towers only decide which antennas
    send/receive, never how far the void leg is.
    """
    ax, ay = planet_center_km(a, scale)
    bx, by = planet_center_km(b, scale)
    center_gap = math.hypot(ax - bx, ay - by)
    surface_gap = center_gap - (a.radius_km + a.atmosphere_thickness_km) \
        - (b.radius_km + b.atmosphere_thickness_km)
    return max(0.0, surface_gap)


def closest_tower_pair(a: Node, b: Node, scale: float) -> tuple[int, int]:
    """The ``(tower_on_a, tower_on_b)`` whose antennas are physically closest.

    Picks the line-of-sight send/receive antennas. Used only to choose towers;
    it never alters the void length L.
    """
    best: tuple[int, int] = (0, 0)
    best_d = math.inf
    for i in range(a.active_towers):
        aix, aiy = tower_world_km(a, i, scale)
        for j in range(b.active_towers):
            bjx, bjy = tower_world_km(b, j, scale)
            d = math.hypot(aix - bjx, aiy - bjy)
            if d < best_d:
                best_d, best = d, (i, j)
    return best


def fiber_arc_length_km(node: Node, i: int, j: int) -> float:
    """Surface arc length ``R · Δθ`` between towers ``i`` and ``j``.

    ``Δθ`` is the *shorter-way* angular separation around the equator, so a
    relay's internal fiber never wraps the long way round.
    """
    n = node.active_towers
    steps = abs(i - j) % n
    steps = min(steps, n - steps)           # shorter way around the ring
    delta_theta = TAU * steps / n
    return node.radius_km * delta_theta
