"""Latency model — four physical components, all results in milliseconds.

    Void        T_v = L / c
    Atmosphere  T_a = (h · n) / c          # light slows to c/n through shell h
    Fiber       T_f = (R · Δθ) / (0.67·c)  # relay planets only
    Tower       T_t = TOWER_DELAY_MS · (distinct towers hit)

Accounting rules (graded for accuracy — implement precisely):

  * Atmosphere is per void crossing, BOTH ends: each crossing a→b adds
    T_a(a) + T_a(b). An intermediate planet therefore pays its shell twice
    (once arriving, once departing).
  * Tower count dedups per planet: origin = send tower only (1);
    destination = receive tower only (1); a relay hits {receive, send} → 2,
    or 1 if those are the same tower.
  * Fiber only on relays: the surface arc from the receive tower to the send
    tower. Origin and destination have no internal arc.

Constants are pulled from the resolved :class:`engine.constants.Constants`;
geometry (void distance, tower pairing, fiber arc) comes from
``engine.geometry``. The pieces this composes are already implemented — see the
``constants-config-discipline`` skill: never reintroduce c / 0.67 / 7 as
literals here, read them from ``constants``.

STATUS: documented stub. Implement per PROMPT_backend_math_engine.md
("Latency model"). ``test_latency.py`` encodes the target assertions.
"""
from __future__ import annotations

from engine.constants import Constants
from engine.models import Node


def compute_path_latency(path: list[Node], constants: Constants) -> dict:
    """Total a concrete ordered ``path`` into its four-component latency.

    Args:
        path: planets in travel order ``[origin, relay…, destination]``.
        constants: resolved physical constants for this universe.

    Returns:
        A dict shaped as::

            {
              "void_ms": float, "atmosphere_ms": float,
              "fiber_ms": float, "tower_ms": float, "total_ms": float,
              "hop_log": [ {                       # one entry per planet
                  "planet": str, "role": "origin"|"relay"|"destination",
                  "codex": int, "recv_tower": int|None, "send_tower": int|None,
                  "towers_hit": int, "tower_delay_ms": float,
                  "fiber": {"arc_km": float, "ms": float} | None,
                  "crossing": {                    # to the next planet, or None
                      "to": str, "atmosphere_out_ms": float,
                      "void_km": float, "void_ms": float,
                      "atmosphere_in_ms": float, "total_ms": float,
                  } | None,
              } ],
            }

    ``total_ms`` MUST equal ``void_ms + atmosphere_ms + fiber_ms + tower_ms``.
    """
    raise NotImplementedError(
        "compute_path_latency: implement the 4-component model + hop_log "
        "per PROMPT_backend_math_engine.md. Read c/fiber/tower from `constants`; "
        "use engine.geometry for void distance, tower pairing, and fiber arcs."
    )
