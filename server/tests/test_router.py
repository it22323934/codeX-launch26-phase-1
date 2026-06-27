"""
Integration tests for engine/router.py using the bundled universe-config.json.

Topology reference (void distances and Lmax = 50,000,000 km):
  Scale = 100,000 km/unit.

  Reachable pairs (void <= Lmax):
    Aegis   ↔ Boreas   ✓  (~18 M km void)
    Aegis   ↔ Dawn     ✓  (~35 M km void)
    Aegis   ↔ Elysium  ✓  (~46 M km void)
    Aegis   ↔ Fenix    ✗  (~51 M km void — exceeds Lmax)
    Boreas  ↔ Dawn     ✓
    Boreas  ↔ Elysium  ✓
    Boreas  ↔ Fenix    ✓
    Dawn    ↔ Elysium  ✓
    Dawn    ↔ Fenix    ✓
    Dawn    ↔ Caelum   ✓
    Elysium ↔ Fenix    ✓
    Elysium ↔ Caelum   ✓
    Fenix   ↔ Caelum   ✓

  Aegis→Caelum requires at least 2 hops (e.g., Aegis→Elysium→Caelum or Aegis→Dawn→Caelum).
"""

import json
from pathlib import Path
import pytest

from engine.models import UniverseConfig
from engine.constants import resolve_constants
from engine.universe import Universe
from engine.router import find_route


CONFIG_PATH = Path(__file__).parent.parent / "universe-config.json"


@pytest.fixture
def universe():
    with open(CONFIG_PATH) as f:
        data = json.load(f)
    config = UniverseConfig(**data)
    constants = resolve_constants(config.universe_metadata)
    return Universe(config, constants)


@pytest.fixture
def constants(universe):
    return universe.constants


# ---------------------------------------------------------------------------
# Basic routing
# ---------------------------------------------------------------------------

class TestBasicRouting:
    def test_adjacent_pair_direct(self, universe, constants):
        """Aegis and Boreas are within Lmax — should route directly."""
        result = find_route("Aegis", "Boreas", "ping", universe, constants)
        assert result["deliverable"] is True
        assert result["path"] == ["Aegis", "Boreas"]

    def test_far_pair_multi_hop(self, universe, constants):
        """Aegis→Caelum requires at least 2 hops (not directly connected)."""
        result = find_route("Aegis", "Caelum", "Hello", universe, constants)
        assert result["deliverable"] is True
        assert len(result["path"]) >= 3  # at least one relay
        assert result["path"][0] == "Aegis"
        assert result["path"][-1] == "Caelum"

    def test_result_structure(self, universe, constants):
        result = find_route("Aegis", "Boreas", "test", universe, constants)
        assert "latency" in result
        assert "hop_log" in result
        assert "translation" in result
        assert "path" in result
        # Latency has all components
        lat = result["latency"]
        assert "void_ms" in lat
        assert "atmosphere_ms" in lat
        assert "fiber_ms" in lat
        assert "tower_ms" in lat
        assert "total_ms" in lat
        # total_ms = sum of components
        total = lat["void_ms"] + lat["atmosphere_ms"] + lat["fiber_ms"] + lat["tower_ms"]
        assert abs(lat["total_ms"] - total) < 1e-6

    def test_hop_log_roles(self, universe, constants):
        result = find_route("Aegis", "Caelum", "payload", universe, constants)
        assert result["deliverable"] is True
        hop_log = result["hop_log"]
        assert hop_log[0]["role"] == "origin"
        assert hop_log[-1]["role"] == "destination"
        for entry in hop_log[1:-1]:
            assert entry["role"] == "relay"

    def test_translation_stages_match_path(self, universe, constants):
        result = find_route("Aegis", "Dawn", "ABC", universe, constants)
        assert result["deliverable"] is True
        path = result["path"]
        translation = result["translation"]
        assert len(translation) == len(path)
        for stage, pid in zip(translation, path):
            assert stage["planet_id"] == pid

    def test_same_origin_destination(self, universe, constants):
        result = find_route("Aegis", "Aegis", "data", universe, constants)
        assert result["deliverable"] is True
        assert result["path"] == ["Aegis"]


# ---------------------------------------------------------------------------
# Topology changes — rerouting
# ---------------------------------------------------------------------------

class TestRerouting:
    def test_kill_relay_reroutes(self, universe, constants):
        """Killing Elysium should force reroute through another path."""
        # Verify Aegis→Caelum works normally
        before = find_route("Aegis", "Caelum", "msg", universe, constants)
        assert before["deliverable"] is True

        # Kill Elysium
        universe.set_node_alive("Elysium", False)

        after = find_route("Aegis", "Caelum", "msg", universe, constants)
        assert after["deliverable"] is True
        # Elysium must not appear in the rerouted path
        assert "Elysium" not in after["path"]

    def test_kill_two_relays_still_routes(self, universe, constants):
        """Killing Elysium and Dawn still leaves Aegis→Boreas→Fenix→Caelum."""
        universe.set_node_alive("Elysium", False)
        universe.set_node_alive("Dawn", False)

        result = find_route("Aegis", "Caelum", "msg", universe, constants)
        assert result["deliverable"] is True
        assert "Elysium" not in result["path"]
        assert "Dawn" not in result["path"]
        # Expected path: Aegis → Boreas → Fenix → Caelum
        assert result["path"] == ["Aegis", "Boreas", "Fenix", "Caelum"]

    def test_kill_all_bridges_returns_not_deliverable(self, universe, constants):
        """
        Killing Elysium, Dawn, AND Fenix leaves Aegis only able to reach Boreas.
        Boreas→Caelum void distance exceeds Lmax, so no route is possible.
        """
        universe.set_node_alive("Elysium", False)
        universe.set_node_alive("Dawn", False)
        universe.set_node_alive("Fenix", False)

        result = find_route("Aegis", "Caelum", "msg", universe, constants)
        assert result["deliverable"] is False
        assert "reason" in result
        assert result["reason"] is not None

    def test_kill_link_reroutes(self, universe, constants):
        """Killing the Aegis-Elysium link forces a different path."""
        before = find_route("Aegis", "Caelum", "x", universe, constants)
        assert before["deliverable"] is True

        universe.set_link_alive("Aegis", "Elysium", False)
        after = find_route("Aegis", "Caelum", "x", universe, constants)
        # Should still be deliverable through Dawn
        assert after["deliverable"] is True
        # Consecutive Aegis→Elysium should not appear
        path = after["path"]
        for i in range(len(path) - 1):
            pair = {path[i], path[i + 1]}
            assert pair != {"Aegis", "Elysium"}


# ---------------------------------------------------------------------------
# Failure cases — never raises
# ---------------------------------------------------------------------------

class TestFailureCases:
    def test_unknown_origin_returns_not_deliverable(self, universe, constants):
        result = find_route("NoSuchPlanet", "Aegis", "x", universe, constants)
        assert result["deliverable"] is False
        assert "reason" in result

    def test_unknown_destination_returns_not_deliverable(self, universe, constants):
        result = find_route("Aegis", "NoSuchPlanet", "x", universe, constants)
        assert result["deliverable"] is False

    def test_dead_origin_returns_not_deliverable(self, universe, constants):
        universe.set_node_alive("Aegis", False)
        result = find_route("Aegis", "Caelum", "x", universe, constants)
        assert result["deliverable"] is False

    def test_dead_destination_returns_not_deliverable(self, universe, constants):
        universe.set_node_alive("Caelum", False)
        result = find_route("Aegis", "Caelum", "x", universe, constants)
        assert result["deliverable"] is False

    def test_completely_isolated_never_raises(self, universe, constants):
        """Kill all nodes except Aegis and Caelum — never raises, returns False."""
        for node in ["Boreas", "Dawn", "Elysium", "Fenix"]:
            universe.set_node_alive(node, False)
        result = find_route("Aegis", "Caelum", "x", universe, constants)
        # Should not raise; Aegis↔Caelum void >> Lmax
        assert isinstance(result, dict)
        assert result["deliverable"] is False

    def test_returns_dict_on_any_failure(self, universe, constants):
        """Verify router never raises regardless of topology state."""
        universe.set_node_alive("Boreas", False)
        universe.set_node_alive("Dawn", False)
        universe.set_link_alive("Aegis", "Elysium", False)
        result = find_route("Aegis", "Caelum", "test", universe, constants)
        assert isinstance(result, dict)
        assert "deliverable" in result


# ---------------------------------------------------------------------------
# Latency ordering
# ---------------------------------------------------------------------------

class TestLatencyOrdering:
    def test_direct_path_lower_latency_than_relay(self, universe, constants):
        """Boreas→Caelum is not directly reachable; any relay adds latency."""
        # Aegis→Boreas is direct (2 nodes), should have lower total_ms than 3-hop paths
        direct = find_route("Aegis", "Boreas", "x", universe, constants)
        relay = find_route("Aegis", "Caelum", "x", universe, constants)
        assert direct["deliverable"] is True
        assert relay["deliverable"] is True
        # Caelum is farther → higher latency
        assert relay["latency"]["total_ms"] > direct["latency"]["total_ms"]
