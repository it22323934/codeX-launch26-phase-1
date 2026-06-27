import { useState, useCallback, useEffect } from 'react'
import { useStore } from '../store'
import { postRoute, resetUniverse } from '../api'
import { COLORS, ANIM } from '../constants/visual'

const label: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize:   '9px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: COLORS.TEXT_DIM,
  display: 'block',
  marginBottom: '4px',
}

const select: React.CSSProperties = {
  width:           '100%',
  background:      COLORS.VOID_BLACK,
  color:           COLORS.TEXT_HI,
  border:          `1px solid rgba(52, 227, 255, 0.25)`,
  borderRadius:    '2px',
  padding:         '5px 8px',
  fontFamily:      "'JetBrains Mono', monospace",
  fontSize:        '11px',
  outline:         'none',
  cursor:          'pointer',
  marginBottom:    '8px',
}

const input: React.CSSProperties = {
  ...select,
  width: '100%',
}

function ActionButton({
  onClick,
  color,
  children,
  disabled,
}: {
  onClick: () => void
  color: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex:        1,
        background:  'transparent',
        color:       disabled ? COLORS.STEEL : color,
        border:      `1px solid ${disabled ? COLORS.STEEL : color}`,
        borderRadius:'2px',
        padding:     '7px 4px',
        fontFamily:  "'Orbitron', sans-serif",
        fontSize:    '9px',
        fontWeight:  700,
        letterSpacing: '0.1em',
        cursor:      disabled ? 'not-allowed' : 'pointer',
        transition:  'background 0.15s, box-shadow 0.15s',
        boxShadow:   disabled ? 'none' : `0 0 8px ${color}33`,
        outline:     'none',
      }}
      onMouseEnter={e => {
        if (!disabled) (e.target as HTMLButtonElement).style.background = `${color}1A`
      }}
      onMouseLeave={e => {
        (e.target as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

export function Toolbar() {
  const {
    snapshot,
    originId,
    destinationId,
    payload,
    killMode,
    setOriginId,
    setDestinationId,
    setPayload,
    setRoute,
    setKillMode,
    setSnapshot,
  } = useStore()

  const [loading,   setLoading]   = useState(false)
  const [glitching, setGlitching] = useState(false)

  const nodes = snapshot?.nodes ?? []

  const triggerGlitch = useCallback(() => {
    setGlitching(true)
    setTimeout(() => setGlitching(false), ANIM.GLITCH_DURATION_MS)
  }, [])

  const handleTransmit = useCallback(async () => {
    if (!originId || !destinationId || loading) return
    setLoading(true)
    const result = await postRoute(originId, destinationId, payload)
    setLoading(false)
    if (result) {
      setRoute(result)
      if (!result.deliverable) triggerGlitch()
    }
  }, [originId, destinationId, payload, loading, setRoute, triggerGlitch])

  const handleReset = useCallback(async () => {
    const snap = await resetUniverse()
    if (snap) {
      setSnapshot(snap)
      setRoute(null)
    }
  }, [setSnapshot, setRoute])

  // Auto-select first two nodes on snapshot load
  useEffect(() => {
    if (nodes.length >= 2) {
      if (!originId)      setOriginId(nodes[0].id)
      if (!destinationId) setDestinationId(nodes[1]?.id ?? '')
    }
  }, [snapshot])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: '12px 14px' }}>
      {/* Title */}
      <div
        className={glitching ? 'glitch' : ''}
        style={{
          fontFamily:    "'Orbitron', sans-serif",
          fontSize:      '13px',
          fontWeight:    900,
          letterSpacing: '0.18em',
          color:         COLORS.CYAN,
          marginBottom:  '14px',
          textShadow:    `0 0 10px ${COLORS.CYAN}`,
        }}
      >
        [ RELIC RING PROTOCOL ]
      </div>

      {/* Origin */}
      <label style={label}>ORIGIN NODE</label>
      <select
        style={select}
        value={originId}
        onChange={e => setOriginId(e.target.value)}
      >
        <option value="">-- SELECT --</option>
        {nodes.map(n => (
          <option key={n.id} value={n.id}>
            {n.id.toUpperCase()} {!n.alive ? '[ DEAD ]' : ''}
          </option>
        ))}
      </select>

      {/* Destination */}
      <label style={label}>DESTINATION NODE</label>
      <select
        style={select}
        value={destinationId}
        onChange={e => setDestinationId(e.target.value)}
      >
        <option value="">-- SELECT --</option>
        {nodes.map(n => (
          <option key={n.id} value={n.id}>
            {n.id.toUpperCase()} {!n.alive ? '[ DEAD ]' : ''}
          </option>
        ))}
      </select>

      {/* Payload */}
      <label style={label}>PAYLOAD</label>
      <input
        type="text"
        style={input}
        value={payload}
        onChange={e => setPayload(e.target.value)}
        placeholder="Hello world"
        onKeyDown={e => { if (e.key === 'Enter') handleTransmit() }}
      />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        <ActionButton
          onClick={handleTransmit}
          color={COLORS.CYAN}
          disabled={loading || !originId || !destinationId}
        >
          {loading ? '[ ROUTING... ]' : '[ TRANSMIT ]'}
        </ActionButton>

        <ActionButton onClick={handleReset} color={COLORS.STEEL}>
          [ RESET ]
        </ActionButton>

        <ActionButton
          onClick={() => setKillMode(!killMode)}
          color={killMode ? COLORS.MAGENTA : COLORS.STEEL}
        >
          {killMode ? '[ KILL : ON ]' : '[ KILL : OFF ]'}
        </ActionButton>
      </div>
    </div>
  )
}
