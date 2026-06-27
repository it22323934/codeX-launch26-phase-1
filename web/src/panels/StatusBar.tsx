import { useStore } from '../store'
import { COLORS } from '../constants/visual'

export function StatusBar() {
  const route = useStore(s => s.route)

  let content: React.ReactNode

  if (!route) {
    content = (
      <span style={{ color: COLORS.TEXT_DIM }}>
        [ AWAITING TRANSMISSION ]
      </span>
    )
  } else if (!route.deliverable) {
    content = (
      <span className="status-dead">
        [ SIGNAL LOST ] &mdash; {route.reason ?? 'ROUTE UNAVAILABLE'}
      </span>
    )
  } else {
    const hops  = route.path ?? []
    const ms    = route.latency?.total_ms
    const chain = hops.map(h => h.toUpperCase()).join(' > ')
    content = (
      <span className="status-active">
        [ LINK ESTABLISHED ]
        {ms != null ? ` — ${ms.toFixed(1)} ms` : ''}
        {chain ? `  |  ${chain}` : ''}
      </span>
    )
  }

  return (
    <div
      className="hud-panel"
      style={{
        padding:       '7px 16px',
        display:       'flex',
        alignItems:    'center',
        gap:           '12px',
        flexShrink:    0,
        borderTop:     '1px solid rgba(52, 227, 255, 0.15)',
        borderBottom:  'none',
        borderLeft:    'none',
        borderRight:   'none',
        borderRadius:  0,
        background:    'rgba(10, 14, 22, 0.75)',
      }}
    >
      {/* Left indicator dot */}
      <div
        style={{
          width:        '6px',
          height:       '6px',
          borderRadius: '50%',
          background:   route?.deliverable
            ? COLORS.CYAN
            : route
              ? COLORS.MAGENTA
              : COLORS.STEEL,
          flexShrink: 0,
          boxShadow:  route?.deliverable
            ? `0 0 8px ${COLORS.CYAN}`
            : route
              ? `0 0 8px ${COLORS.MAGENTA}`
              : 'none',
        }}
      />

      <div
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '10px',
          fontWeight:    700,
          letterSpacing: '0.06em',
          overflow:      'hidden',
          textOverflow:  'ellipsis',
          whiteSpace:    'nowrap',
        }}
      >
        {content}
      </div>
    </div>
  )
}
