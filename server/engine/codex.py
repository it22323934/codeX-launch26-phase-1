"""Codex (number-base) encoding between planetary dialects.

Pipeline per the spec:

    Raw → next-hop codex → binary stream → void → receiver reads its codex
        → decode to ASCII internally

Each planet receives a payload in **its own** base; before beaming onward a
sender re-encodes the ASCII payload into the **next hop's** base. Bases run
2–36 using digits ``0-9A-Z`` (so ``A`` == 10).

Fully implemented: the spec pins exact expected outputs (see ``test_codex.py``).
"""
from __future__ import annotations

# Digit alphabet for bases up to 36. Index == digit value (so 'A' == 10).
# True invariant of the base-N encoding; defined once, used by both directions.
DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

# ASCII payloads are one byte per character; the over-the-void stream groups
# bits in bytes. Width of one ASCII byte — invariant, not a tunable.
BITS_PER_BYTE = 8

MIN_BASE = 2
MAX_BASE = len(DIGITS)  # 36


def _check_base(base: int) -> None:
    if not (MIN_BASE <= base <= MAX_BASE):
        raise ValueError(f"base must be in [{MIN_BASE}, {MAX_BASE}], got {base}")


def to_base(value: int, base: int) -> str:
    """Render a non-negative integer in ``base`` using ``DIGITS``.

    >>> to_base(72, 5)
    '242'
    >>> to_base(72, 14)
    '52'
    """
    _check_base(base)
    if value < 0:
        raise ValueError("to_base expects a non-negative value")
    if value == 0:
        return DIGITS[0]
    out: list[str] = []
    while value:
        value, rem = divmod(value, base)
        out.append(DIGITS[rem])
    return "".join(reversed(out))


def from_base(text: str, base: int) -> int:
    """Parse a ``base``-N string (digits ``0-9A-Z``, case-insensitive) to int.

    Round-trips with :func:`to_base`: ``from_base(to_base(v, b), b) == v``.
    """
    _check_base(base)
    value = 0
    for ch in text.upper():
        digit = DIGITS.find(ch)
        if digit < 0 or digit >= base:
            raise ValueError(f"invalid digit {ch!r} for base {base}")
        value = value * base + digit
    return value


def ascii_bytes(text: str) -> bytes:
    """Encode text as ASCII bytes, rejecting non-ASCII so codices stay 0–255."""
    return text.encode("ascii")


def encode_payload(data: str | bytes, base: int) -> list[str]:
    """Encode each ASCII byte of ``data`` as a ``base``-N digit string.

    >>> encode_payload("Hi", 14)
    ['52', '75']
    """
    raw = ascii_bytes(data) if isinstance(data, str) else bytes(data)
    return [to_base(byte, base) for byte in raw]


def to_binary_stream(data: str | bytes) -> str:
    """Space-separated 8-bit groups, one per ASCII byte — the on-the-void form."""
    raw = ascii_bytes(data) if isinstance(data, str) else bytes(data)
    return " ".join(format(byte, f"0{BITS_PER_BYTE}b") for byte in raw)


def build_translation_log(text: str, codices: list[int]) -> list[dict]:
    """One translation stage per planet along a path, proving the dialect change.

    Args:
        text: the original ASCII payload.
        codices: the ordered codex base of each planet on the route
            ``[origin.codex, relay.codex, ..., destination.codex]``.

    Returns:
        One dict per planet with:
          * ``received_as`` — payload in *this* planet's base (what it reads).
          * ``ascii``       — the decoded payload (constant across hops).
          * ``sent_as``     — payload re-encoded in the *next* planet's base,
                              or ``None`` at the destination (nothing onward).
          * ``binary_stream`` — the 8-bit-per-byte void form leaving this planet.
    """
    stages: list[dict] = []
    for i, base in enumerate(codices):
        next_base = codices[i + 1] if i + 1 < len(codices) else None
        stages.append(
            {
                "received_as": encode_payload(text, base),
                "ascii": text,
                "sent_as": encode_payload(text, next_base) if next_base else None,
                "binary_stream": to_binary_stream(text),
            }
        )
    return stages
