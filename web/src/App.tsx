import { useEffect, useState } from 'react'
import { useStore } from './store'
import { fetchUniverse, connectWS } from './api'
import { COLORS } from './constants/visual'
import { SceneCanvas }    from './three/SceneCanvas'
import { Toolbar }        from './panels/Toolbar'
import { TelemetryPanel } from './panels/TelemetryPanel'
import { HopLogPanel }    from './panels/HopLogPanel'
import { EncodingPanel }  from './panels/EncodingPanel'
import { StatusBar }      from './panels/StatusBar'

const PANEL_W = 400

export default function App() {
  const { setSnapshot, setRoute, setBooted } = useStore()
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    fetchUniverse().then(snap => { if (snap) setSnapshot(snap) })
    const disconnect = connectWS(
      snap   => setSnapshot(snap),
      result => setRoute(result)
    )
    const t = setTimeout(() => setBooted(true), 60)
    return () => { disconnect(); clearTimeout(t) }
  }, [setSnapshot, setRoute, setBooted])

  const panels = (
    <>
      <div className="hud-panel panel-boot" style={{ animationDelay: '0ms',   borderRadius: '4px', flexShrink: 0 }}>
        <Toolbar />
      </div>
      <div className="hud-panel panel-boot" style={{ animationDelay: '120ms', borderRadius: '4px', flexShrink: 0 }}>
        <TelemetryPanel />
      </div>
      <div className="hud-panel panel-boot" style={{ animationDelay: '240ms', borderRadius: '4px', flexShrink: 0, minHeight: 0, overflow: 'hidden' }}>
        <HopLogPanel />
      </div>
      <div className="hud-panel panel-boot" style={{ animationDelay: '360ms', borderRadius: '4px', flexShrink: 0 }}>
        <EncodingPanel />
      </div>
    </>
  )

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100vw', height: '100vh',
      background: COLORS.VOID_BLACK, overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        height: '36px', flexShrink: 0,
        borderBottom: `1px solid rgba(52,227,255,0.1)`,
        background: 'rgba(8,12,20,0.9)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '12px',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: COLORS.CYAN, boxShadow: `0 0 10px ${COLORS.CYAN}`,
        }} />
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '11px', fontWeight: 900, letterSpacing: '0.25em',
          color: COLORS.CYAN,
        }}>
          RELIC RING PROTOCOL
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px', color: COLORS.TEXT_DIM, letterSpacing: '0.1em',
        }}>
          // ZETA-26 INTERPLANETARY ROUTING ENGINE
        </span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '8px', color: COLORS.TEXT_DIM, letterSpacing: '0.08em',
        }}>
          SYS:ONLINE &nbsp;|&nbsp; NODES:ACTIVE
        </span>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* 3D/2D Canvas */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <SceneCanvas />

          {/* Mobile drawer toggle */}
          {mobile && (
            <button
              onClick={() => setDrawerOpen(o => !o)}
              style={{
                position: 'absolute', bottom: 16, right: 16,
                background: 'rgba(8,12,20,0.9)',
                color: COLORS.CYAN,
                border: `1px solid rgba(52,227,255,0.4)`,
                borderRadius: '3px', padding: '8px 14px',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
                cursor: 'pointer', zIndex: 10,
                boxShadow: `0 0 14px rgba(52,227,255,0.2)`,
              }}
            >
              {drawerOpen ? '[ CLOSE HUD ]' : '[ OPEN HUD ]'}
            </button>
          )}
        </div>

        {/* Desktop side panels */}
        {!mobile && (
          <div style={{
            width: `${PANEL_W}px`, minWidth: `${PANEL_W}px`,
            display: 'flex', flexDirection: 'column',
            gap: '5px', padding: '6px 6px 6px 0',
            overflowY: 'auto',
            borderLeft: `1px solid rgba(52,227,255,0.08)`,
          }}>
            {panels}
          </div>
        )}

        {/* Mobile drawer */}
        {mobile && drawerOpen && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            maxHeight: '65vh', overflowY: 'auto',
            background: COLORS.PANEL_BLACK,
            borderTop: `1px solid rgba(52,227,255,0.2)`,
            zIndex: 20, display: 'flex', flexDirection: 'column',
            gap: '5px', padding: '10px',
          }}>
            {panels}
          </div>
        )}
      </div>

      <StatusBar />
    </div>
  )
}
