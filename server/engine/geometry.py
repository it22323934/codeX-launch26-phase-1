"""
Geometric helpers for Relic Ring universe.

Coordinate conventions
----------------------
- Grid coordinates (node.x, node.y) are abstract units; multiply by scale to get km.
- radius_km and atmosphere_thickness_km are already in km — they are NOT scaled.
- Tower k of N is placed at angle θ_k = 2π·k/N measured clockwise from +y (north).
  Relative to planet center: (R·sin(θ_k), R·cos(θ_k)).
- void_distance_km measures surface-to-surface gap clamped to ≥ 0.
"""

import math
from engine.models import Node


def planet_center_km(node: Node, scale: float) -> tuple[float, float]:
    """Return (x_km, y_km) of planet center after applying coordinate scale."""
    return (node.x * scale, node.y * scale)


def tower_position(node: Node, k: int, cx: float, cy: float) -> tuple[float, float]:
    """
    World position (km) of tower k on node.
    θ_k = 2π·k/N, clockwise from +y.
    Offset from center: (R·sin(θ_k), R·cos(θ_k)).
    """
    n = node.active_towers
    theta = 2.0 * math.pi * k / n
    dx = node.radius_km * math.sin(theta)
    dy = node.radius_km * math.cos(theta)
    return (cx + dx, cy + dy)


def void_distance_km(a: Node, b: Node, scale: float) -> float:
    """
    Surface-to-surface void gap between planets a and b.
    = ||center_a - center_b|| - (R_a + h_a) - (R_b + h_b), clamped to >= 0.
    """
    ax, ay = planet_center_km(a, scale)
    bx, by = planet_center_km(b, scale)
    center_dist = math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
    surface_gap = center_dist - (a.radius_km + a.atmosphere_thickness_km) - (b.radius_km + b.atmosphere_thickness_km)
    return max(0.0, surface_gap)


def closest_tower_pair(a: Node, b: Node, scale: float) -> tuple[int, int]:
    """
    Return (tower_index_on_a, tower_index_on_b) that minimizes the straight-line
    distance between the two tower world positions.
    """
    ax, ay = planet_center_km(a, scale)
    bx, by = planet_center_km(b, scale)

    best_dist = float("inf")
    best_i, best_j = 0, 0

    for i in range(a.active_towers):
        ti_x, ti_y = tower_position(a, i, ax, ay)
        for j in range(b.active_towers):
            tj_x, tj_y = tower_position(b, j, bx, by)
            dist = math.sqrt((tj_x - ti_x) ** 2 + (tj_y - ti_y) ** 2)
            if dist < best_dist:
                best_dist = dist
                best_i, best_j = i, j

    return (best_i, best_j)


def tower_segment_count(node: Node, i: int, j: int) -> int:
    """
    Number of ring segments (steps) between tower i and j along the shorter arc.
    s = 0 when i == j (dedup case).
    Source: spec Equations §3 — m = s+1 distinct towers hit.
    """
    if i == j:
        return 0
    n = node.active_towers
    diff = abs(i - j)
    return min(diff, n - diff)


def fiber_arc_length_km(node: Node, i: int, j: int) -> float:
    """
    Great-circle arc length (km) along the equator of node between tower i and tower j.
    Uses the shorter of the two arcs: arc = (2π·r·s) / N where s = segment count.
    """
    s = tower_segment_count(node, i, j)
    if s == 0:
        return 0.0
    return (2.0 * math.pi * node.radius_km * s) / node.active_towers
