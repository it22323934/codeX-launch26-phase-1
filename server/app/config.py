import json
import os
from pathlib import Path


class ConfigError(Exception):
    """Raised when the universe config cannot be found, parsed, or shaped.

    Carries a human-readable message safe to surface to the API client so the
    frontend can show exactly why the JSON failed to load.
    """


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
    # __file__ is server/app/config.py -> parent.parent is server/
    return Path(__file__).parent.parent / "universe-config.json"


def load_config(path: Path) -> dict:
    """Read and parse a universe config file into a dict.

    Every failure mode is converted into a :class:`ConfigError` with a clear
    message instead of a raw traceback, so neither startup nor an upload can
    crash the process on bad input. Schema validation happens later (Pydantic);
    here we only guarantee a well-formed JSON object.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise ConfigError(f"Config file not found: {path}") from exc
    except OSError as exc:
        raise ConfigError(f"Could not read config file {path}: {exc}") from exc

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ConfigError(
            f"{path.name} is not valid JSON "
            f"(line {exc.lineno}, column {exc.colno}): {exc.msg}"
        ) from exc

    if not isinstance(data, dict):
        raise ConfigError(
            f"Config root must be a JSON object, got {type(data).__name__}"
        )
    return data
