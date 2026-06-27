"""Relic Ring math engine: geometry, codex encoding, latency, routing.

Pure simulation logic with no web dependencies. The API layer (``app``) is the
only consumer; nothing here imports FastAPI. All tunable values come from
``engine.constants`` — no planetary or physical literal is hardcoded elsewhere.
"""
