"""
Tests for engine/codex.py

Spec test vectors verified manually:
  H=72  → base-5: 72 = 2*25 + 4*5 + 2 = "242"
           base-14: 72 = 5*14 + 2   = "52"
  e=101 → base-5: 101 = 4*25 + 0*5 + 1 = "401"
  l=108 → base-5: 108 = 4*25 + 1*5 + 3 = "413"
  o=111 → base-5: 111 = 4*25 + 2*5 + 1 = "421"
  " "=32 → base-5: 32 = 1*25 + 1*5 + 2 = "112"
  w=119 → base-5: 119 = 4*25 + 3*5 + 4 = "434"
  r=114 → base-5: 114 = 4*25 + 2*5 + 4 = "424"
  d=100 → base-5: 100 = 4*25 + 0*5 + 0 = "400"
"""

import pytest
from engine.codex import to_base, from_base, encode_payload, to_binary_stream, build_translation_log


class TestToBase:
    def test_zero(self):
        assert to_base(0, 10) == "0"

    def test_to_base_5_72(self):
        assert to_base(72, 5) == "242"

    def test_to_base_14_72(self):
        assert to_base(72, 14) == "52"

    def test_base_2(self):
        assert to_base(255, 2) == "11111111"

    def test_base_16_values(self):
        assert to_base(10, 16) == "A"
        assert to_base(16, 16) == "10"
        assert to_base(255, 16) == "FF"

    def test_base_36(self):
        assert to_base(35, 36) == "Z"
        assert to_base(36, 36) == "10"

    def test_invalid_base_raises(self):
        with pytest.raises(ValueError):
            to_base(5, 1)
        with pytest.raises(ValueError):
            to_base(5, 37)

    def test_negative_raises(self):
        with pytest.raises(ValueError):
            to_base(-1, 10)


class TestFromBase:
    def test_from_base_5(self):
        assert from_base("242", 5) == 72

    def test_from_base_14(self):
        assert from_base("52", 14) == 72

    def test_from_base_hex(self):
        assert from_base("FF", 16) == 255
        assert from_base("ff", 16) == 255  # lowercase accepted

    def test_from_base_2(self):
        assert from_base("11111111", 2) == 255

    def test_invalid_digit_raises(self):
        with pytest.raises(ValueError):
            from_base("9", 2)  # 9 is not a valid base-2 digit


class TestEncodePayload:
    def test_hello_world_base5(self):
        result = encode_payload(b"Hello world", 5)
        expected = ["242", "401", "413", "413", "421", "112", "434", "421", "424", "413", "400"]
        assert result == expected

    def test_hello_world_base14(self):
        result = encode_payload(b"Hello world", 14)
        expected = ["52", "73", "7A", "7A", "7D", "24", "87", "7D", "82", "7A", "72"]
        assert result == expected

    def test_empty(self):
        assert encode_payload(b"", 10) == []

    def test_single_null(self):
        assert encode_payload(b"\x00", 16) == ["0"]


class TestRoundTrip:
    def test_round_trip_all_bytes_and_bases(self):
        for v in range(0, 256):
            for base in [2, 5, 8, 10, 14, 16, 36]:
                encoded = to_base(v, base)
                assert from_base(encoded, base) == v, (
                    f"Round-trip failed: to_base({v}, {base}) = {encoded!r}, "
                    f"from_base({encoded!r}, {base}) = {from_base(encoded, base)}"
                )


class TestBinaryStream:
    def test_hello(self):
        result = to_binary_stream(b"H")
        assert result == "01001000"  # 72 in 8-bit binary

    def test_multiple_bytes(self):
        result = to_binary_stream(b"Hi")
        parts = result.split(" ")
        assert len(parts) == 2
        assert parts[0] == "01001000"  # H = 72
        assert parts[1] == "01101001"  # i = 105

    def test_zero_byte(self):
        assert to_binary_stream(b"\x00") == "00000000"

    def test_max_byte(self):
        assert to_binary_stream(b"\xff") == "11111111"


class TestBuildTranslationLog:
    def test_single_planet(self):
        planets = [{"id": "Aegis", "codex": 8}]
        log = build_translation_log("Hi", planets)
        assert len(log) == 1
        assert log[0]["planet_id"] == "Aegis"
        assert log[0]["ascii"] == "Hi"
        assert log[0]["sent_as"] is None
        assert isinstance(log[0]["received_as"], list)
        assert isinstance(log[0]["binary_stream"], str)

    def test_two_planets_encoding(self):
        planets = [{"id": "A", "codex": 8}, {"id": "B", "codex": 16}]
        log = build_translation_log("A", planets)
        assert len(log) == 2
        # Origin received_as in base 8; sent_as in base 16 (B's codex)
        assert log[0]["received_as"] == encode_payload(b"A", 8)
        assert log[0]["sent_as"] == encode_payload(b"A", 16)
        # Destination received_as in base 16; sent_as is None
        assert log[1]["received_as"] == encode_payload(b"A", 16)
        assert log[1]["sent_as"] is None
