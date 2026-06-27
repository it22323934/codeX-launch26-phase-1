"""Resolve which universe config the service loads.

Path comes from the ``RELIC_CONFIG`` environment variable, falling back to the
``universe-config.json`` bundled next to the ``server/`` root. The literals
(env var name, default filename) live here, named — nothing reads the raw
strings elsewhere.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

# Environment variable that overrides the config path. Override: set RELIC_CONFIG.
ENV_CONFIG_PATH = "RELIC_CONFIG"

# Default config shipped with the server (…/server/universe-config.json).
DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "universe-config.json"


def config_path() -> Path:
    """The config file to load: ``$RELIC_CONFIG`` if set, else the bundled default."""
    override = os.environ.get(ENV_CONFIG_PATH)
    return Path(override) if override else DEFAULT_CONFIG_PATH


def read_config(path: Path) -> dict:
    """Read and JSON-parse a universe config file."""
    return json.loads(Path(path).read_text(encoding="utf-8"))
