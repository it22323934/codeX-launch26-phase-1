import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { COLORS } from '../constants/visual'

const mono = (color: string = COLORS.TEXT_HI, size = '9px'): React.CSSProperties => ({
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: size, color, lineHeight: '1.6', wordBreak: 'break-all',
})

function MathRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '1.5px 0' }}>
      <span style={{ ...mono(COLORS.TEXT_DIM, '7.5px'), flexShrink: 0 }}>{label}</span>
      <span style={{ ...mono(accent ? COLORS.CYAN : COLORS.TEXT_HI, '7.5px'), textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function MathSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: '8px',
      padding: '7px 9px',
      background: `${color}06`,
      border: `1px solid ${color}22`,
      borderRadius: '3px',
    }}>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '6px', fontWeight: 700,
        letterSpacing: '0.16em', color,
        marginBottom: '5px',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Divider({ color }: { color: string }) {
  return <div style={{ height: '1px', background: `${color}22`, margin: '4px 0' }} />
}

function HopCard({ entry, index, hop }: { entry: any; index: number; hop?: any }) {
  const [open, setOpen] = useState(index === 0)

  const fib  = hop?.fiber
  const crx  = hop?.crossing
  const c    = hop?.speed_of_light_kms ?? 300_000
  const f    = hop?.fiber_speed_fraction ?? 0.67
  const dt   = hop?.tower_delay_each_ms ?? 7
  const m    = hop?.towers_hit ?? 1
  const s    = hop?.fiber_segments_s ?? 0
  const r    = hop?.radius_km ?? 0
  const N    = hop?.active_towers_n ?? 0
  const fiberSpeed = f * c

  return (
    <div style={{ marginBottom: '5px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px',
          background: open ? 'rgba(52,227,255,0.06)' : 'rgba(52,227,255,0.02)',
          border: `1px solid ${open ? 'rgba(52,227,255,0.25)' : 'rgba(52,227,255,0.1)'}`,
          borderRadius: open ? '3px 3px 0 0' : '3px',
          cursor: 'pointer', outline: 'none',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: COLORS.TEXT_DIM }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', color: COLORS.CYAN }}>
            {(entry.planet_id ?? `HOP ${index + 1}`).toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: COLORS.MAGENTA, padding: '1px 6px', border: `1px solid rgba(255,45,155,0.3)`, borderRadius: '2px' }}>
            BASE-{entry.codex ?? '?'}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: COLORS.TEXT_DIM }}>
            {open ? '[-]' : '[+]'}
          </span>
        </div>
      </button>

      {open && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(5,6,10,0.6)',
          border: '1px solid rgba(52,227,255,0.1)', borderTop: 'none',
          borderRadius: '0 0 3px 3px',
        }}>
          {/* ── CODEX ENCODING ───────────────────────────────────────── */}
          {entry.received_as != null && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '6px', fontWeight: 700, letterSpacing: '0.14em', color: COLORS.TEXT_DIM, marginBottom: '4px' }}>
                RX — BASE-{entry.codex}
              </div>
              <div style={{ ...mono(COLORS.CYAN, '9px'), padding: '4px 8px', background: 'rgba(52,227,255,0.04)', borderLeft: `2px solid ${COLORS.CYAN}`, borderRadius: '0 2px 2px 0' }}>
                [{(entry.received_as as string[]).join(', ')}]
              </div>
            </div>
          )}

          {entry.ascii != null && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '6px', fontWeight: 700, letterSpacing: '0.14em', color: COLORS.TEXT_DIM, marginBottom: '4px' }}>
                ASCII INTERNAL
              </div>
              <div style={{ ...mono(COLORS.TEXT_HI, '10px'), padding: '4px 8px', background: 'rgba(220,235,255,0.04)', borderLeft: `2px solid rgba(220,235,255,0.3)`, borderRadius: '0 2px 2px 0' }}>
                "{entry.ascii}"
              </div>
            </div>
          )}

          {entry.sent_as != null && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '6px', fontWeight: 700, letterSpacing: '0.14em', color: COLORS.TEXT_DIM, marginBottom: '4px' }}>
                TX — NEXT BASE
              </div>
              <div style={{ ...mono(COLORS.MAGENTA, '9px'), padding: '4px 8px', background: 'rgba(255,45,155,0.04)', borderLeft: `2px solid ${COLORS.MAGENTA}`, borderRadius: '0 2px 2px 0' }}>
                [{(entry.sent_as as string[]).join(', ')}]
              </div>
            </div>
          )}

          {entry.binary_stream != null && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '6px', fontWeight: 700, letterSpacing: '0.14em', color: COLORS.TEXT_DIM, marginBottom: '4px' }}>
                BINARY STREAM
              </div>
              <div style={{ ...mono(COLORS.TEXT_DIM, '7px'), padding: '4px 8px', background: 'rgba(58,74,99,0.15)', borderLeft: `2px solid rgba(58,74,99,0.5)`, borderRadius: '0 2px 2px 0', maxHeight: '44px', overflowY: 'auto', letterSpacing: '0.06em' }}>
                {entry.binary_stream}
              </div>
            </div>
          )}

          {/* ── LATENCY MATH ─────────────────────────────────────────── */}
          {hop && (
            <>
              {/* T_p */}
              <MathSection title="Tp — TOWER + FIBER" color={COLORS.MAGENTA}>
                <MathRow label="Towers hit (m)"        value={`${m}`} />
                <MathRow label="Δt per tower"          value={`${dt} ms`} />
                <MathRow label="Tower cost  m×Δt"      value={`${m} × ${dt} = ${(m * dt).toFixed(3)} ms`} />
                {fib && (
                  <>
                    <Divider color={COLORS.MAGENTA} />
                    <MathRow label="Planet radius (r)"  value={`${r.toLocaleString()} km`} />
                    <MathRow label="Towers on ring (N)" value={`${N}`} />
                    <MathRow label="Segments (s)"       value={`${s}`} />
                    <MathRow label="Arc = 2πr×s/N"     value={`${fib.arc_km.toFixed(4)} km`} />
                    <MathRow label="Speed  f×c"         value={`${f}×${c.toLocaleString()} = ${fiberSpeed.toLocaleString()} km/s`} />
                    <MathRow label="Fiber  arc/(f×c)"   value={`${fib.ms.toFixed(4)} ms`} />
                  </>
                )}
                <Divider color={COLORS.MAGENTA} />
                <MathRow
                  label="T_p total"
                  value={`${(hop.tower_delay_ms + (fib?.ms ?? 0)).toFixed(3)} ms`}
                  accent
                />
              </MathSection>

              {/* T_v */}
              {crx && (
                <MathSection title={`Tv — VOID → ${crx.to.toUpperCase()}`} color={COLORS.CYAN}>
                  <MathRow label="h₁ (atm out)"        value={`${crx.h_out_km} km`} />
                  <MathRow label="n₁ (refraction)"     value={`${crx.n_out}`} />
                  <MathRow label="Atm out  h₁n₁/c"     value={`${crx.atmosphere_out_ms.toFixed(4)} ms`} />
                  <Divider color={COLORS.CYAN} />
                  <MathRow label="Void dist (L)"        value={`${crx.void_km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`} />
                  <MathRow label="Void  L/c"            value={`${crx.void_ms.toFixed(4)} ms`} />
                  <Divider color={COLORS.CYAN} />
                  <MathRow label="h₂ (atm in)"         value={`${crx.h_in_km} km`} />
                  <MathRow label="n₂ (refraction)"     value={`${crx.n_in}`} />
                  <MathRow label="Atm in  h₂n₂/c"      value={`${crx.atmosphere_in_ms.toFixed(4)} ms`} />
                  <Divider color={COLORS.CYAN} />
                  <MathRow label="T_v total"            value={`${crx.total_ms.toFixed(4)} ms`} accent />
                </MathSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function EncodingPanel() {
  const translation = useStore(s => s.route?.translation ?? [])
  const hopLog      = useStore(s => s.route?.hop_log      ?? [])

  const hopMap = useMemo(() => {
    const m = new Map<string, any>()
    ;(hopLog as any[]).forEach(h => m.set(h.planet, h))
    return m
  }, [hopLog])

  return (
    <div>
      <div className="panel-header">
        <div className="panel-header-dot" />
        <span className="panel-header-title">CODEX TRANSLATION</span>
        <span className="panel-header-badge">
          {translation.length > 0 ? `${translation.length - 1} HOPS` : '--'}
        </span>
      </div>

      <div style={{ padding: '10px 14px' }}>
        {translation.length === 0 ? (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: COLORS.TEXT_DIM, letterSpacing: '0.08em' }}>
            [ NO TRANSLATION LOG ]
          </div>
        ) : (
          <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '2px' }}>
            {(translation as any[]).map((entry, i) => (
              <HopCard
                key={i}
                entry={entry}
                index={i}
                hop={hopMap.get(entry.planet_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
