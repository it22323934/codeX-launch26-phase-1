import { Snapshot, RouteResult } from './store'

const BASE = '/api'

export async function fetchUniverse(): Promise<Snapshot | null> {
  try {
    const res = await fetch(`${BASE}/universe`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as Snapshot
  } catch (err) {
    console.error('[api] fetchUniverse failed:', err)
    return null
  }
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as Snapshot
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as Snapshot
  } catch (err) {
    console.error('[api] toggleLink failed:', err)
    return null
  }
}

export async function resetUniverse(): Promise<Snapshot | null> {
  try {
    const res = await fetch(`${BASE}/reset`, { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as Snapshot
  } catch (err) {
    console.error('[api] resetUniverse failed:', err)
    return null
  }
}

export function connectWS(
  onTopology: (snapshot: Snapshot) => void,
  onRoute: (result: RouteResult) => void
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
          onTopology(data.snapshot)
        } else if (data.type === 'route' && data.result) {
          onRoute(data.result)
        }
      } catch {
        // malformed frame — ignore
      }
    }

    ws.onclose = () => {
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
