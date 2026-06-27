"""Lowest-latency router — Lmax-aware and failure-aware.

A relay planet's internal cost (its fiber arc + tower dedup) depends on BOTH
the planet it arrived from (which fixes the receive tower) and the planet it
departs to (which fixes the send tower). A plain weighted graph over planets is
therefore wrong. Run **Dijkstra over expanded states ``(prev_planet,
current_planet)``** with a binary heap (``heapq``):

    edge (prev, cur) → (cur, next)
        = internal(prev, cur, next)      # cur's fiber arc + tower delays
        + crossing(cur, next)            # atmosphere_out + void + atmosphere_in
    start    (None, origin) → each neighbour
    terminal arrive (prev, destination)  # add destination's receive-tower delay

An edge between two planets exists only if BOTH nodes are alive, the link is
up, and ``void_distance_km ≤ Lmax`` — i.e. exactly ``UniverseState.neighbours``.
If no terminal state is reachable, return ``{"deliverable": False, "reason": …}``
— never raise.

STATUS: documented stub. Implement per PROMPT_backend_math_engine.md
("Router"). Compose ``engine.latency`` for edge weights and ``engine.codex``
(``build_translation_log``) for the per-hop dialect proof. ``test_router.py``
encodes the target assertions.
"""
from __future__ import annotations

from engine.universe import UniverseState


def find_route(
    state: UniverseState, origin_id: str, destination_id: str, payload: str
) -> dict:
    """Compute the lowest-latency deliverable route, or report why none exists.

    Returns a dict with: ``deliverable`` (bool), ``origin_id``,
    ``destination_id``, ``payload``, ``path`` (list of planet ids), ``hop_log``,
    ``latency`` (component totals from :func:`engine.latency.compute_path_latency`),
    and ``translation`` (from :func:`engine.codex.build_translation_log`).
    When undeliverable: ``{"deliverable": False, "reason": <str>, ...}``.
    """
    raise NotImplementedError(
        "find_route: implement Dijkstra over (prev, current) expanded states "
        "per PROMPT_backend_math_engine.md. Use state.neighbours for valid edges, "
        "engine.latency for weights, and return deliverable:false (never raise) "
        "when the destination is unreachable."
    )
