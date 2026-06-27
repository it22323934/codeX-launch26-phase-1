import { useStore } from '../store'
import { COLORS } from '../constants/visual'

const COMPONENTS: [string, keyof typeof dummyLat, string, string][] = [
  ['VOID',       'void_ms',       COLORS.CYAN,    '//  vacuum laser propagation'],
  ['ATMOSPHERE', 'atmosphere_ms', '#6EC6FF',      '//  ionospheric refraction loss'],
  ['FIBER',      'fiber_ms',      '#A78BFA',      '//  subsurface crust transit'],
  ['TOWER',      'tower_ms',      COLORS.MAGENTA, '//  processing penalty'],
]

const dummyLat = { void_ms: 0, atmosphere_ms: 0, fiber_ms: 0, tower_ms: 0, total_ms: 0 }

function Bar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0
  return (
    <div style={{
      height: '3px', background: `rgba(58,74,99,0.3)`,
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
    { pct: (lat.atmosphere_ms / total) * 100, color: '#6EC6FF',      key: 'a' },
    { pct: (lat.fiber_ms / total) * 100,      color: '#A78BFA',      key: 'f' },
    { pct: (lat.tower_ms / total) * 100,      color: COLORS.MAGENTA, key: 't' },
  ]
  return (
    <div style={{
      display: 'flex', height: '10px', width: '100%',
      borderRadius: '5px', overflow: 'hidden',
      background: 'rgba(43,39,34,0.12)',
      border: `1.5px solid ${COLORS.TEXT_HI}`,
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
                        width: 11, height: 11, borderRadius: '50%',
                        background: color, border: `1.5px solid ${COLORS.TEXT_HI}`,
                      }} />
                      <span style={{
                        fontSize: '13px', fontWeight: 700, color: COLORS.TEXT_HI,
                      }}>{key}</span>
                      <span style={{
                        fontSize: '11px', color: COLORS.TEXT_DIM,
                      }}>{comment}</span>
                    </div>
                    <span style={{
                      fontSize: '15px', fontWeight: 700, color,
                    }}>
                      {val.toFixed(3)}
                      <span style={{ fontSize: '11px', color: COLORS.TEXT_DIM, fontWeight: 400 }}> ms</span>
                    </span>
                  </div>
                  <Bar value={val} total={lat.total_ms} color={color} />
                </div>
              )
            })}

            {/* Divider */}
            <div style={{
              borderTop: `1px solid rgba(52,227,255,0.1)`,
              margin: '10px 0 8px',
            }} />

            {/* Total */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '14px', fontWeight: 700,
                letterSpacing: '0.04em', color: COLORS.TEXT_HI,
              }}>Total time</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '20px', fontWeight: 700,
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
