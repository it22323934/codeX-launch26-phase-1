# Relic Ring Protocol — Backend (Python Math Engine + API)

Simulates an interplanetary routing network from a `universe-config.json`:
computes lowest-latency routes with full physics, translates payloads between
planetary number-base "codices", and survives node/link failures.

> **Scaffold status.** This is a structured scaffold, not the finished engine.
> The pure layers are implemented and tested; the graded *composition* layers
> are precise, documented stubs. See [Implementation status](#implementation-status).

## Setup

```bash
cd server
python -m venv .venv && . .venv/Scripts/activate    # Windows (Git Bash)
# or:  source .venv/bin/activate                    # macOS/Linux
pip install -e ".[dev]"
```

## Run

```bash
uvicorn app.main:app --reload          # serves on http://localhost:8000
curl http://localhost:8000/health      # {"ok": true, "config": ".../universe-config.json"}
curl http://localhost:8000/api/universe
```

Point the server at a different universe with the `RELIC_CONFIG` env var:

```bash
RELIC_CONFIG=/path/to/other-universe.json uvicorn app.main:app
```

## Test

```bash
pytest            # test_codex.py passes; test_latency/test_router xfail until implemented
```

## API

| Method | Route | Body | Returns |
|--------|-------|------|---------|
| GET  | `/api/universe` | — | enriched snapshot (nodes + tower world coords + edges + constants) |
| POST | `/api/universe` | config json | snapshot (replaces the live universe) |
| POST | `/api/route` | `{origin, destination, payload}` | route result *(501 until router implemented)* |
| POST | `/api/nodes/{id}/toggle` | `{alive?}` | snapshot (omit `alive` to flip) |
| POST | `/api/links/toggle` | `{a, b, alive?}` | snapshot |
| POST | `/api/reset` | — | snapshot (revive all) |
| WS   | `/ws` | — | pushes `{type:"topology",snapshot}` on every kill/revive |
| GET  | `/health` | — | `{ok:true, config:<path>}` |

## Implementation status

| Module | State | Notes |
|--------|-------|-------|
| `engine/constants.py` | `[ DONE ]` | Defaults + `resolve_constants()` merge. The single source of truth. |
| `engine/models.py` | `[ DONE ]` | Strict Pydantic v2 validation of the node schema. |
| `engine/codex.py` | `[ DONE ]` | Base 2–36 encode/decode; `test_codex.py` green. |
| `engine/geometry.py` | `[ DONE ]` | Centers, tower placement, void distance, fiber arcs. |
| `engine/universe.py` | `[ DONE ]` | Load/validate, failure state, neighbours, topology, snapshot. |
| `app/*` (API + WS) | `[ DONE ]` | Universe load, snapshot, toggles, reset, WS topology broadcast. |
| `engine/latency.py` | `[ STUB ]` | Four-component model + hop log (M3). See its docstring. |
| `engine/router.py` | `[ STUB ]` | Dijkstra over `(prev, current)` expanded states (M2/M3 path). |

To finish the engine, implement `latency.py` then `router.py` per
[`.claude/PROMPT_backend_math_engine.md`](../.claude/PROMPT_backend_math_engine.md),
then delete the `pytestmark = xfail` lines in `test_latency.py` / `test_router.py`.

## Constants — assumed values & justification

All live in `engine/constants.py`, defined once, each overridable per universe
via `universe_metadata`. No planetary value is hardcoded anywhere else.

| Constant | Default | Unit | Source | Why this value |
|----------|---------|------|--------|----------------|
| `SPEED_OF_LIGHT_KMS` | 300 000 | km/s | spec §B | Vacuum *c*; the denominator of every propagation term. |
| `FIBER_SPEED_FRACTION` | 0.67 | — | spec §A | Signals crawl at 0.67 *c* along a relay's subsurface fiber arc. Safe range (0, 1]. |
| `TOWER_DELAY_MS` | 7 | ms | spec §A | Fixed processing penalty per **distinct** tower a packet touches. |
| `LMAX_KM` | 50 000 000 | km | spec §A | Longest single void hop; farther pairs must relay. |
| `COORDINATE_SCALE_UNIT_KM` | 100 000 | km/unit | spec §6 | Converts config grid units to km for planet **centers** only — `radius_km` and `atmosphere_thickness_km` are already km and are never scaled. |

### Bundled universe

`universe-config.json` is a 5-planet demo (`Aurelia, Bisecta, Cindex, Doppler,
Echo`) deliberately shaped to exercise routing: `Aurelia`↔`Cindex` exceeds Lmax
and must relay through **either** `Bisecta` or `Doppler` (so killing one
reroutes), and `Echo` sits past Lmax behind `Cindex` (so killing `Cindex`
isolates it → `Undeliverable`). Each planet carries a different `codex` base so
a route shows real dialect translation at every hop.
