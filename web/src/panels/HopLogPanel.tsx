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

const TH: React.CSSProperties = {
  fontFamily:    "'Orbitron', sans-serif",
  fontSize:      '7px',
  fontWeight:    700,
  letterSpacing: '0.08em',
  color:         COLORS.TEXT_DIM,
  padding:       '4px 6px',
  textAlign:     'left',
  borderBottom:  `1px solid rgba(52, 227, 255, 0.12)`,
  whiteSpace:    'nowrap',
}

const TD: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize:   '9px',
  color:      COLORS.TEXT_HI,
  padding:    '3px 6px',
  whiteSpace: 'nowrap',
}

function RoleChip({ role }: { role: string }) {
  const isOrigin = role?.toUpperCase().includes('ORIGIN')
  const isDest   = role?.toUpperCase().includes('DEST')
  const color    = isOrigin ? COLORS.CYAN : isDest ? COLORS.MAGENTA : COLORS.STEEL
  return (
    <span
      style={{
        color,
        fontFamily:    "'Orbitron', sans-serif",
        fontSize:      '7px',
        letterSpacing: '0.05em',
        border:        `1px solid ${color}`,
        borderRadius:  '2px',
        padding:       '1px 4px',
      }}
    >
      {(role ?? 'RELAY').toUpperCase()}
    </span>
  )
}

export function HopLogPanel() {
  const route = useStore(s => s.route)
  const hops  = route?.hop_log ?? []

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={HEADING}>HOP LOG</div>

      {hops.length === 0 ? (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   '10px',
            color:      COLORS.TEXT_DIM,
          }}
        >
          [ NO ROUTE COMPUTED ]
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              borderCollapse: 'collapse',
              width:           '100%',
              tableLayout:     'auto',
            }}
          >
            <thead>
              <tr>
                <th style={TH}>PLANET</th>
                <th style={TH}>ROLE</th>
                <th style={TH}>RECV</th>
                <th style={TH}>SEND</th>
                <th style={TH}>HIT</th>
                <th style={TH}>FIBER ms</th>
                <th style={TH}>VOID km</th>
                <th style={TH}>VOID ms</th>
              </tr>
            </thead>
            <tbody>
              {hops.map((hop, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? 'transparent' : 'rgba(52,227,255,0.03)',
                  }}
                >
                  <td style={{ ...TD, color: COLORS.CYAN, fontWeight: 700 }}>
                    {(hop.planet ?? '-').toUpperCase()}
                  </td>
                  <td style={TD}>
                    <RoleChip role={hop.role} />
                  </td>
                  <td style={TD}>{hop.recv_tower ?? '-'}</td>
                  <td style={TD}>{hop.send_tower ?? '-'}</td>
                  <td style={TD}>{hop.towers_hit ?? '-'}</td>
                  <td style={{ ...TD, color: COLORS.TEXT_DIM }}>
                    {hop.fiber_ms != null ? hop.fiber_ms.toFixed(3) : '-'}
                  </td>
                  <td style={{ ...TD, color: COLORS.TEXT_DIM }}>
                    {hop.void_km != null ? hop.void_km.toLocaleString() : '-'}
                  </td>
                  <td style={{ ...TD, color: COLORS.TEXT_DIM }}>
                    {hop.void_ms != null ? hop.void_ms.toFixed(3) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
