import { useStore } from '../store'
import { COLORS } from '../constants/visual'

const ROLE_COLOR: Record<string, string> = {
  origin:      COLORS.CYAN,
  relay:       '#A78BFA',
  destination: COLORS.MAGENTA,
}
const ROLE_LABEL: Record<string, string> = {
  origin: 'Sender', relay: 'Relay', destination: 'Receiver',
}

function RoleChip({ role }: { role: string }) {
  const key   = role?.toLowerCase() ?? 'relay'
  const color = ROLE_COLOR[key] ?? COLORS.STEEL
  const label = ROLE_LABEL[key] ?? key
  return (
    <span style={{
      fontSize: '12px', fontWeight: 700,
      color, border: `1.5px solid ${color}`,
      borderRadius: '7px 5px 8px 5px', padding: '1px 8px',
      background: `${color}14`, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

/** One labelled metric. Wraps freely so the card adapts to any panel width. */
function Stat({ label, value, hint, color }: {
  label: string; value: string; hint?: string; color?: string
}) {
  return (
    <div style={{ minWidth: '0' }} title={hint}>
      <div style={{
        fontSize: '11px', color: COLORS.TEXT_DIM, lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px', fontWeight: 700,
        color: color ?? COLORS.TEXT_HI, lineHeight: 1.3,
      }}>
        {value}
      </div>
    </div>
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

      <div style={{ padding: '12px 14px 14px' }}>
        {hops.length === 0 ? (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px', color: COLORS.TEXT_DIM, letterSpacing: '0.04em',
          }}>
            No route yet — send a message first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {hops.map((hop, i) => {
              const role     = hop.role?.toLowerCase() ?? 'relay'
              const color    = ROLE_COLOR[role] ?? COLORS.STEEL
              const fiber    = (hop as any).fiber as { ms?: number } | null | undefined
              const crossing = (hop as any).crossing as { void_ms?: number; to?: string } | null | undefined
              const recv     = (hop as any).recv_tower as number | null | undefined
              const send     = (hop as any).send_tower as number | null | undefined
              const hits     = (hop as any).towers_hit as number | null | undefined

              return (
                <div
                  key={i}
                  className="route-step-card"
                  style={{
                    animationDelay: `${i * 60}ms`,
                    background: '#FBF5E6',
                    border: '1.5px solid rgba(43,39,34,0.25)',
                    borderRadius: '10px 7px 11px 7px',
                    padding: '7px 10px',
                    boxShadow: '1.5px 2px 0 rgba(43,39,34,0.10)',
                  }}
                >
                  {/* Header: step number, planet, role */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: '8px', flexWrap: 'wrap', marginBottom: '6px',
                  }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px', fontWeight: 700, color: COLORS.TEXT_DIM,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{
                      fontSize: '15px', fontWeight: 700, color,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      minWidth: 0, flex: '1 1 auto',
                    }}>
                      {(hop.planet ?? '-')}
                    </span>
                    <RoleChip role={hop.role} />
                  </div>

                  {/* Responsive metrics — auto-fit columns so it never overflows */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(78px, 1fr))',
                    gap: '8px 10px',
                  }}>
                    <Stat
                      label="Tower in" hint="Ring tower the signal arrives on"
                      value={recv != null ? `#${recv}` : '—'}
                    />
                    <Stat
                      label="Tower out" hint="Ring tower the signal leaves from"
                      value={send != null ? `#${send}` : '—'}
                    />
                    <Stat
                      label="Towers used" hint="Number of relay towers the signal passes through"
                      value={hits != null ? String(hits) : '—'}
                    />
                    <Stat
                      label="Fiber" hint="Internal crust transit time"
                      color="#7B8FC0"
                      value={fiber?.ms != null ? `${fiber.ms.toFixed(2)} ms` : '—'}
                    />
                    <Stat
                      label={crossing?.to ? `Void → ${crossing.to}` : 'Void'}
                      hint="Vacuum crossing time to the next planet"
                      color={COLORS.CYAN}
                      value={crossing?.void_ms != null ? `${crossing.void_ms.toFixed(1)} ms` : '—'}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
