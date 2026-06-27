import os
from pathlib import Path


def get_config_path() -> Path:
    """
    Resolve the universe config file path.

    Priority:
      1. RELIC_CONFIG environment variable (absolute or relative to cwd).
      2. Default: universe-config.json located next to the server/ package root.
    """
    env = os.getenv("RELIC_CONFIG")
    if env:
        return Path(env)
    # __file__ is server/app/config.py → parent.parent is server/
    return Path(__file__).parent.parent / "universe-config.json"
