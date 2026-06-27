import { useStore } from '../store'
import { COLORS } from '../constants/visual'

const COMPONENTS: [string, keyof typeof dummyLat, string, string][] = [
  ['VOID',       'void_ms',       COLORS.CYAN,    '//  vacuum laser propagation'],
  ['ATMOSPHERE', 'atmosphere_ms', '#5B93B0',      '//  ionospheric refraction loss'],
  ['FIBER',      'fiber_ms',      '#5E9B8C',      '//  subsurface crust transit'],
  ['TOWER',      'tower_ms',      COLORS.MAGENTA, '//  processing penalty'],
]

const dummyLat = { void_ms: 0, atmosphere_ms: 0, fiber_ms: 0, tower_ms: 0, total_ms: 0 }

function Bar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0
  return (
    <div style={{
      height: '3px', background: `rgba(155,145,118,0.2)`,
      borderRadius: '2px', overflow: 'hidden', flex: 1,
    }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: color,
        transition: 'width 0.4s ease',
        minWidth: pct > 0 ? '2px' : '0',
      }} />
    </div>
  )
}

function StackedBar({ lat }: { lat: typeof dummyLat }) {
  const total = lat.total_ms || 1
  const pcts = [
    { pct: (lat.void_ms / total) * 100,       color: COLORS.CYAN,    key: 'v' },
    { pct: (lat.atmosphere_ms / total) * 100, color: '#5B93B0',      key: 'a' },
    { pct: (lat.fiber_ms / total) * 100,      color: '#5E9B8C',      key: 'f' },
    { pct: (lat.tower_ms / total) * 100,      color: COLORS.MAGENTA, key: 't' },
  ]
  return (
    <div style={{
      display: 'flex', height: '6px', width: '100%',
      borderRadius: '3px', overflow: 'hidden',
      background: 'rgba(155,145,118,0.18)',
      border: '1px solid rgba(43,39,34,0.12)',
      marginBottom: '14px',
    }}>
      {pcts.map(({ pct, color, key }) => (
        <div key={key} style={{
          width: `${pct}%`, background: color,
          transition: 'width 0.4s ease',
          minWidth: pct > 0 ? '2px' : '0',
        }} />
      ))}
    </div>
  )
}

export function TelemetryPanel() {
  const lat = useStore(s => s.route?.latency)

  return (
    <div>
      <div className="panel-header">
        <div className="panel-header-dot" />
        <span className="panel-header-title">Latency</span>
        <span className="panel-header-badge">ms</span>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {!lat ? (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px', color: COLORS.TEXT_DIM,
            letterSpacing: '0.08em',
          }}>
            Send a message to see the timing.
          </div>
        ) : (
          <>
            <StackedBar lat={lat} />

            {COMPONENTS.map(([key, field, color, comment]) => {
              const val = lat[field as keyof typeof lat] as number
              return (
                <div key={key} style={{ marginBottom: '8px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: '4px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: color,
                      }} />
                      <span style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '7px', fontWeight: 700,
                        letterSpacing: '0.14em', color: COLORS.TEXT_DIM,
                      }}>{key}</span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '7px', color: 'rgba(111,128,153,0.45)',
                      }}>{comment}</span>
                    </div>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px', fontWeight: 700, color,
                    }}>
                      {val.toFixed(3)}
                      <span style={{ fontSize: '8px', color: COLORS.TEXT_DIM, fontWeight: 400 }}> ms</span>
                    </span>
                  </div>
                  <Bar value={val} total={lat.total_ms} color={color} />
                </div>
              )
            })}

            {/* Divider */}
            <div style={{
              borderTop: `1px solid rgba(43,39,34,0.15)`,
              margin: '10px 0 8px',
            }} />

            {/* Total */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '8px', fontWeight: 700,
                letterSpacing: '0.04em', color: COLORS.TEXT_HI,
              }}>Total time</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '18px', fontWeight: 700,
                  color: COLORS.CYAN,
                  lineHeight: 1,
                }}>
                  {lat.total_ms.toFixed(2)}
                  <span style={{ fontSize: '10px', color: COLORS.TEXT_DIM, fontWeight: 400 }}> ms</span>
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px', color: COLORS.TEXT_DIM, marginTop: '2px',
                }}>
                  {(lat.total_ms / 1000).toFixed(6)} s
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
