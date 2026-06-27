import { create } from 'zustand'

export interface TowerPosition {
  x: number
  y: number
  index: number
}

export interface Node {
  id: string
  codex: number
  x: number
  y: number
  radius_km: number
  active_towers: number
  atmosphere_thickness_km: number
  refraction_index: number
  alive: boolean
  tower_positions: TowerPosition[]
}

export interface Edge {
  a: string
  b: string
  void_km: number
  alive: boolean
}

export interface Snapshot {
  system_name?: string
  nodes: Node[]
  edges: Edge[]
}

export interface LatencyBreakdown {
  void_ms: number
  atmosphere_ms: number
  fiber_ms: number
  tower_ms: number
  total_ms: number
}

export interface HopEntry {
  planet: string
  role: string
  recv_tower: number | null
  send_tower: number | null
  towers_hit: number
  fiber_ms: number
  void_km: number
  void_ms: number
}

export interface TranslationEntry {
  planet: string
  codex: number
  received_digits: number[] | null
  ascii: string | null
  sent_digits: number[] | null
  binary_stream: string | null
}

export interface RouteResult {
  deliverable: boolean
  reason?: string
  origin_id?: string
  destination_id?: string
  payload?: string
  path?: string[]
  latency?: LatencyBreakdown
  hop_log?: HopEntry[]
  translation?: TranslationEntry[]
}

/** Initial-load lifecycle for the universe snapshot. */
export type Connection = 'connecting' | 'online' | 'error'

interface Store {
  snapshot: Snapshot | null
  originId: string
  destinationId: string
  payload: string
  route: RouteResult | null
  killMode: boolean
  animating: boolean
  booted: boolean

  // ── Connection + error feedback ──────────────────────────────────────────
  connection: Connection      // initial universe load state
  loadError: string | null    // why the universe failed to load (human text)
  wsConnected: boolean        // live link to the /ws push channel
  transmitError: string | null// last route request that failed at the network level

  setSnapshot: (s: Snapshot) => void
  setOriginId: (id: string) => void
  setDestinationId: (id: string) => void
  setPayload: (p: string) => void
  setRoute: (r: RouteResult | null) => void
  setKillMode: (k: boolean) => void
  setAnimating: (a: boolean) => void
  setBooted: (b: boolean) => void

  setConnection: (c: Connection) => void
  setLoadError: (e: string | null) => void
  setWsConnected: (b: boolean) => void
  setTransmitError: (e: string | null) => void
}

export const useStore = create<Store>()(set => ({
  snapshot: null,
  originId: '',
  destinationId: '',
  payload: 'Hello world',
  route: null,
  killMode: false,
  animating: false,
  booted: false,

  connection: 'connecting',
  loadError: null,
  wsConnected: false,
  transmitError: null,

  setSnapshot:     (s) => set({ snapshot: s }),
  setOriginId:     (id) => set({ originId: id }),
  setDestinationId:(id) => set({ destinationId: id }),
  setPayload:      (p) => set({ payload: p }),
  setRoute:        (r) => set({ route: r }),
  setKillMode:     (k) => set({ killMode: k }),
  setAnimating:    (a) => set({ animating: a }),
  setBooted:       (b) => set({ booted: b }),

  setConnection:    (c) => set({ connection: c }),
  setLoadError:     (e) => set({ loadError: e }),
  setWsConnected:   (b) => set({ wsConnected: b }),
  setTransmitError: (e) => set({ transmitError: e }),
}))
