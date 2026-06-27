"""
Universe — mutable topology state wrapping an immutable UniverseConfig.

Nodes and links can be toggled dead/alive at runtime without mutating the config.
"""

from engine.models import UniverseConfig, Node
from engine.constants import Constants
from engine.geometry import void_distance_km, planet_center_km, tower_position


class Universe:
    def __init__(self, config: UniverseConfig, constants: Constants) -> None:
        self.config = config
        self.constants = constants
        self._dead_nodes: set[str] = set()
        self._dead_links: set[frozenset] = set()

    # ------------------------------------------------------------------
    # Alive state management
    # ------------------------------------------------------------------

    def set_node_alive(self, node_id: str, alive: bool) -> None:
        if alive:
            self._dead_nodes.discard(node_id)
        else:
            self._dead_nodes.add(node_id)

    def set_link_alive(self, a: str, b: str, alive: bool) -> None:
        link: frozenset = frozenset([a, b])
        if alive:
            self._dead_links.discard(link)
        else:
            self._dead_links.add(link)

    def is_node_alive(self, node_id: str) -> bool:
        return node_id not in self._dead_nodes

    def is_link_alive(self, a: str, b: str) -> bool:
        return frozenset([a, b]) not in self._dead_links

    def reset(self) -> None:
        """Revive all nodes and links."""
        self._dead_nodes.clear()
        self._dead_links.clear()

    # ------------------------------------------------------------------
    # Topology queries
    # ------------------------------------------------------------------

    def neighbours(self, node_id: str) -> list[str]:
        """Return alive node ids reachable from node_id within Lmax (link and node alive)."""
        if not self.is_node_alive(node_id):
            return []
        nodes_map = {n.id: n for n in self.config.nodes}
        if node_id not in nodes_map:
            return []
        source = nodes_map[node_id]
        scale = self.constants.coordinate_scale_unit_km
        result: list[str] = []
        for n in self.config.nodes:
            if n.id == node_id:
                continue
            if not self.is_node_alive(n.id):
                continue
            if not self.is_link_alive(node_id, n.id):
                continue
            d = void_distance_km(source, n, scale)
            if d <= self.constants.lmax_km:
                result.append(n.id)
        return result

    def topology(self) -> list[dict]:
        """All unordered pairs of nodes within Lmax, regardless of alive state."""
        nodes_map = {n.id: n for n in self.config.nodes}
        scale = self.constants.coordinate_scale_unit_km
        node_ids = [n.id for n in self.config.nodes]
        pairs: list[dict] = []
        for i in range(len(node_ids)):
            for j in range(i + 1, len(node_ids)):
                a_id, b_id = node_ids[i], node_ids[j]
                d = void_distance_km(nodes_map[a_id], nodes_map[b_id], scale)
                if d <= self.constants.lmax_km:
                    pairs.append({"a": a_id, "b": b_id, "void_km": d})
        return pairs

    def snapshot(self) -> dict:
        """
        Full universe snapshot with tower world-coordinates, alive flags on nodes
        and edges.

        Node entry keys: id, codex, x, y, radius_km, active_towers,
            atmosphere_thickness_km, refraction_index, alive, tower_positions.
        tower_positions: list of {x, y, index}.
        Edge entry keys: a, b, void_km, alive.
        """
        scale = self.constants.coordinate_scale_unit_km
        nodes_map = {n.id: n for n in self.config.nodes}

        node_list: list[dict] = []
        for n in self.config.nodes:
            cx, cy = planet_center_km(n, scale)
            towers = [
                {"x": tower_position(n, k, cx, cy)[0], "y": tower_position(n, k, cx, cy)[1], "index": k}
                for k in range(n.active_towers)
            ]
            node_list.append(
                {
                    "id": n.id,
                    "codex": n.codex,
                    "x": n.x,
                    "y": n.y,
                    "radius_km": n.radius_km,
                    "active_towers": n.active_towers,
                    "atmosphere_thickness_km": n.atmosphere_thickness_km,
                    "refraction_index": n.refraction_index,
                    "alive": self.is_node_alive(n.id),
                    "tower_positions": towers,
                }
            )

        node_ids = [n.id for n in self.config.nodes]
        edge_list: list[dict] = []
        for i in range(len(node_ids)):
            for j in range(i + 1, len(node_ids)):
                a_id, b_id = node_ids[i], node_ids[j]
                d = void_distance_km(nodes_map[a_id], nodes_map[b_id], scale)
                if d <= self.constants.lmax_km:
                    edge_list.append(
                        {
                            "a": a_id,
                            "b": b_id,
                            "void_km": d,
                            "alive": self.is_link_alive(a_id, b_id),
                        }
                    )

        return {
            "system_name": self.config.universe_metadata.system_name,
            "nodes": node_list,
            "edges": edge_list,
        }
