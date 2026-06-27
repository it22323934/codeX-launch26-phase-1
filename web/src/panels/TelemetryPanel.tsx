import { useState } from 'react'
import { useStore } from '../store'
import { COLORS, INK } from '../constants/visual'
import { TIME_UNITS, formatInUnit, humanizeDuration, type TimeUnitKey } from '../utils/time'

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

// ── Time-unit stepper ─────────────────────────────────────────────────────────
// A spinner-style control: press ▲ / ▼ to cycle the time metric (Auto → ms →
// seconds → … → years) instead of opening a dropdown list.

function ArrowBtn({ dir, onClick }: { dir: 'up' | 'down'; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={dir === 'up' ? 'Previous unit' : 'Next unit'}
      style={{
        flex: 1, width: '26px', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? COLORS.CYAN : 'transparent',
        color: hov ? '#FBF5E6' : COLORS.TEXT_HI,
        border: 'none',
        borderBottom: dir === 'up' ? `1.5px solid ${INK.LINE}` : 'none',
        cursor: 'pointer', outline: 'none',
        fontSize: '9px', lineHeight: 1, transition: 'background 0.12s',
      }}
    >
      {dir === 'up' ? '▲' : '▼'}
    </button>
  )
}

function UnitStepper({ unit, onChange }: {
  unit: TimeUnitKey; onChange: (u: TimeUnitKey) => void
}) {
  const idx = Math.max(0, TIME_UNITS.findIndex(u => u.key === unit))
  const current = TIME_UNITS[idx]
  const cycle = (dir: 1 | -1) => {
    const n = TIME_UNITS.length
    onChange(TIME_UNITS[(idx + dir + n) % n].key)
  }
  return (
    <div
      title="Use the arrows to change the time unit"
      style={{
        display: 'inline-flex', alignItems: 'stretch', width: 'fit-content',
        border: `2px solid ${INK.LINE}`,
        borderRadius: '8px 6px 9px 6px',
        background: INK.PAPER_INPUT, overflow: 'hidden',
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center',
        padding: '4px 10px', minWidth: '96px',
        fontSize: '14px', fontWeight: 700, color: COLORS.TEXT_HI,
      }}>
        {current.label}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `1.5px solid ${INK.LINE}` }}>
        <ArrowBtn dir="up"   onClick={() => cycle(-1)} />
        <ArrowBtn dir="down" onClick={() => cycle(1)}  />
      </div>
    </div>
  )
}

export function TelemetryPanel() {
  const lat = useStore(s => s.route?.latency)
  const [unit, setUnit] = useState<TimeUnitKey>('auto')

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

            {/* Total — with a selectable time unit (ms → years) */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{
                  fontSize: '15px', fontWeight: 700,
                  color: COLORS.TEXT_HI,
                }}>Total time</span>
                <UnitStepper unit={unit} onChange={setUnit} />
              </div>
              <div style={{ textAlign: 'right', minWidth: 0 }}>
                <div key={`${unit}-${lat.total_ms}`} className="latency-total" style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '20px', fontWeight: 700,
                  color: COLORS.CYAN, lineHeight: 1.05,
                  wordBreak: 'break-word',
                }}>
                  {formatInUnit(lat.total_ms, unit)}
                </div>
                {/* Always keep the precise ms and an auto reading for reference */}
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px', color: COLORS.TEXT_DIM, marginTop: '4px',
                }}>
                  {lat.total_ms.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms
                  {unit !== 'auto' && ` · ${humanizeDuration(lat.total_ms)}`}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
