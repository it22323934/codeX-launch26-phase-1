import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { postRoute, resetUniverse, uploadConfig } from '../api'
import { COLORS, INK, ANIM } from '../constants/visual'

const fieldLabel: React.CSSProperties = {
  fontSize: '13px', fontWeight: 700,
  color: COLORS.TEXT_DIM,
  display: 'block', marginBottom: '4px',
}

const fieldBase: React.CSSProperties = {
  width: '100%',
  background: INK.PAPER_INPUT,
  color: COLORS.TEXT_HI,
  border: `2px solid ${INK.LINE}`,
  borderRadius: '8px 6px 9px 6px',
  padding: '7px 10px',
  fontSize: '14px',
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

function PrimaryBtn({ onClick, loading, disabled, title, children }: {
  onClick: () => void; loading?: boolean; disabled?: boolean; title?: string; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1,
        padding: '9px 6px',
        background: disabled ? '#EDE5D2' : hov ? COLORS.CYAN : INK.PAPER_CARD,
        color: disabled ? COLORS.STEEL : hov ? '#FBF5E6' : COLORS.CYAN,
        border: `2px solid ${disabled ? COLORS.STEEL : COLORS.CYAN}`,
        borderRadius: '10px 7px 11px 7px',
        fontSize: '15px', fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '2px 2px 0 rgba(43,39,34,0.2)',
        transition: 'all 0.12s',
        outline: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? 'Sending...' : children}
    </button>
  )
}

function SecondaryBtn({ onClick, color, active, title, children }: {
  onClick: () => void; color: string; active?: boolean; title?: string; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1,
        padding: '9px 6px',
        background: active ? color : hov ? `${color}22` : INK.PAPER_CARD,
        color: active ? '#FBF5E6' : color,
        border: `2px solid ${active ? color : INK.LINE}`,
        borderRadius: '10px 7px 11px 7px',
        fontSize: '15px', fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '2px 2px 0 rgba(43,39,34,0.2)',
        transition: 'all 0.12s',
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
    setRoute, setKillMode, setSnapshot, setTransmitError,
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
    setTransmitError(null)
    const result = await postRoute(originId, destinationId, payload)
    setLoading(false)
    if (result) {
      setRoute(result)
      if (!result.deliverable) triggerGlitch()
    } else {
      // Network failure or engine error (e.g. router not reachable).
      setTransmitError('Transmission failed — engine unreachable or route rejected.')
      triggerGlitch()
    }
  }, [originId, destinationId, payload, loading, setRoute, setTransmitError, triggerGlitch])

  const handleReset = useCallback(async () => {
    const snap = await resetUniverse()
    if (snap) { setSnapshot(snap); setRoute(null); setTransmitError(null) }
  }, [setSnapshot, setRoute, setTransmitError])

  const handleLoadConfig = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCfgError(null)
    setLoadingCfg(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const cfg = JSON.parse(ev.target?.result as string)
        const res = await uploadConfig(cfg)
        if (res.ok) { setSnapshot(res.snapshot); setRoute(null) }
        else setCfgError(res.error)
      } catch {
        setCfgError('Not valid JSON — check the file contents.')
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
        <span className="panel-header-title">Controls</span>
        <span className="panel-header-badge">send a message</span>
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        {/* Origin + Destination side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '2px' }}>
          <Field label="From">
            <select
              style={fieldBase}
              value={originId}
              onChange={e => setOriginId(e.target.value)}
            >
              <option value="">Choose a planet</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.id}{!n.alive ? ' (dead)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="To">
            <select
              style={fieldBase}
              value={destinationId}
              onChange={e => setDestinationId(e.target.value)}
            >
              <option value="">Choose a planet</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.id}{!n.alive ? ' (dead)' : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Message">
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
          <PrimaryBtn
            onClick={handleTransmit} loading={loading} disabled={!canTransmit}
            title="Find the fastest route and animate the message (or press Enter)"
          >
            Send
          </PrimaryBtn>
          <SecondaryBtn onClick={handleReset} color={COLORS.STEEL}
            title="Bring every planet and link back to life">
            Reset
          </SecondaryBtn>
          <SecondaryBtn
            onClick={() => setKillMode(!killMode)}
            color={COLORS.MAGENTA}
            active={killMode}
            title="Turn on break mode, then click a planet or link on the map to break it"
          >
            {killMode ? 'Break: on' : 'Break: off'}
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
            fontSize: '15px', letterSpacing: '0.06em',
            color: COLORS.MAGENTA,
          }}>
            Click a planet or link on the map to break it
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
              color: loadingCfg ? COLORS.TEXT_DIM : COLORS.TEXT_HI,
              border: `2px solid ${INK.LINE}`,
              borderRadius: '9px 7px 10px 7px',
              fontSize: '15px', fontWeight: 700,
              cursor: loadingCfg ? 'not-allowed' : 'pointer',
              outline: 'none',
              transition: 'all 0.15s',
            }}
          >
            {loadingCfg ? 'Loading...' : 'Load a universe file...'}
          </button>
          {cfgError && (
            <div style={{
              marginTop: '5px',
              fontSize: '12px', color: COLORS.MAGENTA,
            }}>
              Couldn't load: {cfgError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
