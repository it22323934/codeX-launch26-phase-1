import { useEffect, useState, useCallback } from 'react'
import { useStore } from './store'
import { fetchUniverse, connectWS } from './api'
import { COLORS, ANIM } from './constants/visual'
import { SceneCanvas }    from './three/SceneCanvas'
import { Toolbar }        from './panels/Toolbar'
import { TelemetryPanel } from './panels/TelemetryPanel'
import { HopLogPanel }    from './panels/HopLogPanel'
import { EncodingPanel }  from './panels/EncodingPanel'
import { StatusBar }      from './panels/StatusBar'

const PANEL_WIDTH = 380

export default function App() {
  const { setSnapshot, setRoute, setBooted, booted } = useStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobile,     setMobile]     = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    // Fetch initial topology
    fetchUniverse().then(snap => {
      if (snap) setSnapshot(snap)
    })

    // Live updates via WebSocket
    const disconnect = connectWS(
      snap => setSnapshot(snap),
      result => setRoute(result)
    )

    // Boot animation
    const bootTimer = setTimeout(() => setBooted(true), 50)

    return () => {
      disconnect()
      clearTimeout(bootTimer)
    }
  }, [setSnapshot, setRoute, setBooted])

  const panels = (
    <>
      <div
        className="hud-panel panel-boot"
        style={{ animationDelay: '0ms', borderRadius: '3px' }}
      >
        <Toolbar />
      </div>
      <div
        className="hud-panel panel-boot"
        style={{ animationDelay: '150ms', borderRadius: '3px' }}
      >
        <TelemetryPanel />
      </div>
      <div
        className="hud-panel panel-boot"
        style={{ animationDelay: '300ms', borderRadius: '3px', overflowX: 'auto' }}
      >
        <HopLogPanel />
      </div>
      <div
        className="hud-panel panel-boot"
        style={{ animationDelay: '450ms', borderRadius: '3px' }}
      >
        <EncodingPanel />
      </div>
    </>
  )

  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        width:         '100vw',
        height:        '100vh',
        background:    COLORS.VOID_BLACK,
        overflow:      'hidden',
        color:         COLORS.TEXT_HI,
      }}
    >
      {/* Main area: canvas + side panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* 3D Canvas */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <SceneCanvas />

          {/* Mobile drawer toggle */}
          {mobile && (
            <button
              onClick={() => setDrawerOpen(o => !o)}
              style={{
                position:      'absolute',
                bottom:        '16px',
                right:         '16px',
                background:    'rgba(10,14,22,0.85)',
                color:         COLORS.CYAN,
                border:        `1px solid ${COLORS.CYAN}`,
                borderRadius:  '2px',
                padding:       '8px 14px',
                fontFamily:    "'Orbitron', sans-serif",
                fontSize:      '9px',
                fontWeight:    700,
                letterSpacing: '0.1em',
                cursor:        'pointer',
                zIndex:        10,
                boxShadow:     `0 0 12px ${COLORS.CYAN}44`,
              }}
            >
              {drawerOpen ? '[ CLOSE HUD ]' : '[ OPEN HUD ]'}
            </button>
          )}
        </div>

        {/* Desktop side panels */}
        {!mobile && (
          <div
            style={{
              width:         `${PANEL_WIDTH}px`,
              minWidth:      `${PANEL_WIDTH}px`,
              display:       'flex',
              flexDirection: 'column',
              gap:           '6px',
              padding:       '8px 8px 8px 0',
              overflowY:     'auto',
            }}
          >
            {panels}
          </div>
        )}

        {/* Mobile bottom drawer */}
        {mobile && drawerOpen && (
          <div
            style={{
              position:      'absolute',
              bottom:        0,
              left:          0,
              right:         0,
              maxHeight:     '62vh',
              overflowY:     'auto',
              background:    COLORS.PANEL_BLACK,
              borderTop:     `1px solid rgba(52,227,255,0.25)`,
              zIndex:        20,
              display:       'flex',
              flexDirection: 'column',
              gap:           '6px',
              padding:       '10px',
            }}
          >
            {panels}
          </div>
        )}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
