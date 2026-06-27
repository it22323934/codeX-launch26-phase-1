# Relic Ring Protocol — Server

Python FastAPI backend for the Relic Ring Protocol hackathon project.

## Setup

```bash
cd server
pip install -e ".[dev]"
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Or set a custom config path:

```bash
RELIC_CONFIG=/path/to/custom.json uvicorn app.main:app --reload --port 8000
```

## Run Tests

```bash
pytest tests/ -v
```

## API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Server health + config path |
| GET | `/api/universe` | Full topology snapshot with tower coords |
| POST | `/api/universe` | Replace universe from JSON body |
| POST | `/api/route` | Compute lowest-latency route |
| POST | `/api/nodes/{id}/toggle` | Toggle node alive state |
| POST | `/api/links/toggle` | Toggle link alive state |
| POST | `/api/reset` | Revive all nodes and links |
| WS | `/ws` | Push topology/route updates on changes |

## Constant Justification

Every tunable constant is defined in `engine/constants.py` and overridable via `universe_metadata` in the config JSON.

| Constant | Default | Unit | Source / Rationale | Override key |
|---|---|---|---|---|
| `SPEED_OF_LIGHT_KMS` | 300,000 | km/s | Spec §B; vacuum c. | `speed_of_light_kms` |
| `FIBER_SPEED_FRACTION` | 0.67 | dimensionless | Spec §A; ~⅔c for subsurface fiber, typical for glass-core optical cable. | `fiber_speed_fraction` |
| `TOWER_DELAY_MS` | 7 | ms | Spec §A; fixed processing penalty per tower hit. | `tower_processing_delay_ms` |
| `LMAX_KM` | 50,000,000 | km | Spec §A; maximum void-hop span; pairs farther apart must relay. | `max_void_hop_distance_km` |
| `COORDINATE_SCALE_UNIT_KM` | 100,000 | km/unit | Spec §6; converts abstract grid units to real km. `radius_km` and `atmosphere_thickness_km` are already in km and are NOT multiplied by this scale. | `coordinate_scale_unit_km` |

## Architecture

```
engine/
  constants.py   — all physical/protocol constants, resolve_constants()
  models.py      — Pydantic Node, UniverseConfig with strict validation
  geometry.py    — planet centers, tower positions, void distances, fiber arcs
  codex.py       — base-N encoding/decoding, translation logs
  latency.py     — four-component latency formula, hop-by-hop accounting
  universe.py    — mutable topology (node/link alive flags), Dijkstra-ready graph
  router.py      — expanded-state Dijkstra over (prev_id, cur_id) pairs

app/
  config.py      — config path resolution (RELIC_CONFIG env or default)
  main.py        — FastAPI app, lifespan startup, CORS, /ws, /health
  api/
    routes.py    — REST endpoints, live Universe singleton
    ws.py        — WebSocket connection manager, topology/route broadcast
    schemas.py   — Pydantic request/response DTOs
```

## Routing Algorithm

The router uses **Dijkstra over expanded states `(prev_planet_id, cur_planet_id)`** instead of plain node-based Dijkstra.

This is required because the relay cost at a planet depends on:
1. Which neighbor you came **from** — determines which tower receives the signal (`recv_tower`).
2. Which neighbor you go **to** next — determines which tower sends the signal (`send_tower`).

If `recv_tower != send_tower`, a fiber arc on the planet surface carries the signal between them, adding fiber latency and an extra tower hit. A plain node-based Dijkstra cannot account for this correctly.

## Latency Components

For each hop `A → B`:
- **Void**: `L_km / c_kms * 1000` ms
- **Atmosphere** (both ends): `h * n / c_kms * 1000` ms per shell
- **Fiber** (relay with different recv/send towers): `arc_km / (fiber_frac * c_kms) * 1000` ms
- **Tower**: `tower_delay_ms * towers_hit` (1 for origin/destination, 1-2 for relay)
