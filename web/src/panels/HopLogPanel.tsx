import { useStore } from '../store'
import { COLORS } from '../constants/visual'

const ROLE_COLOR: Record<string, string> = {
  origin:      COLORS.CYAN,
  relay:       '#A78BFA',
  destination: COLORS.MAGENTA,
}
const ROLE_ABBR: Record<string, string> = {
  origin: 'SRC', relay: 'VIA', destination: 'DST',
}

function RoleChip({ role }: { role: string }) {
  const key   = role?.toLowerCase() ?? 'relay'
  const color = ROLE_COLOR[key] ?? COLORS.STEEL
  const label = ROLE_ABBR[key] ?? key.toUpperCase()
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700,
      color, border: `1.5px solid ${color}`,
      borderRadius: '4px 3px 5px 3px', padding: '1px 5px',
      background: `${color}12`, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

const TH: React.CSSProperties = {
  fontSize: '9px', fontWeight: 700,
  letterSpacing: '0.06em', color: COLORS.TEXT_DIM,
  padding: '4px 6px', textAlign: 'left',
  borderBottom: `1px solid rgba(43,39,34,0.15)`,
  whiteSpace: 'nowrap',
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

      <div style={{ padding: '10px 14px 12px' }}>
        {hops.length === 0 ? (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px', color: COLORS.TEXT_DIM, letterSpacing: '0.08em',
          }}>
            No route yet — send a message first.
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '8%'  }} />
              <col style={{ width: '8%'  }} />
              <col style={{ width: '8%'  }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '22%' }} />
            </colgroup>
            <thead>
              <tr>
                {['Planet','Role','In','Out','T#','Fiber ms','Void ms'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hops.map((hop, i) => {
                const role     = hop.role?.toLowerCase() ?? 'relay'
                const color    = ROLE_COLOR[role] ?? COLORS.STEEL
                const fiberMs  = (hop as any).fiber?.ms as number | null | undefined
                const voidMs   = (hop as any).crossing?.void_ms as number | null | undefined
                return (
                  <tr key={i} style={{
                    background: i % 2 === 0 ? 'transparent' : 'rgba(43,39,34,0.04)',
                    borderBottom: `1px solid rgba(43,39,34,0.08)`,
                  }}>
                    <td style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px', fontWeight: 700,
                      color, padding: '5px 6px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {(hop.planet ?? '-').toUpperCase()}
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <RoleChip role={hop.role} />
                    </td>
                    {[hop.recv_tower ?? '-', hop.send_tower ?? '-', hop.towers_hit ?? '-'].map((v, ci) => (
                      <td key={ci} style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px', color: COLORS.TEXT_HI,
                        padding: '4px 6px', textAlign: 'center',
                      }}>{String(v)}</td>
                    ))}
                    <td style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px', color: '#7B8FC0',
                      padding: '4px 6px', textAlign: 'right',
                    }}>
                      {fiberMs != null ? fiberMs.toFixed(2) : '—'}
                    </td>
                    <td style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px', color: COLORS.CYAN,
                      padding: '4px 6px', textAlign: 'right',
                    }}>
                      {voidMs != null ? voidMs.toFixed(1) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
