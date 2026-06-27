import { Snapshot, RouteResult } from './store'

const BASE = '/api'

/** Discriminated result so the UI can show exactly why a load failed. */
export type LoadResult =
  | { ok: true; snapshot: Snapshot }
  | { ok: false; error: string }

// ── Shape validation ────────────────────────────────────────────────────────
// The renderer trusts the snapshot shape; a partial or malformed payload would
// otherwise throw deep in the SVG layer. Validate the fields we actually read
// and return a human-readable reason (or null when the shape is good).

function validateSnapshot(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return 'payload is not an object'
  const snap = data as Record<string, unknown>
  if (!Array.isArray(snap.nodes)) return 'missing "nodes" array'
  if (!Array.isArray(snap.edges)) return 'missing "edges" array'

  for (let i = 0; i < snap.nodes.length; i++) {
    const n = snap.nodes[i] as Record<string, unknown>
    if (typeof n?.id !== 'string') return `node[${i}].id is not a string`
    for (const key of ['x', 'y', 'radius_km', 'active_towers', 'codex'] as const) {
      const v = n[key]
      if (typeof v !== 'number' || Number.isNaN(v)) {
        return `node ${String(n.id ?? i)} has invalid "${key}"`
      }
    }
    if (typeof n.alive !== 'boolean') return `node ${n.id} missing "alive"`
  }
  for (let i = 0; i < snap.edges.length; i++) {
    const e = snap.edges[i] as Record<string, unknown>
    if (typeof e?.a !== 'string' || typeof e?.b !== 'string') {
      return `edge[${i}] is missing endpoints`
    }
  }
  return null
}

/** Pull the clearest possible message out of a non-OK response. */
async function readError(res: Response): Promise<string> {
  try {
    const body = await res.text()
    try {
      const j = JSON.parse(body) as { detail?: unknown }
      if (typeof j.detail === 'string') return `HTTP ${res.status}: ${j.detail}`
      if (j.detail != null) return `HTTP ${res.status}: ${JSON.stringify(j.detail)}`
    } catch {
      // body was not JSON; fall through to raw text
    }
    return body ? `HTTP ${res.status}: ${body.slice(0, 200)}` : `HTTP ${res.status} ${res.statusText}`
  } catch {
    return `HTTP ${res.status} ${res.statusText}`
  }
}

// ── Universe load (initial + retry) ──────────────────────────────────────────

export async function loadUniverse(): Promise<LoadResult> {
  let res: Response
  try {
    res = await fetch(`${BASE}/universe`)
  } catch {
    return { ok: false, error: 'Cannot reach the routing engine. Is the backend running on :8000?' }
  }
  if (!res.ok) return { ok: false, error: await readError(res) }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return { ok: false, error: 'Engine returned a response that is not valid JSON.' }
  }
  const invalid = validateSnapshot(data)
  if (invalid) return { ok: false, error: `Malformed universe payload: ${invalid}` }
  return { ok: true, snapshot: data as Snapshot }
}

/** Back-compat thin wrapper: returns the snapshot or null (logs on failure). */
export async function fetchUniverse(): Promise<Snapshot | null> {
  const result = await loadUniverse()
  if (result.ok) return result.snapshot
  console.error('[api] fetchUniverse failed:', result.error)
  return null
}

/** Upload a parsed config object; validates the returned snapshot. */
export async function uploadConfig(config: unknown): Promise<LoadResult> {
  let res: Response
  try {
    res = await fetch(`${BASE}/universe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  } catch {
    return { ok: false, error: 'Cannot reach the routing engine.' }
  }
  if (!res.ok) return { ok: false, error: await readError(res) }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return { ok: false, error: 'Engine returned a response that is not valid JSON.' }
  }
  const invalid = validateSnapshot(data)
  if (invalid) return { ok: false, error: `Malformed snapshot from engine: ${invalid}` }
  return { ok: true, snapshot: data as Snapshot }
}

export async function postRoute(
  origin: string,
  dest: string,
  payload: string
): Promise<RouteResult | null> {
  try {
    const res = await fetch(`${BASE}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination: dest, payload }),
    })
    if (!res.ok) throw new Error(await readError(res))
    return (await res.json()) as RouteResult
  } catch (err) {
    console.error('[api] postRoute failed:', err)
    return null
  }
}

export async function toggleNode(
  id: string,
  alive?: boolean
): Promise<Snapshot | null> {
  try {
    const body: Record<string, unknown> = {}
    if (alive !== undefined) body.alive = alive
    const res = await fetch(`${BASE}/nodes/${encodeURIComponent(id)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await readError(res))
    const data = (await res.json()) as unknown
    if (validateSnapshot(data)) throw new Error('malformed snapshot')
    return data as Snapshot
  } catch (err) {
    console.error('[api] toggleNode failed:', err)
    return null
  }
}

export async function toggleLink(
  a: string,
  b: string,
  alive?: boolean
): Promise<Snapshot | null> {
  try {
    const body: Record<string, unknown> = { a, b }
    if (alive !== undefined) body.alive = alive
    const res = await fetch(`${BASE}/links/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await readError(res))
    const data = (await res.json()) as unknown
    if (validateSnapshot(data)) throw new Error('malformed snapshot')
    return data as Snapshot
  } catch (err) {
    console.error('[api] toggleLink failed:', err)
    return null
  }
}

/** Back-compat config upload returning the snapshot or null. */
export async function postConfig(config: object): Promise<Snapshot | null> {
  const result = await uploadConfig(config)
  if (result.ok) return result.snapshot
  console.error('[api] postConfig failed:', result.error)
  return null
}

export async function resetUniverse(): Promise<Snapshot | null> {
  try {
    const res = await fetch(`${BASE}/reset`, { method: 'POST' })
    if (!res.ok) throw new Error(await readError(res))
    const data = (await res.json()) as unknown
    if (validateSnapshot(data)) throw new Error('malformed snapshot')
    return data as Snapshot
  } catch (err) {
    console.error('[api] resetUniverse failed:', err)
    return null
  }
}

export function connectWS(
  onTopology: (snapshot: Snapshot) => void,
  onRoute: (result: RouteResult) => void,
  onStatus?: (connected: boolean) => void
): () => void {
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let backoffMs = 1000
  let stopped = false

  function connect() {
    if (stopped) return

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${proto}://${location.host}/ws`)

    ws.onopen = () => {
      backoffMs = 1000
      onStatus?.(true)
      console.log('[ws] connected')
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: string
          snapshot?: Snapshot
          result?: RouteResult
        }
        if (data.type === 'topology' && data.snapshot) {
          if (!validateSnapshot(data.snapshot)) onTopology(data.snapshot)
        } else if (data.type === 'route' && data.result) {
          onRoute(data.result)
        }
      } catch {
        // malformed frame — ignore
      }
    }

    ws.onclose = () => {
      onStatus?.(false)
      if (stopped) return
      console.log(`[ws] disconnected — reconnecting in ${backoffMs}ms`)
      reconnectTimer = setTimeout(() => {
        backoffMs = Math.min(backoffMs * 2, 30_000)
        connect()
      }, backoffMs)
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  connect()

  return () => {
    stopped = true
    if (reconnectTimer !== null) clearTimeout(reconnectTimer)
    ws?.close()
  }
}
