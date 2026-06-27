import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { COLORS } from '../constants/visual'

// ─── tiny helpers ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '12px', fontWeight: 700,
      color: COLORS.TEXT_DIM, marginBottom: '4px',
    }}>
      {children}
    </div>
  )
}

function CodeBlock({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '10px', color, lineHeight: '1.6',
      wordBreak: 'break-all',
      padding: '6px 10px',
      background: `${color}0A`,
      borderLeft: `2px solid ${color}`,
      borderRadius: '0 3px 3px 0',
      marginBottom: '10px',
    }}>
      {children}
    </div>
  )
}

// ─── Math section ─────────────────────────────────────────────────────────────

interface MRow { label: string; sub?: string; value: string; total?: boolean }

function MathBlock({
  title, formula, color, rows,
}: {
  title: string; formula: string; color: string; rows: MRow[]
}) {
  return (
    <div style={{
      marginBottom: '10px',
      borderRadius: '4px',
      overflow: 'hidden',
      border: `1px solid ${color}30`,
    }}>
      {/* Header */}
      <div style={{
        padding: '7px 12px',
        background: `${color}12`,
        borderBottom: `1px solid ${color}22`,
      }}>
        <div style={{
          fontSize: '14px', fontWeight: 700, color,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: '12px', color: `${color}cc`, marginTop: '2px',
        }}>
          {formula}
        </div>
      </div>

      {/* Rows */}
      <div style={{ padding: '4px 0' }}>
        {rows.map((row, i) => {
          if (row.label === '---') {
            return (
              <div key={i} style={{ height: '1px', background: `${color}18`, margin: '4px 0' }} />
            )
          }
          if (row.total) {
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px',
                background: `${color}10`,
                borderTop: `1px solid ${color}28`,
                marginTop: '4px',
              }}>
                <span style={{
                  fontSize: '14px', fontWeight: 700, color,
                }}>
                  {row.label}
                </span>
                <span style={{
                  fontSize: '15px', fontWeight: 700, color,
                }}>
                  {row.value}
                </span>
              </div>
            )
          }
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              padding: '3px 12px', gap: '10px',
            }}>
              <div>
                <span style={{
                  fontSize: '13px', color: COLORS.TEXT_DIM,
                }}>
                  {row.label}
                </span>
                {row.sub && (
                  <span style={{
                    fontSize: '12px', color: `${color}aa`,
                    marginLeft: '6px',
                  }}>
                    {row.sub}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: '13px', color: COLORS.TEXT_HI,
                textAlign: 'right', flexShrink: 0,
              }}>
                {row.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({
  active, onChange,
}: {
  active: 'codex' | 'math'; onChange: (t: 'codex' | 'math') => void
}) {
  const tabs: Array<{ key: 'codex' | 'math'; label: string }> = [
    { key: 'codex', label: 'Digits' },
    { key: 'math',  label: 'Timing' },
  ]
  return (
    <div style={{
      display: 'flex', gap: '4px',
      padding: '8px 10px 0',
      borderBottom: '1px solid rgba(52,227,255,0.1)',
      marginBottom: '10px',
    }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: '4px 12px 6px',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '12px', fontWeight: 700,
            letterSpacing: '0.14em',
            color: active === t.key ? COLORS.CYAN : COLORS.TEXT_DIM,
            background: 'transparent',
            border: 'none',
            borderBottom: active === t.key
              ? `2px solid ${COLORS.CYAN}`
              : '2px solid transparent',
            cursor: 'pointer', outline: 'none',
            marginBottom: '-1px',
            transition: 'all 0.12s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Hop card ────────────────────────────────────────────────────────────────

function HopCard({ entry, index, hop }: { entry: any; index: number; hop?: any }) {
  const [open, setOpen] = useState(index === 0)
  const [tab,  setTab]  = useState<'codex' | 'math'>('codex')

  // ---- math inputs ----
  const fib  = hop?.fiber
  const crx  = hop?.crossing
  const c    = hop?.speed_of_light_kms   ?? 300_000
  const f    = hop?.fiber_speed_fraction ?? 0.67
  const dt   = hop?.tower_delay_each_ms  ?? 7
  const m    = hop?.towers_hit           ?? 1
  const s    = hop?.fiber_segments_s     ?? 0
  const r    = hop?.radius_km            ?? 0
  const N    = hop?.active_towers_n      ?? 0
  const fiberSpeed = f * c

  const fmt = (n: number, dec = 4) => n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })
  const fmtKm = (n: number) => Math.round(n).toLocaleString() + ' km'

  // ── T_p rows ──
  const tpTower = m * dt
  const tpFiber = fib?.ms ?? 0
  const tpTotal = tpTower + tpFiber

  const tpRows: MRow[] = [
    { label: 'Towers hit  (m)',       value: `${m}` },
    { label: 'Tower delay (Δt)',       value: `${dt} ms` },
    { label: 'm × Δt',                value: `${m} × ${dt} = ${fmt(tpTower, 3)} ms` },
  ]
  if (fib) {
    tpRows.push({ label: '---', value: '' })
    tpRows.push({ label: 'Planet radius (r)',  value: fmtKm(r) })
    tpRows.push({ label: 'Ring towers   (N)',  value: `${N}` })
    tpRows.push({ label: 'Segments      (s)',  value: `${s}` })
    tpRows.push({ label: 'Fiber arc  2πr·s/N', sub: `= ${fmt(fib.arc_km, 4)} km`, value: `${fmt(fib.arc_km, 4)} km` })
    tpRows.push({ label: 'Speed  f·c', sub: `${f}×${c.toLocaleString()}`, value: `${fiberSpeed.toLocaleString()} km/s` })
    tpRows.push({ label: 'Fiber delay  arc/(f·c)', value: `${fmt(fib.ms, 4)} ms` })
  }
  tpRows.push({ label: 'T_p', value: `${fmt(tpTotal, 3)} ms`, total: true })

  // ── T_v rows ──
  const tvRows: MRow[] = []
  if (crx) {
    tvRows.push({ label: 'h₁  atm out',      sub: `${crx.h_out_km} km`,  value: '' })
    tvRows.push({ label: 'n₁  refraction',   value: `${crx.n_out}` })
    tvRows.push({ label: 'h₁·n₁ / c',        value: `${fmt(crx.atmosphere_out_ms)} ms` })
    tvRows.push({ label: '---', value: '' })
    tvRows.push({ label: 'Void distance (L)', value: fmtKm(crx.void_km) })
    tvRows.push({ label: 'L / c',             value: `${fmt(crx.void_ms)} ms` })
    tvRows.push({ label: '---', value: '' })
    tvRows.push({ label: 'h₂  atm in',       sub: `${crx.h_in_km} km`,   value: '' })
    tvRows.push({ label: 'n₂  refraction',   value: `${crx.n_in}` })
    tvRows.push({ label: 'h₂·n₂ / c',        value: `${fmt(crx.atmosphere_in_ms)} ms` })
    tvRows.push({ label: 'T_v', value: `${fmt(crx.total_ms)} ms`, total: true })
  }

  const roleColor = hop?.role === 'origin' ? COLORS.CYAN
    : hop?.role === 'destination' ? '#2E7D32'
    : COLORS.MAGENTA

  return (
    <div style={{ marginBottom: '6px' }}>
      {/* ── header ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px',
          background: open ? 'rgba(52,227,255,0.07)' : 'rgba(52,227,255,0.02)',
          border: `1px solid ${open ? 'rgba(52,227,255,0.28)' : 'rgba(52,227,255,0.1)'}`,
          borderRadius: open ? '4px 4px 0 0' : '4px',
          cursor: 'pointer', outline: 'none', transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px', color: COLORS.TEXT_DIM, minWidth: '18px',
          }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.14em', color: COLORS.CYAN,
          }}>
            {(entry.planet_id ?? `HOP ${index + 1}`).toUpperCase()}
          </span>
          <span style={{
            fontSize: '11px', color: roleColor,
            padding: '1px 7px',
            border: `1.5px solid ${roleColor}`,
            borderRadius: '6px 4px 7px 4px',
            textTransform: 'uppercase',
          }}>
            {hop?.role ?? ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px', color: COLORS.MAGENTA,
            padding: '1px 8px',
            border: `1.5px solid ${COLORS.MAGENTA}`,
            borderRadius: '6px 4px 7px 4px',
          }}>
            BASE-{entry.codex ?? '?'}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px', color: COLORS.TEXT_DIM,
          }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* ── expanded body ── */}
      {open && (
        <div className="hop-open" style={{
          background: '#FBF5E6',
          border: '1.5px solid rgba(43,39,34,0.4)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
        }}>
          <TabBar active={tab} onChange={setTab} />

          <div style={{ padding: '0 12px 12px' }}>

            {/* ── CODEX tab ── */}
            {tab === 'codex' && (
              <>
                {entry.received_as != null && (
                  <>
                    <Label>Received as base-{entry.codex}</Label>
                    <CodeBlock color={COLORS.CYAN}>
                      [{(entry.received_as as string[]).join(', ')}]
                    </CodeBlock>
                  </>
                )}

                {entry.ascii != null && (
                  <>
                    <Label>Decoded text</Label>
                    <CodeBlock color={COLORS.TEXT_HI}>
                      "{entry.ascii}"
                    </CodeBlock>
                  </>
                )}

                {entry.sent_as != null && (
                  <>
                    <Label>Re-sent in the next base</Label>
                    <CodeBlock color={COLORS.MAGENTA}>
                      [{(entry.sent_as as string[]).join(', ')}]
                    </CodeBlock>
                  </>
                )}

                {entry.binary_stream != null && (
                  <>
                    <Label>Bits on the wire</Label>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '8.5px', color: COLORS.TEXT_DIM,
                      lineHeight: '1.8', letterSpacing: '0.08em',
                      wordBreak: 'break-all',
                      padding: '6px 10px',
                      background: 'rgba(58,74,99,0.12)',
                      border: '1px solid rgba(58,74,99,0.35)',
                      borderRadius: '3px',
                      maxHeight: '60px', overflowY: 'auto',
                    }}>
                      {entry.binary_stream}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── MATH tab ── */}
            {tab === 'math' && hop && (
              <>
                <MathBlock
                  title="Tp — INTERNAL TRANSIT"
                  formula="Tp = 2πr·s / (N·f·c)  +  m·Δt"
                  color={COLORS.MAGENTA}
                  rows={tpRows}
                />
                {crx && (
                  <MathBlock
                    title={`Tv — VOID CROSSING → ${crx.to.toUpperCase()}`}
                    formula="Tv = (h₁·n₁ + L + h₂·n₂) / c"
                    color={COLORS.CYAN}
                    rows={tvRows}
                  />
                )}
              </>
            )}

            {tab === 'math' && !hop && (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px', color: COLORS.TEXT_DIM,
                padding: '10px 0',
              }}>
                No latency data for this hop.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

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
        <span className="panel-header-title">Number-base translation</span>
        <span className="panel-header-badge">
          {translation.length > 0 ? `${translation.length - 1} hops` : '--'}
        </span>
      </div>

      <div style={{ padding: '10px 12px 14px' }}>
        {translation.length === 0 ? (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px', color: COLORS.TEXT_DIM, letterSpacing: '0.08em',
          }}>
            No translation yet — send a message first.
          </div>
        ) : (
          <div style={{ paddingRight: '2px' }}>
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
