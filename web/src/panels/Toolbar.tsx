import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { postRoute, resetUniverse, postConfig } from '../api'
import { COLORS, ANIM } from '../constants/visual'

const fieldLabel: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontSize: '7px', fontWeight: 700,
  letterSpacing: '0.18em', color: COLORS.TEXT_DIM,
  display: 'block', marginBottom: '5px',
}

const fieldBase: React.CSSProperties = {
  width: '100%',
  background: 'rgba(5,6,10,0.8)',
  color: COLORS.TEXT_HI,
  border: `1px solid rgba(52,227,255,0.15)`,
  borderRadius: '3px',
  padding: '7px 10px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
  letterSpacing: '0.04em',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function PrimaryBtn({ onClick, loading, disabled, children }: {
  onClick: () => void; loading?: boolean; disabled?: boolean; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1,
        padding: '9px 6px',
        background: disabled ? 'transparent' : hov ? `rgba(52,227,255,0.18)` : `rgba(52,227,255,0.08)`,
        color: disabled ? COLORS.STEEL : COLORS.CYAN,
        border: `1px solid ${disabled ? COLORS.STEEL : hov ? COLORS.CYAN : 'rgba(52,227,255,0.35)'}`,
        borderRadius: '3px',
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: (!disabled && hov) ? `0 0 16px rgba(52,227,255,0.25)` : 'none',
        transition: 'all 0.15s',
        outline: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '[ ROUTING... ]' : children}
    </button>
  )
}

function SecondaryBtn({ onClick, color, active, children }: {
  onClick: () => void; color: string; active?: boolean; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1,
        padding: '9px 6px',
        background: (active || hov) ? `${color}18` : 'transparent',
        color: active ? color : hov ? color : COLORS.TEXT_DIM,
        border: `1px solid ${active ? color : hov ? `${color}88` : 'rgba(58,74,99,0.5)'}`,
        borderRadius: '3px',
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em',
        cursor: 'pointer',
        boxShadow: active ? `0 0 12px ${color}44` : 'none',
        transition: 'all 0.15s',
        outline: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

export function Toolbar() {
  const {
    snapshot, originId, destinationId, payload, killMode,
    setOriginId, setDestinationId, setPayload,
    setRoute, setKillMode, setSnapshot,
  } = useStore()

  const [loading,      setLoading]      = useState(false)
  const [glitching,    setGlitching]    = useState(false)
  const [loadingCfg,   setLoadingCfg]   = useState(false)
  const [cfgError,     setCfgError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    if (snap) { setSnapshot(snap); setRoute(null) }
  }, [setSnapshot, setRoute])

  const handleLoadConfig = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCfgError(null)
    setLoadingCfg(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const cfg = JSON.parse(ev.target?.result as string)
        const snap = await postConfig(cfg)
        if (snap) { setSnapshot(snap); setRoute(null) }
        else setCfgError('Server rejected config')
      } catch {
        setCfgError('Invalid JSON file')
      } finally {
        setLoadingCfg(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }, [setSnapshot, setRoute])

  useEffect(() => {
    if (nodes.length >= 2) {
      if (!originId)      setOriginId(nodes[0].id)
      if (!destinationId) setDestinationId(nodes[nodes.length - 1].id)
    }
  }, [snapshot]) // eslint-disable-line

  const canTransmit = !!originId && !!destinationId && !loading

  return (
    <div>
      {/* Panel header */}
      <div className="panel-header">
        <div className="panel-header-dot" />
        <span className="panel-header-title">MISSION CONTROL</span>
        <span className="panel-header-badge">TX / RX</span>
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        {/* Origin + Destination side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '2px' }}>
          <Field label="ORIGIN">
            <select
              style={fieldBase}
              value={originId}
              onChange={e => setOriginId(e.target.value)}
            >
              <option value="">-- SELECT --</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.id.toUpperCase()}{!n.alive ? ' [DEAD]' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="DESTINATION">
            <select
              style={fieldBase}
              value={destinationId}
              onChange={e => setDestinationId(e.target.value)}
            >
              <option value="">-- SELECT --</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.id.toUpperCase()}{!n.alive ? ' [DEAD]' : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="PAYLOAD">
          <input
            type="text"
            style={{ ...fieldBase, cursor: 'text' }}
            value={payload}
            onChange={e => setPayload(e.target.value)}
            placeholder="Hello world"
            onKeyDown={e => { if (e.key === 'Enter') handleTransmit() }}
          />
        </Field>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <PrimaryBtn onClick={handleTransmit} loading={loading} disabled={!canTransmit}>
            [ TRANSMIT ]
          </PrimaryBtn>
          <SecondaryBtn onClick={handleReset} color={COLORS.STEEL}>
            [ RESET ]
          </SecondaryBtn>
          <SecondaryBtn
            onClick={() => setKillMode(!killMode)}
            color={COLORS.MAGENTA}
            active={killMode}
          >
            {killMode ? '[ KILL:ON ]' : '[ KILL:OFF ]'}
          </SecondaryBtn>
        </div>

        {/* Kill mode hint */}
        {killMode && (
          <div style={{
            marginTop: '8px',
            padding: '6px 8px',
            background: 'rgba(255,45,155,0.07)',
            border: '1px solid rgba(255,45,155,0.25)',
            borderRadius: '2px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '8px', letterSpacing: '0.06em',
            color: COLORS.MAGENTA,
          }}>
            Click a planet or link to toggle its state
          </div>
        )}

        {/* ── Load Config ─────────────────────────────────────────────── */}
        <div style={{
          marginTop: '10px',
          borderTop: '1px solid rgba(52,227,255,0.08)',
          paddingTop: '10px',
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleLoadConfig}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingCfg}
            style={{
              width: '100%',
              padding: '7px 6px',
              background: 'transparent',
              color: loadingCfg ? COLORS.TEXT_DIM : COLORS.STEEL,
              border: `1px solid ${loadingCfg ? 'rgba(58,74,99,0.3)' : 'rgba(58,74,99,0.45)'}`,
              borderRadius: '3px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '7px', fontWeight: 700, letterSpacing: '0.14em',
              cursor: loadingCfg ? 'not-allowed' : 'pointer',
              outline: 'none',
              transition: 'all 0.15s',
            }}
          >
            {loadingCfg ? '[ LOADING... ]' : '[ LOAD universe-config.json ]'}
          </button>
          {cfgError && (
            <div style={{
              marginTop: '5px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '8px', color: COLORS.MAGENTA,
              letterSpacing: '0.05em',
            }}>
              ⚠ {cfgError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
