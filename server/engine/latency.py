"""
Latency computation for a routed path through the Relic Ring universe.

Four components (all in milliseconds):

  Void       T_v = (L_km / c_kms) * 1000
  Atmosphere T_a = (h_km * n / c_kms) * 1000   [per shell crossing]
  Fiber      T_f = arc_km / (fiber_fraction * c_kms) * 1000
  Tower      T_t = tower_delay_ms * distinct_towers_hit_at_this_planet

Accounting rules:
  - Origin  : 1 tower (send only), crossing to next planet.
  - Relay   : recv tower + send tower; if same tower → 1 hit, no fiber;
              if different → 2 hits + fiber arc between them.
              Each void crossing adds atmosphere_out (origin side) + atmosphere_in (dest side).
  - Destination: 1 tower (recv only), no crossing.
"""

from __future__ import annotations
from typing import TYPE_CHECKING

from engine.constants import Constants
from engine.geometry import closest_tower_pair, void_distance_km, fiber_arc_length_km, tower_segment_count

if TYPE_CHECKING:
    from engine.universe import Universe


def _atm_ms(node, constants: Constants) -> float:
    """One-way atmosphere traversal delay (ms)."""
    return node.atmosphere_thickness_km * node.refraction_index / constants.speed_of_light_kms * 1000.0


def compute_path_latency(path: list[str], universe: "Universe", constants: Constants) -> dict:
    """
    Compute full latency breakdown for a path (list of planet ids).

    Returns:
      {
        "void_ms": float,
        "atmosphere_ms": float,
        "fiber_ms": float,
        "tower_ms": float,
        "total_ms": float,
        "hop_log": [...]   # one entry per planet
      }
    """
    nodes = {n.id: n for n in universe.config.nodes}
    scale = constants.coordinate_scale_unit_km
    n_hops = len(path)

    void_total = 0.0
    atm_total = 0.0
    fiber_total = 0.0
    tower_total = 0.0
    hop_log: list[dict] = []

    for i, planet_id in enumerate(path):
        node = nodes[planet_id]
        is_origin = i == 0
        is_dest = i == n_hops - 1

        if is_origin:
            role = "origin"
        elif is_dest:
            role = "destination"
        else:
            role = "relay"

        # --- Tower assignment ---
        recv_tower: int | None = None
        send_tower: int | None = None

        if not is_origin:
            prev_node = nodes[path[i - 1]]
            _, recv_tower = closest_tower_pair(prev_node, node, scale)

        if not is_dest:
            next_node = nodes[path[i + 1]]
            send_tower, _ = closest_tower_pair(node, next_node, scale)

        # --- Tower count at this planet ---
        # Official spec (Equations §3): m = s+1 where s = ring segments traveled.
        # m = 1 when entry tower = exit tower (dedup case, s=0).
        fiber_segments_s = 0
        if is_origin:
            towers_hit = 1  # send tower only, no traversal (s=0, m=1)
        elif is_dest:
            towers_hit = 1  # recv tower only, no traversal (s=0, m=1)
        else:
            # relay: traverse s segments from recv to send tower; hit s+1 distinct towers
            fiber_segments_s = tower_segment_count(nodes[planet_id], recv_tower, send_tower)  # type: ignore[arg-type]
            towers_hit = 1 if fiber_segments_s == 0 else fiber_segments_s + 1

        tower_delay = constants.tower_delay_ms * towers_hit
        tower_total += tower_delay

        # --- Fiber (relay only, when recv != send tower, i.e. s > 0) ---
        fiber_entry: dict | None = None
        if role == "relay" and towers_hit > 1:
            arc_km = fiber_arc_length_km(node, recv_tower, send_tower)  # type: ignore[arg-type]
            fiber_ms = arc_km / (constants.fiber_speed_fraction * constants.speed_of_light_kms) * 1000.0
            fiber_total += fiber_ms
            fiber_entry = {"arc_km": arc_km, "ms": fiber_ms, "segments_s": fiber_segments_s}

        # --- Crossing (all planets except destination) ---
        crossing_entry: dict | None = None
        if not is_dest:
            next_node = nodes[path[i + 1]]
            void_km = void_distance_km(node, next_node, scale)
            void_ms = void_km / constants.speed_of_light_kms * 1000.0
            atm_out_ms = _atm_ms(node, constants)
            atm_in_ms = _atm_ms(next_node, constants)

            void_total += void_ms
            atm_total += atm_out_ms + atm_in_ms

            crossing_entry = {
                "to": path[i + 1],
                "h_out_km": node.atmosphere_thickness_km,
                "n_out": node.refraction_index,
                "atmosphere_out_ms": atm_out_ms,
                "void_km": void_km,
                "void_ms": void_ms,
                "h_in_km": next_node.atmosphere_thickness_km,
                "n_in": next_node.refraction_index,
                "atmosphere_in_ms": atm_in_ms,
                "total_ms": atm_out_ms + void_ms + atm_in_ms,
            }

        hop_log.append(
            {
                "planet": planet_id,
                "role": role,
                "codex": node.codex,
                "recv_tower": recv_tower,
                "send_tower": send_tower,
                "towers_hit": towers_hit,
                "tower_delay_ms": tower_delay,
                "fiber": fiber_entry,
                "crossing": crossing_entry,
                # Raw formula inputs for frontend verification
                "radius_km": node.radius_km,
                "atmosphere_km": node.atmosphere_thickness_km,
                "refraction_n": node.refraction_index,
                "active_towers_n": node.active_towers,
                "fiber_segments_s": fiber_segments_s,
                "tower_delay_each_ms": constants.tower_delay_ms,
                "fiber_speed_fraction": constants.fiber_speed_fraction,
                "speed_of_light_kms": constants.speed_of_light_kms,
            }
        )

    total_ms = void_total + atm_total + fiber_total + tower_total

    return {
        "void_ms": void_total,
        "atmosphere_ms": atm_total,
        "fiber_ms": fiber_total,
        "tower_ms": tower_total,
        "total_ms": total_ms,
        "hop_log": hop_log,
    }
