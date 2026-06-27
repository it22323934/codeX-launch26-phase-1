"""
Dijkstra routing over expanded states (prev_planet_id, cur_planet_id).

Expanded states are required because the relay cost at a planet depends on
BOTH which neighbor you came from (determines recv_tower) AND which neighbor
you go to next (determines send_tower).  A plain node-based Dijkstra would
pick the wrong tower assignments and compute incorrect fiber/tower costs.

Edge cost breakdown
-------------------
Transition (prev, cur) -> (cur, next):

  internal_at_cur:
    - recv_tower = closest_tower_pair(prev, cur)[1]
    - send_tower = closest_tower_pair(cur, next)[0]
    - towers_hit = 1 if recv==send else 2
    - fiber_ms   = 0 if recv==send else arc_km / (fiber_frac * c) * 1000
    - tower_ms   = tower_delay_ms * towers_hit

  crossing(cur -> next):
    - atm_out_ms = h_cur * n_cur / c * 1000
    - void_ms    = void_km(cur, next) / c * 1000
    - atm_in_ms  = h_next * n_next / c * 1000

  edge_cost = internal_at_cur + atm_out_ms + void_ms + atm_in_ms

Initial edges  (None, origin) -> (origin, nb):
  cost = tower_delay_ms * 1  [origin send tower]
       + atm_out(origin) + void_ms + atm_in(nb)

Terminal cost  arriving at destination:
  + tower_delay_ms * 1  [destination recv tower]
"""

from __future__ import annotations

import heapq
from typing import TYPE_CHECKING

from engine.constants import Constants
from engine.codex import build_translation_log
from engine.geometry import closest_tower_pair, void_distance_km, fiber_arc_length_km
from engine.latency import compute_path_latency

if TYPE_CHECKING:
    from engine.universe import Universe


def _atm_ms(node, constants: Constants) -> float:
    return node.atmosphere_thickness_km * node.refraction_index / constants.speed_of_light_kms * 1000.0


def _void_ms(void_km: float, constants: Constants) -> float:
    return void_km / constants.speed_of_light_kms * 1000.0


def find_route(
    origin_id: str,
    destination_id: str,
    payload: str,
    universe: "Universe",
    constants: Constants,
) -> dict:
    """
    Find the lowest-latency route from origin_id to destination_id.

    Returns a rich result dict.  Never raises — returns deliverable=False on failure.
    """
    nodes = {n.id: n for n in universe.config.nodes}
    scale = constants.coordinate_scale_unit_km

    # --- Validation ---
    if origin_id not in nodes:
        return {"deliverable": False, "reason": f"Unknown origin: {origin_id!r}"}
    if destination_id not in nodes:
        return {"deliverable": False, "reason": f"Unknown destination: {destination_id!r}"}
    if not universe.is_node_alive(origin_id):
        return {"deliverable": False, "reason": f"Origin node {origin_id!r} is dead"}
    if not universe.is_node_alive(destination_id):
        return {"deliverable": False, "reason": f"Destination node {destination_id!r} is dead"}

    # --- Trivial same-planet case ---
    if origin_id == destination_id:
        latency = compute_path_latency([origin_id], universe, constants)
        planet_dicts = [{"id": nodes[origin_id].id, "codex": nodes[origin_id].codex}]
        translation = build_translation_log(payload, planet_dicts)
        return {
            "deliverable": True,
            "reason": None,
            "origin_id": origin_id,
            "destination_id": destination_id,
            "payload": payload,
            "path": [origin_id],
            "latency": {k: v for k, v in latency.items() if k != "hop_log"},
            "hop_log": latency["hop_log"],
            "translation": translation,
        }

    origin_node = nodes[origin_id]

    # Heap entries: (cost_float, tie_break_int, state_tuple, path_list)
    # tie_break avoids comparing lists when costs are equal.
    heap: list[tuple[float, int, tuple, list]] = []
    _counter = 0

    def push(cost: float, state: tuple, path: list) -> None:
        nonlocal _counter
        heapq.heappush(heap, (cost, _counter, state, path))
        _counter += 1

    # Seed: (None, origin) -> (origin, nb)
    for nb_id in universe.neighbours(origin_id):
        nb_node = nodes[nb_id]
        void_km = void_distance_km(origin_node, nb_node, scale)
        if void_km > constants.lmax_km:
            continue

        # Origin contributes 1 send tower
        tower_cost = constants.tower_delay_ms * 1
        edge_cost = (
            tower_cost
            + _atm_ms(origin_node, constants)
            + _void_ms(void_km, constants)
            + _atm_ms(nb_node, constants)
        )
        push(edge_cost, (origin_id, nb_id), [origin_id, nb_id])

    visited: set[tuple] = set()

    while heap:
        cost, _, state, path = heapq.heappop(heap)
        prev_id, cur_id = state

        if state in visited:
            continue
        visited.add(state)

        cur_node = nodes[cur_id]

        # --- Terminal check ---
        if cur_id == destination_id:
            # Add destination's recv-tower delay
            final_cost = cost + constants.tower_delay_ms * 1  # noqa: F841 (kept for clarity)

            latency = compute_path_latency(path, universe, constants)
            planet_dicts = [{"id": nodes[p].id, "codex": nodes[p].codex} for p in path]
            translation = build_translation_log(payload, planet_dicts)

            return {
                "deliverable": True,
                "reason": None,
                "origin_id": origin_id,
                "destination_id": destination_id,
                "payload": payload,
                "path": path,
                "latency": {k: v for k, v in latency.items() if k != "hop_log"},
                "hop_log": latency["hop_log"],
                "translation": translation,
            }

        # --- Expand neighbours ---
        prev_node = nodes[prev_id]

        for nb_id in universe.neighbours(cur_id):
            new_state = (cur_id, nb_id)
            if new_state in visited:
                continue

            nb_node = nodes[nb_id]
            void_km = void_distance_km(cur_node, nb_node, scale)
            if void_km > constants.lmax_km:
                continue

            # Tower assignment at cur (relay)
            _, recv_t = closest_tower_pair(prev_node, cur_node, scale)
            send_t, _ = closest_tower_pair(cur_node, nb_node, scale)

            if recv_t == send_t:
                towers_hit = 1
                fiber_ms = 0.0
            else:
                towers_hit = 2
                arc_km = fiber_arc_length_km(cur_node, recv_t, send_t)
                fiber_ms = arc_km / (constants.fiber_speed_fraction * constants.speed_of_light_kms) * 1000.0

            tower_cost = constants.tower_delay_ms * towers_hit

            crossing_ms = (
                _atm_ms(cur_node, constants)
                + _void_ms(void_km, constants)
                + _atm_ms(nb_node, constants)
            )

            edge_cost = tower_cost + fiber_ms + crossing_ms
            push(cost + edge_cost, new_state, path + [nb_id])

    return {
        "deliverable": False,
        "reason": f"No route from {origin_id!r} to {destination_id!r} — all paths blocked or exceed Lmax",
    }
