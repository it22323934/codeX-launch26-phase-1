import { useStore } from '../store'
import { COLORS, INK } from '../constants/visual'

export function StatusBar() {
  const route         = useStore(s => s.route)
  const transmitError = useStore(s => s.transmitError)

  // A network/engine failure outranks a route result in the readout.
  const state: 'idle' | 'ok' | 'dead' | 'fail' =
    transmitError ? 'fail'
    : !route ? 'idle'
    : route.deliverable ? 'ok' : 'dead'

  const alarm    = state === 'dead' || state === 'fail'
  const dotColor = state === 'ok' ? COLORS.CYAN : alarm ? COLORS.MAGENTA : COLORS.STEEL
  const dotClass = state === 'ok' ? 'dot-active' : alarm ? 'dot-dead' : ''

  const path  = route?.path ?? []
  const chain = path.map(h => h).join('  →  ')
  const ms    = route?.latency?.total_ms

  const tag =
    state === 'idle' ? 'Ready to send'
    : state === 'ok' ? 'Delivered'
    : state === 'dead' ? 'No route found'
    : 'Could not reach the engine'

  const sep = <div style={{ width: 1, height: 16, background: 'rgba(43,39,34,0.25)', flexShrink: 0 }} />

  return (
    <div style={{
      height: '36px', flexShrink: 0,
      borderTop: `2px solid ${INK.LINE}`, background: '#F1E7CF',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: '10px', overflow: 'hidden',
    }}>
      <div className={dotClass} style={{
        width: 9, height: 9, borderRadius: '50%', background: dotColor,
        border: `1.5px solid ${INK.LINE}`, flexShrink: 0,
      }} />

      <span style={{
        fontSize: '15px', fontWeight: 700,
        color: state === 'ok' ? COLORS.CYAN : alarm ? COLORS.MAGENTA : COLORS.TEXT_HI,
        flexShrink: 0,
      }}>
        {tag}
      </span>

      {state !== 'idle' && sep}

      {state === 'fail' && (
        <span style={{ fontSize: '13px', color: COLORS.TEXT_DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {transmitError}
        </span>
      )}

      {state === 'ok' && (
        <>
          {ms != null && (
            <span style={{ fontSize: '14px', fontWeight: 700, color: COLORS.CYAN, flexShrink: 0 }}>
              {ms.toFixed(2)} ms
            </span>
          )}
          {chain && (
            <>
              {sep}
              <span style={{ fontSize: '13px', color: COLORS.TEXT_DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chain}
              </span>
            </>
          )}
        </>
      )}

      {state === 'dead' && route?.reason && (
        <span style={{ fontSize: '13px', color: COLORS.TEXT_DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {route.reason}
        </span>
      )}

      <div style={{ flex: 1 }} />

      <span style={{ fontSize: '12px', color: COLORS.TEXT_DIM, flexShrink: 0 }}>
        Relic Ring &middot; v0.1
      </span>
    </div>
  )
}
