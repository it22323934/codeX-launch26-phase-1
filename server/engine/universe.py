"""Live universe state: validated nodes, failure tracking, topology, snapshot.

Holds the parsed config in memory and the mutable failure state (dead nodes /
dead links) that persists across API requests. Topology and the enriched
snapshot are derived from ``engine.geometry`` + the resolved
``engine.constants`` — no planetary value is hardcoded here; everything comes
from the config.
"""
from __future__ import annotations

from engine.constants import Constants, resolve_constants
from engine.geometry import planet_center_km, tower_world_km, void_distance_km
from engine.models import Node, Universe


def link_key(a: str, b: str) -> frozenset[str]:
    """Order-independent key for an undirected link between two node ids."""
    return frozenset((a, b))


class UniverseState:
    """One live universe. Construct via :meth:`from_config` from raw JSON."""

    def __init__(self, universe: Universe) -> None:
        ids = [n.id for n in universe.nodes]
        dupes = sorted({i for i in ids if ids.count(i) > 1})
        if dupes:
            raise ValueError(f"duplicate node ids in config: {dupes}")

        self.nodes: dict[str, Node] = {n.id: n for n in universe.nodes}
        self.constants: Constants = resolve_constants(
            universe.universe_metadata.as_overrides()
        )
        self.dead_nodes: set[str] = set()
        self.dead_links: set[frozenset[str]] = set()

    @classmethod
    def from_config(cls, config: dict) -> "UniverseState":
        """Validate a raw config mapping (raises ``ValidationError`` if bad)."""
        return cls(Universe.model_validate(config))

    # --- liveness -----------------------------------------------------------

    def _require(self, node_id: str) -> None:
        if node_id not in self.nodes:
            raise KeyError(f"unknown node id: {node_id!r}")

    def is_node_alive(self, node_id: str) -> bool:
        return node_id not in self.dead_nodes

    def is_link_alive(self, a: str, b: str) -> bool:
        return link_key(a, b) not in self.dead_links

    def set_node_alive(self, node_id: str, alive: bool) -> None:
        self._require(node_id)
        self.dead_nodes.discard(node_id) if alive else self.dead_nodes.add(node_id)

    def set_link_alive(self, a: str, b: str, alive: bool) -> None:
        self._require(a)
        self._require(b)
        key = link_key(a, b)
        self.dead_links.discard(key) if alive else self.dead_links.add(key)

    def reset(self) -> None:
        """Revive every node and link."""
        self.dead_nodes.clear()
        self.dead_links.clear()

    # --- topology -----------------------------------------------------------

    @property
    def _scale(self) -> float:
        return self.constants.coordinate_scale_unit_km

    def within_lmax(self, a_id: str, b_id: str) -> bool:
        """Geometric reachability: void gap ≤ Lmax (ignores liveness)."""
        return (
            void_distance_km(self.nodes[a_id], self.nodes[b_id], self._scale)
            <= self.constants.lmax_km
        )

    def can_link(self, a_id: str, b_id: str) -> bool:
        """A usable routing edge right now: both alive, link up, within Lmax."""
        return (
            a_id != b_id
            and self.is_node_alive(a_id)
            and self.is_node_alive(b_id)
            and self.is_link_alive(a_id, b_id)
            and self.within_lmax(a_id, b_id)
        )

    def neighbours(self, node_id: str) -> list[str]:
        """Ids reachable from ``node_id`` by a single live, in-range void hop."""
        self._require(node_id)
        return [other for other in self.nodes if self.can_link(node_id, other)]

    def topology(self) -> list[dict]:
        """Every geometric pair within Lmax, with void distance and live flag."""
        ids = list(self.nodes)
        edges: list[dict] = []
        for i, a in enumerate(ids):
            for b in ids[i + 1:]:
                if not self.within_lmax(a, b):
                    continue
                edges.append(
                    {
                        "a": a,
                        "b": b,
                        "void_km": void_distance_km(
                            self.nodes[a], self.nodes[b], self._scale
                        ),
                        "alive": self.can_link(a, b),
                    }
                )
        return edges

    # --- API snapshot -------------------------------------------------------

    def _node_snapshot(self, node: Node) -> dict:
        cx, cy = planet_center_km(node, self._scale)
        towers = [
            dict(zip(("k", "x", "y"), (k, *tower_world_km(node, k, self._scale))))
            for k in range(node.active_towers)
        ]
        return {
            **node.model_dump(),
            "center_km": {"x": cx, "y": cy},
            "towers": towers,
            "alive": self.is_node_alive(node.id),
        }

    def snapshot(self) -> dict:
        """Enriched view for the frontend: nodes (+tower world coords +alive),
        edges (+alive), and the resolved constants used for layout/labels."""
        return {
            "nodes": [self._node_snapshot(n) for n in self.nodes.values()],
            "edges": self.topology(),
            "constants": {
                "speed_of_light_kms": self.constants.speed_of_light_kms,
                "fiber_speed_fraction": self.constants.fiber_speed_fraction,
                "tower_delay_ms": self.constants.tower_delay_ms,
                "lmax_km": self.constants.lmax_km,
                "coordinate_scale_unit_km": self.constants.coordinate_scale_unit_km,
            },
        }
