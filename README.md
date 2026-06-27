# Relic Ring Protocol

A simulation of interstellar message routing across a ring of planets. The
backend models the physics — void-crossing latency, atmospheric refraction,
subsurface fiber arcs, tower processing delays — and finds the lowest-latency
path. The frontend is a hand-drawn "sketchbook" dashboard that visualises the
universe, animates the packet along its route, and breaks down the latency and
number-base translation at every hop.

## Repository layout

| Path | What it is | Docs |
|------|------------|------|
| [`server/`](server/) | Python FastAPI math engine + routing API (Dijkstra over expanded tower states). | [server/README.md](server/README.md) |
| [`web/`](web/) | Vite + React + TypeScript dashboard (SVG map, telemetry, hop log, encoding panels). | [web/README.md](web/README.md) |

## Prerequisites

- **Python 3.11+** (for the server)
- **Node.js 18+** and **npm 9+** (for the web frontend)

## How to set up

The project is two services that run together: start the **server** first
(the web app talks to it on port `8000`), then the **web** frontend. Each
directory has its own README with the full details — the steps below are the
quick path.

### 1. Backend (`server/`)

See [server/README.md](server/README.md) for the full API reference, constant
justifications, and architecture.

```bash
cd server
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000` (health check: `/health`).

### 2. Frontend (`web/`)

See [web/README.md](web/README.md) for the component map and expected API.

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies API and WebSocket calls to
the backend on port `8000`, so make sure the server is running first.

## Running the tests

The backend test suite covers the codex, latency, and router engines:

```bash
cd server
pytest tests/ -v
```

## How it works (in brief)

1. The server loads a **universe config** (planets with coordinates, radii,
   atmospheres, tower counts, and a number base / "codex" per planet).
2. On a route request it runs **Dijkstra over `(prev_planet, current_planet)`
   states**, because a relay's cost depends on both where the signal arrived
   from and where it leaves to (which towers it uses, and whether a fiber arc
   is needed between them).
3. It returns the path, a four-component **latency breakdown** (void,
   atmosphere, fiber, tower) per hop, and the **number-base translation** of the
   payload as it is re-encoded at each planet.
4. The web app renders the map, animates the packet, and presents all of the
   above. Topology and route changes are pushed live over a WebSocket (`/ws`).

For the deeper reasoning behind the routing algorithm, latency formula, and
every tunable constant, read [server/README.md](server/README.md).
