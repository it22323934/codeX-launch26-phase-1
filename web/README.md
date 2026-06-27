# Relic Ring Protocol — Web Frontend

Cyberpunk orbital command dashboard built with Vite + React + TypeScript + Three.js.

## Requirements

- Node.js 18 or later
- npm 9 or later
- Backend API running at `http://localhost:8000`

## Setup

```bash
cd web
npm install
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. API calls and WebSocket are proxied to `http://localhost:8000`.

## Production Build

```bash
npm run build
npm run preview
```

## Architecture

| Path | Purpose |
|------|---------|
| `src/store.ts` | Zustand global state (snapshot, route, kill mode) |
| `src/api.ts` | REST fetch wrappers + WebSocket with exponential backoff |
| `src/constants/visual.ts` | COLORS, SCENE, ANIM constants — single source of truth |
| `src/three/SceneCanvas.tsx` | R3F Canvas, radar grid, Bloom postprocessing |
| `src/three/Universe.tsx` | Renders all planets and void-links from snapshot |
| `src/three/Planet.tsx` | Sphere + atmosphere + alarm ring + label |
| `src/three/TowerRing.tsx` | Octahedron towers on planet equator |
| `src/three/VoidLink.tsx` | Dashed/solid line between planets |
| `src/three/RoutePath.tsx` | Glowing emissive tube tracing the active route |
| `src/three/Packet.tsx` | Animated sphere travelling along RoutePath curve |
| `src/panels/Toolbar.tsx` | Origin / destination / payload + action buttons |
| `src/panels/TelemetryPanel.tsx` | Latency breakdown with proportional bars |
| `src/panels/HopLogPanel.tsx` | Per-hop table from API hop_log |
| `src/panels/EncodingPanel.tsx` | Collapsible codex translation per hop |
| `src/panels/StatusBar.tsx` | Fixed bottom status line |

## Expected Backend API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/universe` | Returns `{ nodes, edges }` snapshot |
| POST | `/api/route` | Body `{ origin_id, destination_id, payload }` — returns RouteResult |
| POST | `/api/node/toggle` | Body `{ id, alive? }` — returns updated snapshot |
| POST | `/api/link/toggle` | Body `{ a, b, alive? }` — returns updated snapshot |
| POST | `/api/reset` | Resets universe — returns snapshot |
| WS | `/ws` | Streams `{ type: "topology" }` and `{ type: "route" }` frames |
