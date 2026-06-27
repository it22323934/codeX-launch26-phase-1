"""
Planetary codex encoding/decoding.

Digit alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' (uppercase only).
A = 10, B = 11, ..., Z = 35.  Supports bases 2–36.

Spec test vectors (verified):
  to_base(72, 5)  == "242"   (72 = 2·25 + 4·5 + 2)
  to_base(72, 14) == "52"    (72 = 5·14 + 2)
  encode_payload(b"Hello world", 5)  == ["242","401","413","413","421","112","434","421","424","413","400"]
  encode_payload(b"Hello world", 14) == ["52","73","7A","7A","7D","24","87","7D","82","7A","72"]
"""

DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def to_base(value: int, base: int) -> str:
    """Convert a non-negative integer to its base-N string representation."""
    if not (2 <= base <= 36):
        raise ValueError(f"base must be 2–36, got {base}")
    if value < 0:
        raise ValueError("value must be non-negative")
    if value == 0:
        return "0"
    digits: list[str] = []
    while value > 0:
        digits.append(DIGITS[value % base])
        value //= base
    return "".join(reversed(digits))


def from_base(s: str, base: int) -> int:
    """Parse a base-N string back to an integer."""
    if not (2 <= base <= 36):
        raise ValueError(f"base must be 2–36, got {base}")
    result = 0
    for ch in s.upper():
        idx = DIGITS.index(ch)
        if idx >= base:
            raise ValueError(f"digit '{ch}' is out of range for base {base}")
        result = result * base + idx
    return result


def encode_payload(ascii_bytes: bytes, base: int) -> list[str]:
    """Encode each byte of ascii_bytes as its integer value in base-N."""
    return [to_base(b, base) for b in ascii_bytes]


def to_binary_stream(ascii_bytes: bytes) -> str:
    """Return space-separated 8-bit zero-padded binary groups for each byte."""
    return " ".join(bin(b)[2:].zfill(8) for b in ascii_bytes)


def build_translation_log(text: str, planets: list[dict]) -> list[dict]:
    """
    Build per-planet codex translation stages reflecting the full transmission flow:
      binary arrives → decode to base-N → ASCII → encode to next base → binary leaves

    Each entry contains:
      planet_id       - the planet's id
      codex           - this planet's numerical base
      received_binary - base-2 stream that arrived through the void (None at origin)
      received_as     - payload decoded into this planet's codex (list[str])
      ascii           - the human-readable text (internal ASCII routing)
      next_codex      - the base of the next planet (None at destination)
      sent_as         - payload re-encoded in next planet's codex (None at destination)
      binary_stream   - base-2 stream fired into the void toward next planet (None at destination)
    """
    ascii_bytes = text.encode("ascii")
    log: list[dict] = []

    for i, planet in enumerate(planets):
        current_base = planet["codex"]
        is_origin      = i == 0
        is_destination = i == len(planets) - 1

        received_as = encode_payload(ascii_bytes, current_base)

        # Incoming binary: the laser stream that arrived at this planet from the previous one.
        # The origin generates the message locally — nothing arrives through the void.
        received_binary: str | None = None if is_origin else to_binary_stream(ascii_bytes)

        if not is_destination:
            next_codex: int | None  = planets[i + 1]["codex"]
            sent_as: list[str] | None = encode_payload(ascii_bytes, next_codex)
            binary_stream: str | None = to_binary_stream(ascii_bytes)
        else:
            next_codex    = None
            sent_as       = None
            binary_stream = None  # destination receives only — nothing transmitted onward

        log.append(
            {
                "planet_id":       planet["id"],
                "codex":           current_base,
                "received_binary": received_binary,
                "received_as":     received_as,
                "ascii":           text,
                "next_codex":      next_codex,
                "sent_as":         sent_as,
                "binary_stream":   binary_stream,
            }
        )

    return log
