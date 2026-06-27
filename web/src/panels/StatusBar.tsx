import { useStore } from '../store'
import { COLORS } from '../constants/visual'

export function StatusBar() {
  const route = useStore(s => s.route)

  const state: 'idle' | 'ok' | 'dead' =
    !route ? 'idle' : route.deliverable ? 'ok' : 'dead'

  const dotColor = state === 'ok' ? COLORS.CYAN : state === 'dead' ? COLORS.MAGENTA : COLORS.STEEL
  const dotClass = state === 'ok' ? 'dot-active' : state === 'dead' ? 'dot-dead' : ''

  const path  = route?.path ?? []
  const chain = path.map(h => h.toUpperCase()).join('  →  ')
  const ms    = route?.latency?.total_ms

  return (
    <div style={{
      height: '34px', flexShrink: 0,
      borderTop: `1px solid rgba(52,227,255,0.1)`,
      background: 'rgba(8,12,20,0.92)',
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: '10px',
      overflow: 'hidden',
    }}>
      {/* Status dot */}
      <div className={dotClass} style={{
        width: 7, height: 7, borderRadius: '50%',
        background: dotColor, flexShrink: 0,
      }} />

      {/* Status text */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.08em',
        color: state === 'ok' ? COLORS.CYAN : state === 'dead' ? COLORS.MAGENTA : COLORS.TEXT_DIM,
        flexShrink: 0,
      }}>
        {state === 'idle' && '[ AWAITING TRANSMISSION ]'}
        {state === 'ok'   && '[ LINK ESTABLISHED ]'}
        {state === 'dead' && '[ SIGNAL LOST ]'}
      </span>

      {/* Separator */}
      {state !== 'idle' && (
        <div style={{ width: 1, height: 14, background: 'rgba(52,227,255,0.15)', flexShrink: 0 }} />
      )}

      {/* Route info */}
      {state === 'ok' && (
        <>
          {ms != null && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px', fontWeight: 700,
              color: COLORS.CYAN, flexShrink: 0,
            }}>
              {ms.toFixed(2)} ms
            </span>
          )}
          {chain && (
            <>
              <div style={{ width: 1, height: 14, background: 'rgba(52,227,255,0.15)', flexShrink: 0 }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px', color: COLORS.TEXT_DIM,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {chain}
              </span>
            </>
          )}
        </>
      )}

      {/* Signal lost reason */}
      {state === 'dead' && route?.reason && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px', color: COLORS.TEXT_DIM,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {route.reason}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* Right side info */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '8px', color: COLORS.TEXT_DIM,
        letterSpacing: '0.06em', flexShrink: 0,
      }}>
        ZETA-26 // v0.1.0
      </span>
    </div>
  )
}
