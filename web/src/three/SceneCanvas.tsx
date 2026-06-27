/**
 * 2D SVG scene — Relic Ring Protocol.
 * Spec §6: "Planets are modeled as 2D circles."
 * All physics values come from the API — this file owns presentation only.
 */
import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { useStore } from '../store'
import { COLORS } from '../constants/visual'
import { toggleNode, toggleLink } from '../api'

// ─── Scene dimensions ─────────────────────────────────────────────────────────
const W = 900, H = 620, PAD = 88
const CX = W / 2, CY = H / 2

// Zoom/pan limits for the holographic map view.
const MAX_ZOOM = 6
const MIN_VIEW_W = W / MAX_ZOOM
const MIN_VIEW_H = H / MAX_ZOOM

// ─── Planet crayon palette — muted hand-coloured tones (one per codex) ───────
// [fill, shade] pairs. Fill is the flat crayon colour; shade is a darker tone
// used for light pencil shading on the body. Indices map to codex (mod length).
const COLOR_PALETTE: [string, string][] = [
  ['#C7869A', '#8A4A5C'],  //  0 rose
  ['#D98C7A', '#9A4E3C'],  //  1 coral
  ['#C0563E', '#7E2E1E'],  //  2 brick
  ['#D99A4E', '#9A6520'],  //  3 amber
  ['#D8B25A', '#9A7A28'],  //  4 mustard
  ['#D98E50', '#9A5A22'],  //  5 orange      ← Boreas
  ['#5E9B8C', '#2E5E50'],  //  6 teal        ← Dawn
  ['#7FA86A', '#4A6E38'],  //  7 sage green
  ['#5B93B0', '#2E5E78'],  //  8 sky ink     ← Aegis
  ['#7FA9C9', '#3F6E90'],  //  9 cornflower
  ['#D7B25C', '#9A7A2A'],  // 10 gold        ← Elysium
  ['#79B0BC', '#3E7A86'],  // 11 ice
  ['#7E97C4', '#42588E'],  // 12 periwinkle
  ['#9A86C0', '#5E4A86'],  // 13 lavender
  ['#9B73A8', '#5E3E6E'],  // 14 plum        ← Caelum
  ['#C586A0', '#8A4A64'],  // 15 mauve
  ['#C56B6B', '#8A3A3A'],  // 16 clay        ← Fenix
]
function planetColorPair(codex: number): [string, string] {
  return COLOR_PALETTE[codex % COLOR_PALETTE.length]
}
function planetColor(codex: number): string {
  return planetColorPair(codex)[0]
}

// (Starfield removed for the paper theme — the page background is graph paper.)

// ─── Visual helpers ───────────────────────────────────────────────────────────
function planetPx(radius_km: number): number {
  return Math.max(15, Math.min(46, radius_km * 0.006))
}
function atmoPx(radius_km: number, atmo_km: number): number {
  return planetPx(radius_km) + Math.max(7, atmo_km * 0.004)
}

// ─── Coordinate normalisation ─────────────────────────────────────────────────
function make2DNorm(nodes: { x: number; y: number }[]) {
  if (!nodes.length) return (_x: number, _y: number) => [CX, CY] as [number, number]
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y)
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)]
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)]
  const scale = Math.min((W - PAD * 2) / (maxX - minX || 1), (H - PAD * 2) / (maxY - minY || 1))
  const [cX, cY] = [(minX + maxX) / 2, (minY + maxY) / 2]
  return (x: number, y: number): [number, number] =>
    [CX + (x - cX) * scale, CY - (y - cY) * scale]
}

// ─── Tower position (spec §6: k=0 at north, clockwise) ───────────────────────
function towerPx(cx: number, cy: number, k: number, N: number, pr: number): [number, number] {
  const a = (2 * Math.PI * k) / N
  return [cx + pr * Math.sin(a), cy - pr * Math.cos(a)]
}

// ─── Current path segment index at parameter t ────────────────────────────────
function segmentOf(pts: [number, number][], t: number): number {
  if (pts.length <= 1) return 0
  let total = 0
  const lens: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
    lens.push(d); total += d
  }
  let rem = t * total
  for (let i = 0; i < lens.length; i++) {
    if (rem <= lens[i]) return i
    rem -= lens[i]
  }
  return lens.length - 1
}

// ─── Path interpolation ───────────────────────────────────────────────────────
function polylineAt(pts: [number, number][], t: number): [number, number] {
  if (!pts.length) return [0, 0]
  if (pts.length === 1) return pts[0]
  let total = 0
  const lens: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
    lens.push(d); total += d
  }
  let rem = t * total
  for (let i = 0; i < lens.length; i++) {
    if (rem <= lens[i] || i === lens.length - 1) {
      const u = lens[i] === 0 ? 0 : Math.min(rem / lens[i], 1)
      return [pts[i][0] + u * (pts[i + 1][0] - pts[i][0]), pts[i][1] + u * (pts[i + 1][1] - pts[i][1])]
    }
    rem -= lens[i]
  }
  return pts[pts.length - 1]
}

// ─── Packet codex label at position t ────────────────────────────────────────
function packetCodexAt(
  waypoints: [number, number][],
  hopBoundaries: number[],
  hopCodexes: number[],
  t: number
): string {
  if (!waypoints.length || !hopCodexes.length) return ''
  let total = 0
  const lens: number[] = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = Math.hypot(waypoints[i + 1][0] - waypoints[i][0], waypoints[i + 1][1] - waypoints[i][1])
    lens.push(d); total += d
  }
  let rem = t * total, seg = 0
  for (let i = 0; i < lens.length; i++) {
    if (rem <= lens[i]) { seg = i; break }
    rem -= lens[i]; seg = i + 1
  }
  for (let h = 0; h < hopBoundaries.length; h++) {
    if (seg < hopBoundaries[h]) return `B-${hopCodexes[h]}`
  }
  return `B-${hopCodexes[hopCodexes.length - 1]}`
}

const TRAIL_LEN = 18

// ─── Component ────────────────────────────────────────────────────────────────
export function SceneCanvas() {
  const snapshot    = useStore(s => s.snapshot)
  const route       = useStore(s => s.route)
  const killMode    = useStore(s => s.killMode)
  const setSnapshot = useStore(s => s.setSnapshot)

  // ── SVG root ref (for scoped querySelector on tower glow elements) ───────────
  const svgRef = useRef<SVGSVGElement>(null)

  // ── Coordinate normaliser ──────────────────────────────────────────────────
  const toSVG = useMemo(() => make2DNorm(snapshot?.nodes ?? []), [snapshot])

  // ── Route edge highlight set ───────────────────────────────────────────────
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

  // ── Packet waypoints ───────────────────────────────────────────────────────
  type TowerRef = { planetId: string; towerIdx: number } | null
  const { waypoints, hopBoundaries, hopCodexes, waypointTowers } = useMemo(() => {
    const waypoints: [number, number][] = []
    const hopBoundaries: number[] = []
    const hopCodexes: number[] = []
    const waypointTowers: TowerRef[] = []

    if (!route?.hop_log || !snapshot) return { waypoints, hopBoundaries, hopCodexes, waypointTowers }

    const nodeMap = Object.fromEntries(snapshot.nodes.map(n => [n.id, n]))

    route.hop_log.forEach((hop, i) => {
      const node = nodeMap[hop.planet]
      if (!node) return
      const [cx, cy] = toSVG(node.x, node.y)
      const pr = planetPx(node.radius_km)
      const hl = route.hop_log!

      if (hop.role === 'origin') {
        const sIdx = hop.send_tower ?? 0
        waypoints.push(towerPx(cx, cy, sIdx, node.active_towers, pr))
        waypointTowers.push({ planetId: node.id, towerIdx: sIdx })
        const next = nodeMap[hl[i + 1]?.planet]
        if (next) { hopBoundaries.push(waypoints.length); hopCodexes.push(next.codex) }
      } else if (hop.role === 'relay') {
        const rIdx = hop.recv_tower ?? 0, sIdx = hop.send_tower ?? 0
        const N = node.active_towers
        // recv tower
        waypoints.push(towerPx(cx, cy, rIdx, N, pr))
        waypointTowers.push({ planetId: node.id, towerIdx: rIdx })
        if (rIdx !== sIdx) {
          // Walk the shorter arc tower-by-tower so each circle lights up in sequence
          const cw  = (sIdx - rIdx + N) % N
          const ccw = (rIdx - sIdx + N) % N
          const clockwise = cw <= ccw
          const steps = Math.min(cw, ccw)
          for (let s = 1; s < steps; s++) {
            const tIdx = clockwise ? (rIdx + s) % N : (rIdx - s + N) % N
            waypoints.push(towerPx(cx, cy, tIdx, N, pr))
            waypointTowers.push({ planetId: node.id, towerIdx: tIdx })
          }
          // send tower
          waypoints.push(towerPx(cx, cy, sIdx, N, pr))
          waypointTowers.push({ planetId: node.id, towerIdx: sIdx })
        }
        const next = nodeMap[hl[i + 1]?.planet]
        if (next) { hopBoundaries.push(waypoints.length); hopCodexes.push(next.codex) }
      } else {
        const rIdx = hop.recv_tower ?? 0
        waypoints.push(towerPx(cx, cy, rIdx, node.active_towers, pr))
        waypointTowers.push({ planetId: node.id, towerIdx: rIdx })
        hopBoundaries.push(waypoints.length)
        hopCodexes.push(node.codex)
      }
    })

    return { waypoints, hopBoundaries, hopCodexes, waypointTowers }
  }, [route, snapshot, toSVG])

  // ── Packet animation (all DOM mutation — no React re-renders per frame) ────
  const packetDotRef   = useRef<SVGCircleElement>(null)
  const packetCoreRef  = useRef<SVGCircleElement>(null)
  const packetRingRef  = useRef<SVGCircleElement>(null)
  const packetLabelRef = useRef<SVGRectElement>(null)
  const packetTextRef  = useRef<SVGTextElement>(null)
  const trailRefs      = useRef<(SVGCircleElement | null)[]>([])
  const trailPos       = useRef<[number, number][]>([])
  const packetT        = useRef(0)
  const lastFrameT     = useRef(performance.now())
  const packetRaf      = useRef<number | null>(null)
  const packetLastSeg  = useRef(-1)
  const activeGlows    = useRef(new Map<Element, number>())
  const SPEED          = 0.12

  useEffect(() => {
    if (packetRaf.current) cancelAnimationFrame(packetRaf.current)

    const clearGlows = () => {
      activeGlows.current.forEach((_, el) => el.setAttribute('opacity', '0'))
      activeGlows.current.clear()
      packetLastSeg.current = -1
    }

    const hide = () => {
      packetDotRef.current?.setAttribute('r', '0')
      packetCoreRef.current?.setAttribute('r', '0')
      packetRingRef.current?.setAttribute('r', '0')
      if (packetLabelRef.current) { packetLabelRef.current.setAttribute('x', '-1000'); packetLabelRef.current.setAttribute('y', '-1000') }
      if (packetTextRef.current)  packetTextRef.current.textContent = ''
      trailPos.current = []
      trailRefs.current.forEach(el => el?.setAttribute('r', '0'))
      clearGlows()
    }

    if (!route?.deliverable || waypoints.length < 2) { hide(); return }

    packetT.current = 0
    lastFrameT.current = performance.now()
    trailPos.current = []
    clearGlows()

    function fireTowerGlow(seg: number) {
      const info = waypointTowers[seg]
      if (!info) return
      const el = svgRef.current?.querySelector(
        `[data-relic-planet="${info.planetId}"][data-relic-tower="${info.towerIdx}"]`
      )
      if (el) {
        el.setAttribute('opacity', '1')
        activeGlows.current.set(el, 1.0)
      }
    }

    function tick(now: number) {
      packetT.current += ((now - lastFrameT.current) / 1000) * SPEED
      lastFrameT.current = now
      if (packetT.current > 1) {
        packetT.current = 0
        packetLastSeg.current = -1  // reset so segment 0 fires again on loop
      }

      const [px, py] = polylineAt(waypoints, packetT.current)

      // Fire tower glow on segment change
      const seg = segmentOf(waypoints, packetT.current)
      if (seg !== packetLastSeg.current) {
        fireTowerGlow(seg)
        packetLastSeg.current = seg
      }

      // Fade active tower glows
      const toDelete: Element[] = []
      activeGlows.current.forEach((op, el) => {
        const next = op - 0.018   // ~55 frames ≈ 0.9 s fade at 60 fps
        if (next <= 0) { el.setAttribute('opacity', '0'); toDelete.push(el) }
        else { el.setAttribute('opacity', String(next)); activeGlows.current.set(el, next) }
      })
      toDelete.forEach(el => activeGlows.current.delete(el))

      packetDotRef.current?.setAttribute('cx', String(px))
      packetDotRef.current?.setAttribute('cy', String(py))
      packetDotRef.current?.setAttribute('r', '6')

      packetCoreRef.current?.setAttribute('cx', String(px))
      packetCoreRef.current?.setAttribute('cy', String(py))
      packetCoreRef.current?.setAttribute('r', '2.5')

      packetRingRef.current?.setAttribute('cx', String(px))
      packetRingRef.current?.setAttribute('cy', String(py))
      packetRingRef.current?.setAttribute('r', '14')

      // Trail
      trailPos.current.unshift([px, py])
      if (trailPos.current.length > TRAIL_LEN) trailPos.current.length = TRAIL_LEN
      trailRefs.current.forEach((el, i) => {
        if (!el) return
        const p = trailPos.current[i]
        if (!p) { el.setAttribute('r', '0'); return }
        const f = 1 - i / TRAIL_LEN
        el.setAttribute('cx', String(p[0]))
        el.setAttribute('cy', String(p[1]))
        el.setAttribute('r',  String(5 * f * f))
        el.setAttribute('opacity', String(0.55 * f * f))
      })

      // HUD label
      const label = packetCodexAt(waypoints, hopBoundaries, hopCodexes, packetT.current)
      const lw = 52, lh = 15
      if (packetLabelRef.current) {
        packetLabelRef.current.setAttribute('x', String(px + 11))
        packetLabelRef.current.setAttribute('y', String(py - 28))
        packetLabelRef.current.setAttribute('width',  String(lw))
        packetLabelRef.current.setAttribute('height', String(lh))
      }
      if (packetTextRef.current) {
        packetTextRef.current.setAttribute('x', String(px + 11 + lw / 2))
        packetTextRef.current.setAttribute('y', String(py - 28 + lh - 4))
        packetTextRef.current.textContent = label
      }

      packetRaf.current = requestAnimationFrame(tick)
    }
    packetRaf.current = requestAnimationFrame(tick)
    return () => { if (packetRaf.current) cancelAnimationFrame(packetRaf.current) }
  }, [route, waypoints, hopBoundaries, hopCodexes, waypointTowers])

  // ── Kill-mode handlers ─────────────────────────────────────────────────────
  const handlePlanetClick = useCallback(async (id: string) => {
    if (dragged.current) return          // a pan drag, not a click
    if (!killMode || !snapshot) return
    const node = snapshot.nodes.find(n => n.id === id)
    if (!node) return
    const next = await toggleNode(id, !node.alive)
    if (next) setSnapshot(next)
  }, [killMode, snapshot, setSnapshot])

  const handleLinkClick = useCallback(async (a: string, b: string) => {
    if (dragged.current) return          // a pan drag, not a click
    if (!killMode || !snapshot) return
    const edge = snapshot.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))
    if (!edge) return
    const next = await toggleLink(a, b, !edge.alive)
    if (next) setSnapshot(next)
  }, [killMode, snapshot, setSnapshot])

  // ── Zoom + pan (viewBox-driven) ─────────────────────────────────────────────
  const [view, setView] = useState({ x: 0, y: 0, w: W, h: H })
  const panning = useRef<{ cx: number; cy: number; vx: number; vy: number; scale: number } | null>(null)
  const dragged = useRef(false)

  const clientToUser = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return { x: CX, y: CY }
    const p = svg.createSVGPoint()
    p.x = clientX; p.y = clientY
    const u = p.matrixTransform(ctm.inverse())
    return { x: u.x, y: u.y }
  }, [])

  const clampView = useCallback((v: { x: number; y: number; w: number; h: number }) => {
    const w = Math.min(Math.max(v.w, MIN_VIEW_W), W)
    const h = Math.min(Math.max(v.h, MIN_VIEW_H), H)
    return {
      x: Math.min(Math.max(v.x, 0), W - w),
      y: Math.min(Math.max(v.y, 0), H - h),
      w, h,
    }
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    const a = clientToUser(e.clientX, e.clientY)
    setView(v => {
      const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85
      const nw = Math.min(Math.max(v.w * factor, MIN_VIEW_W), W)
      const nh = nw * (H / W)
      const ux = (a.x - v.x) / v.w
      const uy = (a.y - v.y) / v.h
      return clampView({ x: a.x - ux * nw, y: a.y - uy * nh, w: nw, h: nh })
    })
  }, [clientToUser, clampView])

  const zoomByButton = useCallback((dir: 1 | -1) => {
    setView(v => {
      const factor = dir > 0 ? 0.8 : 1 / 0.8
      const nw = Math.min(Math.max(v.w * factor, MIN_VIEW_W), W)
      const nh = nw * (H / W)
      const cxw = v.x + v.w / 2, cyw = v.y + v.h / 2
      return clampView({ x: cxw - nw / 2, y: cyw - nh / 2, w: nw, h: nh })
    })
  }, [clampView])

  const resetView = useCallback(() => setView({ x: 0, y: 0, w: W, h: H }), [])

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const ctm = svgRef.current?.getScreenCTM()
    panning.current = { cx: e.clientX, cy: e.clientY, vx: view.x, vy: view.y, scale: ctm ? ctm.a : 1 }
    dragged.current = false
  }, [view.x, view.y])

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const p = panning.current
    if (!p) return
    const dx = e.clientX - p.cx, dy = e.clientY - p.cy
    if (Math.abs(dx) + Math.abs(dy) > 3) dragged.current = true
    const s = p.scale || 1
    setView(v => clampView({ ...v, x: p.vx - dx / s, y: p.vy - dy / s }))
  }, [clampView])

  const endPan = useCallback(() => { panning.current = null }, [])

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!snapshot) {
    return (
      <div style={{ width: '100%', height: '100%', background: COLORS.VOID_BLACK,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: COLORS.TEXT_DIM, fontSize: '16px' }}>
          Loading the map...
        </span>
      </div>
    )
  }

  // ─── SVG render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <svg
      ref={svgRef}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid meet"
      onWheel={handleWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerLeave={endPan}
      style={{
        width: '100%', height: '100%', display: 'block', background: 'transparent',
        cursor: killMode ? 'crosshair' : 'grab', touchAction: 'none',
      }}
    >
      <defs>
        {/* Glow filters — multiple strengths */}
        <filter id="glow-xl" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-xs" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="star-hi" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        {/* Hand-drawn wobble: displace edges with fractal noise so straight
            lines read as sketched pen strokes rather than ruler-straight. */}
        <filter id="sketch" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Planet sphere gradients — generated from actual snapshot codexes (fully dynamic) */}
        {Array.from(new Set((snapshot?.nodes ?? []).map(n => n.codex))).map(codex => {
          const [light, dark] = planetColorPair(codex)
          return (
            <radialGradient key={codex} id={`pg-${codex}`} cx="36%" cy="30%" r="70%">
              <stop offset="0%"   stopColor="white" stopOpacity="0.6" />
              <stop offset="18%"  stopColor={light} stopOpacity="1"   />
              <stop offset="62%"  stopColor={light} stopOpacity="0.88" />
              <stop offset="100%" stopColor={dark}  stopOpacity="1"   />
            </radialGradient>
          )
        })}

        {/* Dead-planet hatch fill */}
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={COLORS.MAGENTA} strokeWidth="0.75" opacity="0.35" />
        </pattern>
      </defs>

      {/* Graph paper comes from the page background. Everything drawn below is
          wrapped in the displacement filter so it wobbles like pen on paper. */}
      <g filter="url(#sketch)">

      {/* ── Range rings (faint pencil compass) ────────────────────────────── */}
      {[80, 165, 255, 345, 425].map(r => (
        <circle key={r} cx={CX} cy={CY} r={r}
          fill="none" stroke={COLORS.STEEL} strokeWidth="0.5" opacity="0.09"
        />
      ))}
      {/* Cardinal tick marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const isMajor = i % 3 === 0
        return (
          <line key={i}
            x1={CX + (isMajor ? 412 : 416) * Math.sin(a)}
            y1={CY - (isMajor ? 412 : 416) * Math.cos(a)}
            x2={CX + 428 * Math.sin(a)}
            y2={CY - 428 * Math.cos(a)}
            stroke={COLORS.STEEL}
            strokeWidth={isMajor ? 1.2 : 0.6}
            opacity={isMajor ? 0.3 : 0.18}
          />
        )
      })}
      {/* N / E / S / W labels */}
      {[['N', 0, -432], ['E', 432, 0], ['S', 0, 432], ['W', -432, 0]].map(
        ([lbl, dx, dy]) => (
          <text key={String(lbl)} x={CX + Number(dx)} y={CY + Number(dy)}
            textAnchor="middle" dominantBaseline="middle"
            fontFamily="'Orbitron', sans-serif"
            fontSize="7" fontWeight="700" letterSpacing="0.1em"
            fill={COLORS.STEEL} opacity="0.2"
          >{lbl}</text>
        )
      )}

      {/* ── Void links ────────────────────────────────────────────────────── */}
      {snapshot.edges.map(edge => {
        const na = snapshot.nodes.find(n => n.id === edge.a)
        const nb = snapshot.nodes.find(n => n.id === edge.b)
        if (!na || !nb) return null
        const [ax, ay] = toSVG(na.x, na.y)
        const [bx, by] = toSVG(nb.x, nb.y)
        const isRoute = routeEdges.has(`${edge.a}|${edge.b}`)
        const alive = edge.alive

        return (
          <g key={`${edge.a}-${edge.b}`}
            onClick={() => handleLinkClick(edge.a, edge.b)}
            style={{ cursor: killMode ? 'crosshair' : 'default' }}
          >
            {/* Route soft glow halo */}
            {isRoute && alive && (
              <line x1={ax} y1={ay} x2={bx} y2={by}
                stroke={COLORS.CYAN} strokeWidth="14" opacity="0.04"
                strokeLinecap="round"
              />
            )}
            {isRoute && alive && (
              <line x1={ax} y1={ay} x2={bx} y2={by}
                stroke={COLORS.CYAN} strokeWidth="5" opacity="0.09"
                strokeLinecap="round"
              />
            )}
            {/* Main link */}
            <line x1={ax} y1={ay} x2={bx} y2={by}
              stroke={isRoute ? COLORS.CYAN : (alive ? COLORS.STEEL : COLORS.MAGENTA)}
              strokeWidth={isRoute ? 1.6 : (alive ? 0.75 : 1)}
              strokeDasharray={isRoute ? '10 5' : (!alive ? '5 4' : undefined)}
              className={isRoute && alive ? 'route-march' : undefined}
              opacity={isRoute ? 0.92 : (alive ? 0.26 : 0.55)}
              style={{ pointerEvents: 'stroke' }}
            />
          </g>
        )
      })}

      {/* ── Planets ───────────────────────────────────────────────────────── */}
      {snapshot.nodes.map(node => {
        const [cx, cy] = toSVG(node.x, node.y)
        const pr      = planetPx(node.radius_km)
        const ar      = atmoPx(node.radius_km, node.atmosphere_thickness_km)
        const inRoute = route?.path?.includes(node.id) ?? false
        const alive   = node.alive
        const color   = planetColor(node.codex)
        const shade   = planetColorPair(node.codex)[1]

        return (
          <g key={node.id}
            onClick={() => handlePlanetClick(node.id)}
            style={{ cursor: killMode ? 'crosshair' : 'default' }}
          >
            {/* Outer atmosphere corona */}
            <circle cx={cx} cy={cy} r={ar + 16}
              fill="none" stroke={alive ? color : COLORS.MAGENTA}
              strokeWidth="14" opacity="0.035"
            />
            {/* Atmosphere shell */}
            <circle cx={cx} cy={cy} r={ar}
              fill={`${color}10`} stroke={alive ? color : COLORS.MAGENTA}
              strokeWidth="0.85" opacity={alive ? 0.38 : 0.14}
            />
            {/* Inner atmosphere ring */}
            <circle cx={cx} cy={cy} r={(pr * 1.15 + ar) / 2}
              fill="none" stroke={alive ? color : COLORS.MAGENTA}
              strokeWidth="0.5" opacity={alive ? 0.14 : 0.05}
            />
            {/* Equatorial tower ring (dashed) */}
            <circle cx={cx} cy={cy} r={pr + 2.5}
              fill="none" stroke={alive ? color : COLORS.STEEL}
              strokeWidth="0.6" strokeDasharray="2.5 2"
              opacity={alive ? 0.22 : 0.07}
            />

            {/* Active-route pulsing ring */}
            {inRoute && alive && (
              <circle cx={cx} cy={cy} r={pr + 8}
                fill="none" stroke={color}
                strokeWidth="1.8" opacity="0.75"
                className="planet-pulse"
              />
            )}

            {/* Dead alarm ring */}
            {!alive && (
              <circle cx={cx} cy={cy} r={ar + 8}
                fill="none" stroke={COLORS.MAGENTA}
                strokeWidth="1.5" strokeDasharray="5 3"
                opacity="0.85" className="dead-ring"
              />
            )}

            {/* Planet body — flat crayon fill, ink outline, soft pencil shading */}
            {alive ? (
              <>
                <circle cx={cx} cy={cy} r={pr}
                  fill={color} stroke={COLORS.TEXT_HI} strokeWidth={inRoute ? 2.6 : 2} />
                <circle cx={cx + pr * 0.28} cy={cy + pr * 0.28} r={pr * 0.6}
                  fill={shade} opacity="0.16" />
              </>
            ) : (
              <>
                <circle cx={cx} cy={cy} r={pr}
                  fill="#FBF5E6" stroke={COLORS.MAGENTA} strokeWidth="2" />
                <circle cx={cx} cy={cy} r={pr}
                  fill="url(#hatch)" />
              </>
            )}

            {/* Tower dots — small circles on the equatorial ring */}
            {Array.from({ length: node.active_towers }, (_, k) => {
              const [tx, ty] = towerPx(cx, cy, k, node.active_towers, pr)
              const angle    = (2 * Math.PI * k) / node.active_towers
              const outX     = Math.sin(angle)
              const outY     = -Math.cos(angle)
              const lx = tx + outX * 11, ly = ty + outY * 11
              const isActive = route?.hop_log?.some(
                h => h.planet === node.id && (h.recv_tower === k || h.send_tower === k)
              ) ?? false

              return (
                <g key={k}>
                  {/* Packet-flash glow — opacity driven by RAF, starts hidden */}
                  <circle
                    data-relic-planet={node.id}
                    data-relic-tower={k}
                    cx={tx} cy={ty} r={10}
                    fill={color} opacity={0}
                    filter="url(#glow)"
                  />
                  {/* Tower dot sitting on equator */}
                  <circle
                    cx={tx} cy={ty}
                    r={isActive ? 3.5 : 2.2}
                    fill={isActive ? color : (alive ? `${color}28` : `${COLORS.STEEL}40`)}
                    stroke={isActive ? color : (alive ? `${color}80` : COLORS.STEEL)}
                    strokeWidth={0.7}
                    opacity={alive ? (isActive ? 1 : 0.72) : 0.2}
                    filter={isActive ? 'url(#glow-sm)' : undefined}
                  />
                  {/* Label — decluttered: only when active or zoomed in */}
                  {(isActive || view.w < W * 0.55) && (
                    <text x={lx} y={ly}
                      textAnchor="middle" dominantBaseline="middle"
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize="7.5"
                      fill={isActive ? color : (alive ? `${color}99` : COLORS.STEEL)}
                      opacity={isActive ? 0.95 : 0.4}
                    >T{k + 1}</text>
                  )}
                </g>
              )
            })}

            {/* Planet name */}
            <text x={cx} y={cy - ar - 7}
              textAnchor="middle"
              fontFamily="'Orbitron', sans-serif"
              fontSize="12" fontWeight="700" letterSpacing="2"
              fill={alive ? color : COLORS.TEXT_DIM}
              filter={inRoute && alive ? 'url(#glow-xs)' : undefined}
            >
              {node.id.toUpperCase()}
            </text>
            {/* Codex label */}
            <text x={cx} y={cy - ar - 20}
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="9" letterSpacing="0.04em"
              fill={COLORS.TEXT_DIM} opacity="0.65"
            >
              BASE-{node.codex}
            </text>
          </g>
        )
      })}

      {/* ── Packet (all DOM-mutated, no React re-renders per frame) ─────── */}
      </g>{/* end hand-drawn sketch group */}

      {/* Trail */}
      {Array.from({ length: TRAIL_LEN }, (_, i) => (
        <circle key={`trail-${i}`}
          ref={el => { trailRefs.current[i] = el }}
          cx={-1000} cy={-1000} r={0}
          fill={COLORS.CYAN}
        />
      ))}
      {/* Outer pulse ring */}
      <circle ref={packetRingRef} cx={-1000} cy={-1000} r={0}
        fill="none" stroke={COLORS.CYAN} strokeWidth="1.5"
        className="packet-outer"
      />
      {/* Main packet dot */}
      <circle ref={packetDotRef} cx={-1000} cy={-1000} r={0}
        fill={COLORS.CYAN} filter="url(#glow)"
      />
      {/* Bright inner core */}
      <circle ref={packetCoreRef} cx={-1000} cy={-1000} r={0}
        fill="white" opacity="0.9"
      />
      {/* HUD label */}
      <rect ref={packetLabelRef} x={-1000} y={-1000} width={52} height={15}
        rx={3} fill="#FBF5E6"
        stroke={COLORS.TEXT_HI} strokeWidth="1"
      />
      <text ref={packetTextRef} x={-1000} y={-1000}
        textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="8" fontWeight="700" letterSpacing="0.12em"
        fill={COLORS.CYAN}
      />
    </svg>

    {/* Zoom / pan controls */}
    <div className="map-controls">
      <button className="map-btn" title="Zoom in" aria-label="Zoom in"
        onClick={() => zoomByButton(1)}><span>+</span></button>
      <button className="map-btn" title="Zoom out" aria-label="Zoom out"
        onClick={() => zoomByButton(-1)}><span>&#8211;</span></button>
      <button className="map-btn" title="Reset view" aria-label="Reset view"
        onClick={resetView}>
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '7px', fontWeight: 700 }}>FIT</span>
      </button>
    </div>
    </div>
  )
}
