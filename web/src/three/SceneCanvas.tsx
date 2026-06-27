/**
 * 2D SVG scene for the Relic Ring Protocol.
 * Spec §6: "Planets are modeled as 2D circles."
 * All physics values come from the API — this file owns presentation only.
 */
import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useStore } from '../store'
import { COLORS } from '../constants/visual'
import { toggleNode, toggleLink } from '../api'
import type { Node } from '../store'

// ─── Scene dimensions ────────────────────────────────────────────────────────
const W   = 900
const H   = 620
const PAD = 80   // padding from edge to outermost planet center

// ─── Deterministic starfield (no random on render) ───────────────────────────
const STARS = Array.from({ length: 220 }, (_, i) => ({
  x:       ((Math.sin(i * 9_301 + 1) * 0.5 + 0.5) * W),
  y:       ((Math.sin(i * 4_921 + 2) * 0.5 + 0.5) * H),
  r:       Math.abs(Math.sin(i * 7_919)) * 0.9 + 0.3,
  opacity: Math.abs(Math.sin(i * 3_571)) * 0.35 + 0.15,
}))

// ─── Visual radius helpers ────────────────────────────────────────────────────
/** Planet body radius in SVG pixels. Keeps Caelum (58 232 km) ≤ 42 px. */
function planetPx(radius_km: number): number {
  return Math.max(12, Math.min(42, radius_km * 0.006))
}
/** Atmosphere outer radius in SVG pixels. */
function atmoPx(radius_km: number, atmo_km: number): number {
  return planetPx(radius_km) + Math.max(6, atmo_km * 0.004)
}

// ─── Coordinate normalisation ─────────────────────────────────────────────────
/**
 * Maps config (x, y) grid units → SVG pixel coords.
 * Y is flipped: config y-up → SVG y-down.
 */
function make2DNorm(nodes: { x: number; y: number }[]) {
  if (nodes.length === 0) return (_x: number, _y: number) => [W / 2, H / 2] as [number, number]
  const xs = nodes.map(n => n.x)
  const ys = nodes.map(n => n.y)
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)]
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)]
  const scaleX = (W - PAD * 2) / (maxX - minX || 1)
  const scaleY = (H - PAD * 2) / (maxY - minY || 1)
  const scale  = Math.min(scaleX, scaleY)
  const cX = (minX + maxX) / 2
  const cY = (minY + maxY) / 2
  return (x: number, y: number): [number, number] => [
    W / 2 + (x - cX) * scale,
    H / 2 - (y - cY) * scale,   // flip Y
  ]
}

// ─── Tower position ───────────────────────────────────────────────────────────
/**
 * Tower k SVG position on planet equator.
 * θ_k = 2π·k/N clockwise from +y (north = screen-up).
 * Spec §6: Tower 0 at top, increasing index clockwise.
 */
function towerPx(
  cx: number, cy: number,
  k: number, N: number,
  radius: number
): [number, number] {
  const a = (2 * Math.PI * k) / N
  return [cx + radius * Math.sin(a), cy - radius * Math.cos(a)]
}

// ─── Path interpolation ───────────────────────────────────────────────────────
function polylineAt(pts: [number, number][], t: number): [number, number] {
  if (pts.length === 0) return [0, 0]
  if (pts.length === 1) return pts[0]
  let total = 0
  const lens: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
    lens.push(d)
    total += d
  }
  let rem = t * total
  for (let i = 0; i < lens.length; i++) {
    if (rem <= lens[i] || i === lens.length - 1) {
      const u = lens[i] === 0 ? 0 : Math.min(rem / lens[i], 1)
      return [
        pts[i][0] + u * (pts[i + 1][0] - pts[i][0]),
        pts[i][1] + u * (pts[i + 1][1] - pts[i][1]),
      ]
    }
    rem -= lens[i]
  }
  return pts[pts.length - 1]
}

// ─── Packet codex label ───────────────────────────────────────────────────────
/** During void leg i→i+1, the payload is encoded in planet[i+1]'s codex. */
function packetCodexAt(
  waypoints: [number, number][],
  hopBoundaries: number[],   // waypoint indices where planet transitions happen
  hopCodexes: number[],      // codex of the destination at each transition
  t: number
): string {
  if (!waypoints.length || !hopCodexes.length) return ''
  let total = 0
  const lens: number[] = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = Math.hypot(waypoints[i+1][0]-waypoints[i][0], waypoints[i+1][1]-waypoints[i][1])
    lens.push(d)
    total += d
  }
  let rem = t * total
  let seg = 0
  for (let i = 0; i < lens.length; i++) {
    if (rem <= lens[i]) { seg = i; break }
    rem -= lens[i]
    seg = i + 1
  }
  // Find which hop this segment belongs to
  for (let h = 0; h < hopBoundaries.length; h++) {
    if (seg < hopBoundaries[h]) return `BASE ${hopCodexes[h]}`
  }
  return `BASE ${hopCodexes[hopCodexes.length - 1]}`
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SceneCanvas() {
  const snapshot    = useStore(s => s.snapshot)
  const route       = useStore(s => s.route)
  const killMode    = useStore(s => s.killMode)
  const setSnapshot = useStore(s => s.setSnapshot)

  // Sweep animation angle ref (no re-render needed — direct SVG attr mutation)
  const sweepRef  = useRef<SVGLineElement>(null)
  const sweepAngle = useRef(0)
  const sweepRaf  = useRef<number | null>(null)

  useEffect(() => {
    let last = performance.now()
    function tick(now: number) {
      const dt = (now - last) / 1000
      last = now
      sweepAngle.current += 0.35 * dt   // rad/s
      if (sweepRef.current) {
        const a = sweepAngle.current
        const r = Math.min(W, H) * 0.46
        sweepRef.current.setAttribute('x2', String(W / 2 + r * Math.sin(a)))
        sweepRef.current.setAttribute('y2', String(H / 2 - r * Math.cos(a)))
      }
      sweepRaf.current = requestAnimationFrame(tick)
    }
    sweepRaf.current = requestAnimationFrame(tick)
    return () => { if (sweepRaf.current) cancelAnimationFrame(sweepRaf.current) }
  }, [])

  // Coordinate normaliser — rebuilds only when snapshot changes
  const toSVG = useMemo(() => make2DNorm(snapshot?.nodes ?? []), [snapshot])

  // Route edge set for highlighting links
  const routeEdges = useMemo(() => {
    const set = new Set<string>()
    route?.path?.forEach((id, i, arr) => {
      if (i < arr.length - 1) {
        set.add(`${id}|${arr[i + 1]}`)
        set.add(`${arr[i + 1]}|${id}`)
      }
    })
    return set
  }, [route])

  // Packet waypoints: tower-to-tower path following hop_log
  const { waypoints, hopBoundaries, hopCodexes } = useMemo(() => {
    const waypoints: [number, number][] = []
    const hopBoundaries: number[] = []  // waypoint index at each planet-boundary
    const hopCodexes: number[]    = []

    if (!route?.hop_log || !snapshot) return { waypoints, hopBoundaries, hopCodexes }

    const nodeMap = Object.fromEntries(snapshot.nodes.map(n => [n.id, n]))

    route.hop_log.forEach((hop, i) => {
      const node = nodeMap[hop.planet]
      if (!node) return
      const [cx, cy] = toSVG(node.x, node.y)
      const pr       = planetPx(node.radius_km)
      const hopLog   = route.hop_log!

      if (hop.role === 'origin') {
        const sendIdx = hop.send_tower ?? 0
        waypoints.push(towerPx(cx, cy, sendIdx, node.active_towers, pr))
        // While in void toward next planet, payload is in next planet's base
        const nextNode = nodeMap[hopLog[i + 1]?.planet]
        if (nextNode) {
          hopBoundaries.push(waypoints.length)
          hopCodexes.push(nextNode.codex)
        }
      } else if (hop.role === 'relay') {
        const recvIdx = hop.recv_tower ?? 0
        const sendIdx = hop.send_tower ?? 0
        waypoints.push(towerPx(cx, cy, recvIdx, node.active_towers, pr))
        if (recvIdx !== sendIdx) {
          // Surface fiber arc — add midpoint on the arc
          const rMid = ((recvIdx + sendIdx) / 2) % node.active_towers
          waypoints.push(towerPx(cx, cy, rMid, node.active_towers, pr))
          waypoints.push(towerPx(cx, cy, sendIdx, node.active_towers, pr))
        }
        // After relay, payload re-encoded for next hop
        const nextNode = nodeMap[hopLog[i + 1]?.planet]
        if (nextNode) {
          hopBoundaries.push(waypoints.length)
          hopCodexes.push(nextNode.codex)
        }
      } else {
        // destination — just recv tower
        const recvIdx = hop.recv_tower ?? 0
        waypoints.push(towerPx(cx, cy, recvIdx, node.active_towers, pr))
        hopBoundaries.push(waypoints.length)
        hopCodexes.push(node.codex)
      }
    })

    return { waypoints, hopBoundaries, hopCodexes }
  }, [route, snapshot, toSVG])

  // Packet animation — direct DOM mutation for smooth 60fps without re-renders
  const packetCircle = useRef<SVGCircleElement>(null)
  const packetText   = useRef<SVGTextElement>(null)
  const packetT      = useRef(0)
  const lastT        = useRef(performance.now())
  const packetRaf    = useRef<number | null>(null)
  const PACKET_SPEED = 0.12  // fraction of path per second

  useEffect(() => {
    if (packetRaf.current) cancelAnimationFrame(packetRaf.current)
    if (!route?.deliverable || waypoints.length < 2) {
      if (packetCircle.current) packetCircle.current.setAttribute('r', '0')
      return
    }

    packetT.current = 0
    lastT.current   = performance.now()

    function tick(now: number) {
      const dt = (now - lastT.current) / 1000
      lastT.current = now
      packetT.current = packetT.current + dt * PACKET_SPEED
      if (packetT.current > 1) packetT.current = 0  // loop

      const [px, py] = polylineAt(waypoints, packetT.current)
      if (packetCircle.current) {
        packetCircle.current.setAttribute('cx', String(px))
        packetCircle.current.setAttribute('cy', String(py))
        packetCircle.current.setAttribute('r', '6')
      }
      if (packetText.current) {
        packetText.current.setAttribute('x', String(px))
        packetText.current.setAttribute('y', String(py - 14))
        const label = packetCodexAt(waypoints, hopBoundaries, hopCodexes, packetT.current)
        packetText.current.textContent = label
      }
      packetRaf.current = requestAnimationFrame(tick)
    }
    packetRaf.current = requestAnimationFrame(tick)
    return () => { if (packetRaf.current) cancelAnimationFrame(packetRaf.current) }
  }, [route, waypoints, hopBoundaries, hopCodexes])

  // Kill-mode handlers
  const handlePlanetClick = useCallback(async (nodeId: string) => {
    if (!killMode || !snapshot) return
    const node = snapshot.nodes.find(n => n.id === nodeId)
    if (!node) return
    const next = await toggleNode(nodeId, !node.alive)
    if (next) setSnapshot(next)
  }, [killMode, snapshot, setSnapshot])

  const handleLinkClick = useCallback(async (a: string, b: string) => {
    if (!killMode || !snapshot) return
    const edge = snapshot.edges.find(
      e => (e.a === a && e.b === b) || (e.a === b && e.b === a)
    )
    if (!edge) return
    const next = await toggleLink(a, b, !edge.alive)
    if (next) setSnapshot(next)
  }, [killMode, snapshot, setSnapshot])

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!snapshot) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: COLORS.VOID_BLACK,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily:    "'Orbitron', sans-serif",
          color:         COLORS.TEXT_DIM,
          fontSize:      '12px',
          letterSpacing: '0.2em',
        }}>
          [ CONNECTING TO ZETA-26 ]
        </span>
      </div>
    )
  }

  // ── Route path points (planet-center to planet-center for line drawing) ──────
  const routeLines = route?.path
    ? route.path.slice(0, -1).map((id, i) => {
        const na = snapshot.nodes.find(n => n.id === id)
        const nb = snapshot.nodes.find(n => n.id === route.path![i + 1])
        if (!na || !nb) return null
        const [ax, ay] = toSVG(na.x, na.y)
        const [bx, by] = toSVG(nb.x, nb.y)
        return { ax, ay, bx, by, key: `${id}-${route.path![i+1]}` }
      }).filter(Boolean)
    : []

  // ─── SVG scene ───────────────────────────────────────────────────────────────
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: '100%', display: 'block', background: COLORS.VOID_BLACK }}
      cursor={killMode ? 'crosshair' : 'default'}
    >
      <defs>
        {/* Glow filter for active elements */}
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Starfield ─────────────────────────────────────────────────────── */}
      <g>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.opacity} />
        ))}
      </g>

      {/* ── Radar grid rings ──────────────────────────────────────────────── */}
      {[90, 180, 270, 360, 430].map(r => (
        <circle
          key={r} cx={W / 2} cy={H / 2} r={r}
          fill="none" stroke={COLORS.STEEL} strokeWidth="0.5" opacity="0.13"
        />
      ))}
      {/* Bearing ticks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const r1 = 425, r2 = 440
        return (
          <line
            key={i}
            x1={W/2 + r1 * Math.sin(a)} y1={H/2 - r1 * Math.cos(a)}
            x2={W/2 + r2 * Math.sin(a)} y2={H/2 - r2 * Math.cos(a)}
            stroke={COLORS.STEEL} strokeWidth="1" opacity="0.3"
          />
        )
      })}
      {/* Radar sweep line — mutated directly in RAF, no React re-render */}
      <line
        ref={sweepRef}
        x1={W / 2} y1={H / 2}
        x2={W / 2} y2={H / 2 - 430}
        stroke={COLORS.CYAN} strokeWidth="1.5" opacity="0.18"
      />

      {/* ── Void links ────────────────────────────────────────────────────── */}
      {snapshot.edges.map(edge => {
        const na = snapshot.nodes.find(n => n.id === edge.a)
        const nb = snapshot.nodes.find(n => n.id === edge.b)
        if (!na || !nb) return null
        const [ax, ay] = toSVG(na.x, na.y)
        const [bx, by] = toSVG(nb.x, nb.y)
        const isRoute = routeEdges.has(`${edge.a}|${edge.b}`)

        return (
          <line
            key={`${edge.a}-${edge.b}`}
            x1={ax} y1={ay} x2={bx} y2={by}
            stroke={isRoute ? COLORS.CYAN : (edge.alive ? COLORS.STEEL : COLORS.MAGENTA)}
            strokeWidth={isRoute ? 2.5 : (edge.alive ? 1 : 1.5)}
            strokeDasharray={!edge.alive ? '7 4' : undefined}
            opacity={isRoute ? 0.9 : (edge.alive ? 0.35 : 0.65)}
            filter={isRoute ? 'url(#glow-sm)' : undefined}
            onClick={() => handleLinkClick(edge.a, edge.b)}
            style={{ cursor: killMode ? 'crosshair' : 'default', pointerEvents: 'stroke' }}
          />
        )
      })}

      {/* ── Planets ──────────────────────────────────────────────────────── */}
      {snapshot.nodes.map(node => {
        const [cx, cy] = toSVG(node.x, node.y)
        const pr       = planetPx(node.radius_km)
        const ar       = atmoPx(node.radius_km, node.atmosphere_thickness_km)
        const inRoute  = route?.path?.includes(node.id) ?? false
        const alive    = node.alive

        return (
          <g
            key={node.id}
            onClick={() => handlePlanetClick(node.id)}
            style={{ cursor: killMode ? 'crosshair' : 'default' }}
          >
            {/* Atmosphere shell */}
            <circle
              cx={cx} cy={cy} r={ar}
              fill={alive ? 'rgba(26,58,92,0.22)' : 'rgba(255,45,155,0.05)'}
              stroke={alive ? 'rgba(52,227,255,0.18)' : 'rgba(255,45,155,0.4)'}
              strokeWidth="1"
            />

            {/* Dead alarm ring */}
            {!alive && (
              <circle
                cx={cx} cy={cy} r={ar + 5}
                fill="none"
                stroke={COLORS.MAGENTA}
                strokeWidth="2"
                strokeDasharray="6 3"
                opacity="0.75"
              />
            )}

            {/* Planet body */}
            <circle
              cx={cx} cy={cy} r={pr}
              fill={alive ? (inRoute ? COLORS.CYAN : COLORS.TEXT_HI) : COLORS.STEEL}
              opacity={alive ? 1 : 0.45}
              filter={alive ? 'url(#glow-sm)' : undefined}
            />

            {/* Towers — small dots on equator (spec §6: Tower 0 at top, clockwise) */}
            {Array.from({ length: node.active_towers }, (_, k) => {
              const [tx, ty]  = towerPx(cx, cy, k, node.active_towers, pr)
              const isActive  = route?.hop_log?.some(
                h => h.planet === node.id && (h.recv_tower === k || h.send_tower === k)
              ) ?? false
              return (
                <circle
                  key={k}
                  cx={tx} cy={ty}
                  r={isActive ? 3.5 : 2}
                  fill={isActive ? COLORS.CYAN : COLORS.STEEL}
                  opacity={isActive ? 1 : 0.65}
                  filter={isActive ? 'url(#glow-sm)' : undefined}
                />
              )
            })}

            {/* Planet name label */}
            <text
              x={cx} y={cy - ar - 10}
              textAnchor="middle"
              fontFamily="'Orbitron', sans-serif"
              fontSize="10"
              fontWeight="700"
              letterSpacing="2"
              fill={alive ? COLORS.CYAN : COLORS.MAGENTA}
            >
              {node.id.toUpperCase()}
            </text>

            {/* Codex base label */}
            <text
              x={cx} y={cy - ar - 22}
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="8"
              fill={COLORS.TEXT_DIM}
            >
              BASE {node.codex}
            </text>
          </g>
        )
      })}

      {/* ── Packet (animated via direct DOM — no React re-render per frame) ─ */}
      <g filter="url(#glow)">
        <circle
          ref={packetCircle}
          cx={-100} cy={-100} r={0}
          fill={COLORS.CYAN}
          opacity={0.95}
        />
        <text
          ref={packetText}
          x={-100} y={-114}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="9"
          fontWeight="700"
          fill={COLORS.CYAN}
        />
      </g>
    </svg>
  )
}
