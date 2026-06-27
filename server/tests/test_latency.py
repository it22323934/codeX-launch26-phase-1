"""Latency-model tests (M3).

Marked ``xfail`` because ``engine.latency.compute_path_latency`` is a scaffold
stub. They encode the spec's accounting so that filling in the model is a
matter of going green. Remove the ``pytestmark`` line once implemented.
"""
import pytest

from engine.constants import resolve_constants
from engine.geometry import void_distance_km
from engine.latency import compute_path_latency
from engine.models import Node

# Whole module pends on the latency stub.
pytestmark = pytest.mark.xfail(
    reason="engine.latency.compute_path_latency is a scaffold stub", strict=False
)

SEC_TO_MS = 1000.0


def _node(node_id: str, x: float, y: float, **over) -> Node:
    base = dict(
        codex=10, x=x, y=y, radius_km=400_000, active_towers=6,
        atmosphere_thickness_km=60_000, refraction_index=1.0,
    )
    base.update(over)
    return Node(id=node_id, **base)


def test_void_term_equals_L_over_c():
    c = resolve_constants()
    a, b = _node("A", 0, 0), _node("B", 300, 0)
    L = void_distance_km(a, b, c.coordinate_scale_unit_km)
    result = compute_path_latency([a, b], c)
    assert result["void_ms"] == pytest.approx(L / c.speed_of_light_kms * SEC_TO_MS)


def test_atmosphere_uses_h_times_n_over_c_both_ends():
    c = resolve_constants()
    a = _node("A", 0, 0, refraction_index=1.2)
    b = _node("B", 300, 0, refraction_index=1.4)
    result = compute_path_latency([a, b], c)
    expected = (
        (a.atmosphere_thickness_km * a.refraction_index
         + b.atmosphere_thickness_km * b.refraction_index)
        / c.speed_of_light_kms * SEC_TO_MS
    )
    assert result["atmosphere_ms"] == pytest.approx(expected)


def test_tower_ms_is_consistent_with_towers_hit():
    c = resolve_constants()
    path = [_node("A", 0, 0), _node("B", 300, 0), _node("C", 600, 0)]
    result = compute_path_latency(path, c)
    hit = sum(hop["towers_hit"] for hop in result["hop_log"])
    # A relay where recv and send towers coincide must count 1, not 2.
    assert result["tower_ms"] == pytest.approx(hit * c.tower_delay_ms)


def test_total_is_the_component_sum():
    c = resolve_constants()
    path = [_node("A", 0, 0), _node("B", 300, 0)]
    r = compute_path_latency(path, c)
    assert r["total_ms"] == pytest.approx(
        r["void_ms"] + r["atmosphere_ms"] + r["fiber_ms"] + r["tower_ms"]
    )
