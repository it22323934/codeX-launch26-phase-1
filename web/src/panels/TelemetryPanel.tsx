import { useStore } from '../store'
import { COLORS } from '../constants/visual'

const HEADING: React.CSSProperties = {
  fontFamily:    "'Orbitron', sans-serif",
  fontSize:      '9px',
  fontWeight:    700,
  letterSpacing: '0.14em',
  color:         COLORS.TEXT_DIM,
  marginBottom:  '10px',
}

const ROW: React.CSSProperties = {
  display:        'flex',
  justifyContent: 'space-between',
  alignItems:     'baseline',
  marginBottom:   '5px',
}

const KEY: React.CSSProperties = {
  fontFamily:    "'Orbitron', sans-serif",
  fontSize:      '8px',
  letterSpacing: '0.1em',
  color:         COLORS.TEXT_DIM,
}

const VAL: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize:   '12px',
  color:      COLORS.TEXT_HI,
}

const DIVIDER: React.CSSProperties = {
  borderTop:    `1px solid rgba(52, 227, 255, 0.12)`,
  margin:       '8px 0',
}

interface BarProps {
  value: number
  total: number
  color: string
}

function LatencyBar({ value, total, color }: BarProps) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0
  return (
    <div
      style={{
        height:      '3px',
        width:       `${pct}%`,
        background:  color,
        display:     'inline-block',
        verticalAlign: 'middle',
        minWidth:    pct > 0 ? '2px' : '0',
      }}
    />
  )
}

export function TelemetryPanel() {
  const route = useStore(s => s.route)
  const lat   = route?.latency

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={HEADING}>SIGNAL TELEMETRY</div>

      {!lat ? (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   '10px',
            color:      COLORS.TEXT_DIM,
          }}
        >
          [ AWAITING TRANSMISSION ]
        </div>
      ) : (
        <>
          {/* Stacked bar */}
          <div
            style={{
              display:         'flex',
              height:          '4px',
              width:           '100%',
              background:      COLORS.VOID_BLACK,
              borderRadius:    '2px',
              overflow:        'hidden',
              marginBottom:    '10px',
              border:          `1px solid rgba(52, 227, 255, 0.15)`,
            }}
          >
            <LatencyBar value={lat.void_ms}       total={lat.total_ms} color={COLORS.CYAN}    />
            <LatencyBar value={lat.atmosphere_ms} total={lat.total_ms} color={COLORS.STEEL}   />
            <LatencyBar value={lat.fiber_ms}       total={lat.total_ms} color={COLORS.TEXT_HI} />
            <LatencyBar value={lat.tower_ms}       total={lat.total_ms} color={COLORS.MAGENTA} />
          </div>

          {/* Readout rows */}
          {([
            ['VOID',       lat.void_ms,       COLORS.CYAN],
            ['ATMOSPHERE', lat.atmosphere_ms, COLORS.STEEL],
            ['FIBER',      lat.fiber_ms,      COLORS.TEXT_HI],
            ['TOWER',      lat.tower_ms,      COLORS.MAGENTA],
          ] as [string, number, string][]).map(([k, v, c]) => (
            <div key={k} style={ROW}>
              <span style={KEY}>{k}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LatencyBar value={v} total={lat.total_ms} color={c} />
                <span style={{ ...VAL, color: c }}>{v.toFixed(3)} ms</span>
              </div>
            </div>
          ))}

          <div style={DIVIDER} />

          <div style={ROW}>
            <span style={{ ...KEY, color: COLORS.TEXT_HI, fontWeight: 700 }}>TOTAL</span>
            <span style={{ ...VAL, color: COLORS.CYAN, fontSize: '14px' }}>
              {lat.total_ms.toFixed(3)} ms
            </span>
          </div>
          <div style={{ ...ROW, marginTop: '2px' }}>
            <span style={KEY} />
            <span style={{ ...VAL, color: COLORS.TEXT_DIM, fontSize: '10px' }}>
              {(lat.total_ms / 1000).toFixed(6)} s
            </span>
          </div>
        </>
      )}
    </div>
  )
}
