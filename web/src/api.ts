// src/api.ts
//
// REST + WebSocket client. The UI only ever calls relative /api and /ws paths;
// Vite proxies them to the backend (see vite.config.ts). This module moves data
// and owns the API DTO types - it contains no physics and no presentation.

// --- DTOs (mirror the backend snapshot / route result) --------------------

export interface TowerCoord {
  k: number;
  x: number;
  y: number;
}

export interface NodeSnapshot {
  id: string;
  codex: number;
  x: number;
  y: number;
  radius_km: number;
  active_towers: number;
  atmosphere_thickness_km: number;
  refraction_index: number;
  center_km: { x: number; y: number };
  towers: TowerCoord[];
  alive: boolean;
}

export interface Edge {
  a: string;
  b: string;
  void_km: number;
  alive: boolean;
}

export interface Constants {
  speed_of_light_kms: number;
  fiber_speed_fraction: number;
  tower_delay_ms: number;
  lmax_km: number;
  coordinate_scale_unit_km: number;
}

export interface Snapshot {
  nodes: NodeSnapshot[];
  edges: Edge[];
  constants: Constants;
}

export interface LatencyTotals {
  void_ms: number;
  atmosphere_ms: number;
  fiber_ms: number;
  tower_ms: number;
  total_ms: number;
}

export interface HopLogEntry {
  planet: string;
  role: "origin" | "relay" | "destination";
  codex: number;
  recv_tower: number | null;
  send_tower: number | null;
  towers_hit: number;
  tower_delay_ms: number;
  fiber: { arc_km: number; ms: number } | null;
  crossing: {
    to: string;
    atmosphere_out_ms: number;
    void_km: number;
    void_ms: number;
    atmosphere_in_ms: number;
    total_ms: number;
  } | null;
}

export interface TranslationStage {
  received_as: string[];
  ascii: string;
  sent_as: string[] | null;
  binary_stream: string;
}

export interface RouteResult {
  deliverable: boolean;
  reason?: string;
  origin_id: string;
  destination_id: string;
  payload: string;
  path: string[];
  hop_log: HopLogEntry[];
  latency: LatencyTotals;
  translation: TranslationStage[];
}

// --- REST -----------------------------------------------------------------

const JSON_HEADERS = { "Content-Type": "application/json" };

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // Surface the backend detail (e.g. a 501 from the router scaffold stub).
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getUniverse: (): Promise<Snapshot> => fetch("/api/universe").then(jsonOrThrow),

  postRoute: (origin: string, destination: string, payload: string): Promise<RouteResult> =>
    fetch("/api/route", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ origin, destination, payload }),
    }).then(jsonOrThrow),

  toggleNode: (id: string, alive?: boolean): Promise<Snapshot> =>
    fetch(`/api/nodes/${encodeURIComponent(id)}/toggle`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(alive === undefined ? {} : { alive }),
    }).then(jsonOrThrow),

  toggleLink: (a: string, b: string, alive?: boolean): Promise<Snapshot> =>
    fetch("/api/links/toggle", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(alive === undefined ? { a, b } : { a, b, alive }),
    }).then(jsonOrThrow),

  reset: (): Promise<Snapshot> => fetch("/api/reset", { method: "POST" }).then(jsonOrThrow),
};

// --- WebSocket ------------------------------------------------------------

export type WsMessage =
  | { type: "topology"; snapshot: Snapshot }
  | { type: "route"; result: RouteResult };

// Fixed reconnect backoff so a backend restart does not need a page reload.
const WS_RECONNECT_MS = 1500;

/**
 * Connect to the backend WebSocket through the Vite proxy and stream messages
 * to `onMessage`. Returns a disposer that stops reconnecting and closes.
 */
export function connectWs(onMessage: (m: WsMessage) => void): () => void {
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  const url = `${scheme}://${location.host}/ws`;
  let socket: WebSocket | null = null;
  let closed = false;
  let timer: number | undefined;

  const open = () => {
    socket = new WebSocket(url);
    socket.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data) as WsMessage);
      } catch {
        // Ignore a malformed frame rather than killing the socket.
      }
    };
    socket.onclose = () => {
      if (!closed) timer = window.setTimeout(open, WS_RECONNECT_MS);
    };
  };

  open();
  return () => {
    closed = true;
    window.clearTimeout(timer);
    socket?.close();
  };
}
