import { useStore } from '../store'
import { COLORS } from '../constants/visual'

const ROLE_COLOR: Record<string, string> = {
  origin:      COLORS.CYAN,
  relay:       '#A78BFA',
  destination: COLORS.MAGENTA,
}

function RoleChip({ role }: { role: string }) {
  const color = ROLE_COLOR[role?.toLowerCase()] ?? COLORS.STEEL
  return (
    <span style={{
      fontSize: '11px', fontWeight: 700,
      color, border: `1.5px solid ${color}`,
      borderRadius: '6px 4px 7px 4px', padding: '1px 7px',
      background: `${color}12`,
    }}>
      {(role ?? 'RELAY').toUpperCase()}
    </span>
  )
}

export function HopLogPanel() {
  const route = useStore(s => s.route)
  const hops  = route?.hop_log ?? []

  return (
    <div>
      <div className="panel-header">
        <div className="panel-header-dot" />
        <span className="panel-header-title">Route steps</span>
        <span className="panel-header-badge">{hops.length > 0 ? `${hops.length} stops` : '--'}</span>
      </div>

      <div style={{ padding: '10px 14px' }}>
        {hops.length === 0 ? (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px', color: COLORS.TEXT_DIM, letterSpacing: '0.08em',
          }}>
            No route yet — send a message first.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  {['Planet','Role','In','Out','Towers','Fiber ms','Void km','Void ms'].map(h => (
                    <th key={h} style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: '6px', fontWeight: 700,
                      letterSpacing: '0.08em', color: COLORS.TEXT_DIM,
                      padding: '4px 8px', textAlign: 'left',
                      borderBottom: `1px solid rgba(52,227,255,0.1)`,
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hops.map((hop, i) => {
                  const role  = hop.role?.toLowerCase() ?? 'relay'
                  const color = ROLE_COLOR[role] ?? COLORS.STEEL
                  const fiberMs   = (hop as any).fiber?.ms as number | null | undefined
                  const crossVoid = (hop as any).crossing
                  const voidKm    = crossVoid?.void_km   as number | null | undefined
                  const voidMs    = crossVoid?.void_ms   as number | null | undefined
                  return (
                    <tr key={i} style={{
                      background: i % 2 === 0 ? 'transparent' : 'rgba(52,227,255,0.02)',
                      borderBottom: `1px solid rgba(52,227,255,0.04)`,
                    }}>
                      <td style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px', fontWeight: 700,
                        color, padding: '5px 8px', whiteSpace: 'nowrap',
                      }}>
                        {(hop.planet ?? '-').toUpperCase()}
                      </td>
                      <td style={{ padding: '5px 8px' }}>
                        <RoleChip role={hop.role} />
                      </td>
                      {[
                        hop.recv_tower ?? '-',
                        hop.send_tower ?? '-',
                        hop.towers_hit ?? '-',
                      ].map((v, ci) => (
                        <td key={ci} style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '9px', color: COLORS.TEXT_HI,
                          padding: '5px 8px', textAlign: 'center',
                        }}>{String(v)}</td>
                      ))}
                      <td style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px', color: '#A78BFA',
                        padding: '5px 8px', textAlign: 'right',
                      }}>
                        {fiberMs != null ? fiberMs.toFixed(3) : '-'}
                      </td>
                      <td style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px', color: COLORS.TEXT_DIM,
                        padding: '5px 8px', textAlign: 'right',
                      }}>
                        {voidKm != null ? Number(voidKm).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}
                      </td>
                      <td style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px', color: COLORS.CYAN,
                        padding: '5px 8px', textAlign: 'right',
                      }}>
                        {voidMs != null ? voidMs.toFixed(3) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
