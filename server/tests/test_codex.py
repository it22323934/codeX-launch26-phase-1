"""Codex encoding tests — the spec pins these exact values (M2).

These pass against the implemented ``engine.codex``; they are the ground truth
for the dialect-translation pipeline.
"""
from engine.codex import (
    encode_payload,
    from_base,
    to_base,
    to_binary_stream,
)


def test_to_base_spec_examples():
    assert to_base(72, 5) == "242"
    assert to_base(72, 14) == "52"


def test_encode_payload_hello_world_base5():
    assert encode_payload("Hello world", 5) == [
        "242", "401", "413", "413", "421", "112", "434", "421", "424", "413", "400",
    ]


def test_encode_payload_hello_world_base14():
    assert encode_payload("Hello world", 14) == [
        "52", "73", "7A", "7A", "7D", "24", "87", "7D", "82", "7A", "72",
    ]


def test_round_trip_all_bytes_several_bases():
    for base in (2, 5, 8, 14, 16, 36):
        for value in range(256):  # every ASCII byte
            assert from_base(to_base(value, base), base) == value


def test_binary_stream_groups_bytes_into_octets():
    # 'A' == 65 == 0100 0001, 'B' == 66 == 0100 0010
    assert to_binary_stream("AB") == "01000001 01000010"
