import { useCallback, useEffect, useState } from 'react'
import { useStore } from './store'
import { loadUniverse, connectWS } from './api'
import { COLORS, INK } from './constants/visual'
import { SceneCanvas }    from './three/SceneCanvas'
import { Toolbar }        from './panels/Toolbar'
import { TelemetryPanel } from './panels/TelemetryPanel'
import { HopLogPanel }    from './panels/HopLogPanel'
import { EncodingPanel }  from './panels/EncodingPanel'
import { StatusBar }      from './panels/StatusBar'

const PANEL_W = 400

type PanelMode = 'normal' | 'collapsed' | 'full'

export default function App() {
  const setSnapshot      = useStore(s => s.setSnapshot)
  const setRoute         = useStore(s => s.setRoute)
  const setBooted        = useStore(s => s.setBooted)
  const connection       = useStore(s => s.connection)
  const loadError        = useStore(s => s.loadError)
  const wsConnected      = useStore(s => s.wsConnected)
  const snapshot         = useStore(s => s.snapshot)
  const route            = useStore(s => s.route)
  const killMode         = useStore(s => s.killMode)
  const setConnection    = useStore(s => s.setConnection)
  const setLoadError     = useStore(s => s.setLoadError)
  const setWsConnected   = useStore(s => s.setWsConnected)
  const setTransmitError = useStore(s => s.setTransmitError)

  const [mobile, setMobile]         = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [panelMode, setPanelMode]   = useState<PanelMode>('normal')

  // ── Initial load + retry ───────────────────────────────────────────────────
  const boot = useCallback(async () => {
    setConnection('connecting')
    setLoadError(null)
    const res = await loadUniverse()
    if (res.ok) {
      setSnapshot(res.snapshot)
      setConnection('online')
    } else {
      setLoadError(res.error)
      setConnection('error')
    }
  }, [setConnection, setLoadError, setSnapshot])

  useEffect(() => {
    boot()
    const disconnect = connectWS(
      snap   => { setSnapshot(snap); setConnection('online') },
      result => { setRoute(result); setTransmitError(null) },
      ok     => setWsConnected(ok),
    )
    const t = setTimeout(() => setBooted(true), 60)
    return () => { disconnect(); clearTimeout(t) }
  }, [boot, setSnapshot, setRoute, setBooted, setConnection, setWsConnected, setTransmitError])

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Top-bar status ─────────────────────────────────────────────────────────
  const total = snapshot?.nodes.length ?? 0
  const aliveCount = snapshot?.nodes.filter(n => n.alive).length ?? 0
  const conn =
    connection === 'error'        ? { c: COLORS.MAGENTA, t: 'Offline' }
    : connection === 'connecting' ? { c: COLORS.STEEL,   t: 'Connecting' }
    : wsConnected                 ? { c: COLORS.CYAN,    t: 'Connected' }
    :                               { c: '#B07A1E',      t: 'Reconnecting' }

  const fullMode      = !mobile && panelMode === 'full'
  const railVisible   = !mobile && panelMode !== 'collapsed'

  // Vertical stack — used in the normal side rail and the mobile drawer.
  const panels = (
    <>
      <div className="hud-panel panel-boot" style={{ animationDelay: '0ms',   flexShrink: 0, marginBottom: '8px' }}>
        <Toolbar />
      </div>
      <div className="hud-panel panel-boot" style={{ animationDelay: '120ms', flexShrink: 0, marginBottom: '8px' }}>
        <TelemetryPanel />
      </div>
      <div className="hud-panel panel-boot" style={{ animationDelay: '240ms', flexShrink: 0, marginBottom: '8px' }}>
        <HopLogPanel />
      </div>
      <div className="hud-panel panel-boot" style={{ animationDelay: '360ms', flexShrink: 0, marginBottom: '8px' }}>
        <EncodingPanel />
      </div>
    </>
  )

  // Full-screen layout — Controls + Latency on the top row, Route steps
  // spanning beneath them (left region), Number-base translation down the
  // right. Nested flexboxes, so no panel overlaps the way a grid span did.
  const fullPanels = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' }}>
      <div style={{ flex: '2 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' }}>
          <div className="hud-panel panel-boot" style={{ flex: '1 1 240px', minWidth: 0, animationDelay: '0ms' }}>
            <Toolbar />
          </div>
          <div className="hud-panel panel-boot" style={{ flex: '1 1 240px', minWidth: 0, animationDelay: '120ms' }}>
            <TelemetryPanel />
          </div>
        </div>
        <div className="hud-panel panel-boot" style={{ animationDelay: '240ms' }}>
          <HopLogPanel />
        </div>
      </div>
      <div className="hud-panel panel-boot" style={{ flex: '1 1 300px', minWidth: 0, animationDelay: '360ms' }}>
        <EncodingPanel />
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* ── Top bar (a strip of tape across the notebook) ─────────────────── */}
      <div style={{
        height: '42px', flexShrink: 0,
        borderBottom: `2px solid ${INK.LINE}`, background: '#F1E7CF',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px',
      }}>
        <div className={conn.t === 'Connected' ? 'dot-active' : ''} style={{
          width: 9, height: 9, borderRadius: '50%',
          background: conn.c, border: `1.5px solid ${INK.LINE}`,
        }} />
        <span className="sketch-title" style={{ fontSize: '24px', color: INK.LINE, lineHeight: 1 }}>
          Relic Ring Protocol
        </span>
<div style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: conn.c }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: conn.c, border: `1px solid ${INK.LINE}`, display: 'inline-block' }} />
          {conn.t}
        </span>
        <span style={{ fontSize: '13px', color: COLORS.TEXT_DIM }}>
          {aliveCount} of {total} planets live
        </span>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Sketch map */}
        {!fullMode && (
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <div className="holo-stage">
              <div className="holo-tilt">
                <SceneCanvas />
              </div>
              <div className="holo-vignette" />

              {/* System name chip — top-left, mirroring the Key button */}
              {snapshot?.system_name && (
                <div className="system-name-chip">
                  {snapshot.system_name}
                </div>
              )}

              <button
                className={`help-btn ${showLegend ? 'on' : ''}`}
                onClick={() => setShowLegend(v => !v)}
                title="Show the colour key and map controls"
              >
                {showLegend ? 'Hide key' : 'Key'}
              </button>
              {showLegend && (
                <div className="legend">
                  <h4>Key</h4>
                  <div className="legend-row"><span className="legend-line" style={{ borderTop: `3px solid ${COLORS.CYAN}` }} /> Chosen route</div>
                  <div className="legend-row"><span className="legend-line" style={{ borderTop: `2px solid ${COLORS.STEEL}` }} /> Open link</div>
                  <div className="legend-row"><span className="legend-line" style={{ borderTop: `2px dashed ${COLORS.MAGENTA}` }} /> Broken link</div>
                  <div className="legend-row"><span className="legend-swatch" style={{ background: COLORS.CYAN }} /> Working planet</div>
                  <div className="legend-row"><span className="legend-swatch" style={{ background: '#FBF5E6' }} /> Dead planet</div>
                  <div style={{ height: 1, background: 'rgba(43,39,34,0.2)', margin: '8px 0' }} />
                  <div className="legend-row">Scroll to zoom, drag to pan</div>
                  <div className="legend-row">Break mode: click a planet or link</div>
                </div>
              )}

              {connection === 'online' && snapshot && (killMode || !route) && (
                <div className="hint-pill" style={killMode ? { borderColor: COLORS.MAGENTA, color: COLORS.MAGENTA } : undefined}>
                  {killMode
                    ? 'Break mode on — click a planet or link to break it'
                    : 'Pick a start and an end, then press Send'}
                </div>
              )}

              {connection === 'connecting' && (
                <div className="overlay">
                  <div className="spinner" />
                  <div className="overlay-title">Connecting</div>
                  <div className="overlay-msg">Reaching the routing engine...</div>
                </div>
              )}

              {connection === 'error' && (
                <div className="overlay">
                  <div className="overlay-title err">Could not load the map</div>
                  <div className="overlay-msg">{loadError ?? 'Something went wrong loading the universe.'}</div>
                  <button className="btn-hud err" onClick={boot}>Try again</button>
                </div>
              )}
            </div>

            {mobile && (
              <button
                onClick={() => setDrawerOpen(o => !o)}
                style={{
                  position: 'absolute', bottom: 16, right: 16, zIndex: 25,
                  background: '#FBF5E6', color: INK.LINE, border: `2px solid ${INK.LINE}`,
                  borderRadius: '10px 8px 11px 8px', padding: '8px 14px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '2px 2px 0 rgba(43,39,34,0.2)',
                }}
              >
                {drawerOpen ? 'Close details' : 'Details'}
              </button>
            )}
          </div>
        )}

        {/* Reopen tab when the panel is collapsed */}
        {!mobile && panelMode === 'collapsed' && (
          <button className="rail-btn" onClick={() => setPanelMode('normal')}
            title="Show the details panel"
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 25 }}>
            Show details
          </button>
        )}

        {/* Details panel (collapsible / full-screen) */}
        {railVisible && (
          <aside style={{
            display: 'flex', flexDirection: 'column',
            width: fullMode ? '100%' : `${PANEL_W}px`,
            minWidth: fullMode ? 0 : `${PANEL_W}px`,
            flex: fullMode ? 1 : 'none',
            borderLeft: fullMode ? 'none' : `2px solid ${INK.LINE}`,
            background: COLORS.VOID_BLACK,
          }}>
            <div className="rail-header">
              <span className="sketch-title" style={{ fontSize: '20px', color: INK.LINE, flex: 1 }}>
                Details
              </span>
              <button className="rail-btn" onClick={() => setPanelMode(fullMode ? 'normal' : 'full')}
                title={fullMode ? 'Back to split view' : 'Expand to full screen'}>
                {fullMode ? 'Exit full screen' : 'Full screen'}
              </button>
              {!fullMode && (
                <button className="rail-btn" onClick={() => setPanelMode('collapsed')} title="Hide the panel">
                  Hide
                </button>
              )}
            </div>
            {/* Full screen lays panels out in the two-region layout; normal
                mode is a simple vertical stack in the side rail. */}
            <div
              className="panel-grow"
              key={panelMode}
              style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px',
                ...(fullMode ? {} : { display: 'flex', flexDirection: 'column' }),
              }}
            >
              {fullMode ? fullPanels : panels}
            </div>
          </aside>
        )}

        {/* Mobile drawer */}
        {mobile && drawerOpen && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            maxHeight: '65vh', overflowY: 'auto',
            background: COLORS.VOID_BLACK, borderTop: `2px solid ${INK.LINE}`,
            zIndex: 20, display: 'flex', flexDirection: 'column', padding: '10px',
          }}>
            {panels}
          </div>
        )}
      </div>

      <StatusBar />
    </div>
  )
}
