"""Router tests against the bundled universe (M4).

Marked ``xfail`` because ``engine.router.find_route`` is a scaffold stub. The
bundled config is shaped so these scenarios are meaningful: Aurelia↔Cindex has
two relays (Bisecta and Doppler), Echo sits past Lmax behind Cindex. Remove the
``pytestmark`` line once the router is implemented.
"""
import json
from pathlib import Path

import pytest

from engine.router import find_route
from engine.universe import UniverseState

pytestmark = pytest.mark.xfail(
    reason="engine.router.find_route is a scaffold stub", strict=False
)

CONFIG_PATH = Path(__file__).resolve().parent.parent / "universe-config.json"


def _state() -> UniverseState:
    return UniverseState.from_config(json.loads(CONFIG_PATH.read_text("utf-8")))


def test_far_pair_routes_multi_hop_within_lmax():
    result = find_route(_state(), "Aurelia", "Echo", "Hello world")
    assert result["deliverable"] is True
    assert len(result["path"]) > 2  # Aurelia and Echo are >1 Lmax apart


def test_killing_the_relay_reroutes_to_an_alternate_path():
    state = _state()
    state.set_node_alive("Bisecta", False)  # kill the direct relay
    result = find_route(state, "Aurelia", "Cindex", "Hello world")
    assert result["deliverable"] is True
    assert "Bisecta" not in result["path"]  # rerouted via Doppler


def test_killing_all_bridges_is_undeliverable_not_an_exception():
    state = _state()
    state.set_node_alive("Bisecta", False)
    state.set_node_alive("Doppler", False)  # both relays down
    result = find_route(state, "Aurelia", "Cindex", "Hello world")
    assert result["deliverable"] is False
    assert result.get("reason")


def test_unreachable_pair_never_raises():
    state = _state()
    state.set_node_alive("Cindex", False)  # isolate Echo
    # Must return a result object, not raise.
    result = find_route(state, "Aurelia", "Echo", "Hello world")
    assert result["deliverable"] is False
