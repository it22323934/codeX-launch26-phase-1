import { useState } from 'react'
import { useStore } from '../store'
import { COLORS } from '../constants/visual'

const mono = (color: string = COLORS.TEXT_HI, size = '9px'): React.CSSProperties => ({
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: size, color, lineHeight: '1.6', wordBreak: 'break-all',
})

function HopCard({ entry, index }: { entry: any; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const isOpen = open

  return (
    <div style={{ marginBottom: '5px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px',
          background: isOpen ? 'rgba(52,227,255,0.06)' : 'rgba(52,227,255,0.02)',
          border: `1px solid ${isOpen ? 'rgba(52,227,255,0.25)' : 'rgba(52,227,255,0.1)'}`,
          borderRadius: isOpen ? '3px 3px 0 0' : '3px',
          cursor: 'pointer', outline: 'none',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '8px', color: COLORS.TEXT_DIM,
          }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '8px', fontWeight: 700,
            letterSpacing: '0.12em', color: COLORS.CYAN,
          }}>
            {(entry.planet_id ?? entry.planet ?? `HOP ${index + 1}`).toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '8px', color: COLORS.MAGENTA,
            padding: '1px 6px',
            border: `1px solid rgba(255,45,155,0.3)`,
            borderRadius: '2px',
          }}>
            BASE-{entry.codex ?? '?'}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px', color: COLORS.TEXT_DIM,
          }}>
            {isOpen ? '[-]' : '[+]'}
          </span>
        </div>
      </button>

      {isOpen && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(5,6,10,0.6)',
          border: '1px solid rgba(52,227,255,0.1)', borderTop: 'none',
          borderRadius: '0 0 3px 3px',
        }}>
          {/* RECEIVED */}
          {entry.received_as != null && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '6px', fontWeight: 700,
                letterSpacing: '0.14em', color: COLORS.TEXT_DIM,
                marginBottom: '4px',
              }}>
                RX — BASE-{entry.codex}
              </div>
              <div style={{
                ...mono(COLORS.CYAN, '9px'),
                padding: '4px 8px',
                background: 'rgba(52,227,255,0.04)',
                borderLeft: `2px solid ${COLORS.CYAN}`,
                borderRadius: '0 2px 2px 0',
              }}>
                [{(entry.received_as as string[]).join(', ')}]
              </div>
            </div>
          )}

          {/* ASCII internal */}
          {entry.ascii != null && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '6px', fontWeight: 700,
                letterSpacing: '0.14em', color: COLORS.TEXT_DIM,
                marginBottom: '4px',
              }}>
                ASCII INTERNAL
              </div>
              <div style={{
                ...mono(COLORS.TEXT_HI, '10px'),
                padding: '4px 8px',
                background: 'rgba(220,235,255,0.04)',
                borderLeft: `2px solid rgba(220,235,255,0.3)`,
                borderRadius: '0 2px 2px 0',
              }}>
                "{entry.ascii}"
              </div>
            </div>
          )}

          {/* TRANSMITTED */}
          {entry.sent_as != null && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '6px', fontWeight: 700,
                letterSpacing: '0.14em', color: COLORS.TEXT_DIM,
                marginBottom: '4px',
              }}>
                TX — NEXT BASE
              </div>
              <div style={{
                ...mono(COLORS.MAGENTA, '9px'),
                padding: '4px 8px',
                background: 'rgba(255,45,155,0.04)',
                borderLeft: `2px solid ${COLORS.MAGENTA}`,
                borderRadius: '0 2px 2px 0',
              }}>
                [{(entry.sent_as as string[]).join(', ')}]
              </div>
            </div>
          )}

          {/* BINARY STREAM */}
          {entry.binary_stream != null && (
            <div>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '6px', fontWeight: 700,
                letterSpacing: '0.14em', color: COLORS.TEXT_DIM,
                marginBottom: '4px',
              }}>
                BINARY STREAM
              </div>
              <div style={{
                ...mono(COLORS.TEXT_DIM, '7px'),
                padding: '4px 8px',
                background: 'rgba(58,74,99,0.15)',
                borderLeft: `2px solid rgba(58,74,99,0.5)`,
                borderRadius: '0 2px 2px 0',
                maxHeight: '44px', overflowY: 'auto',
                letterSpacing: '0.06em',
              }}>
                {entry.binary_stream}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function EncodingPanel() {
  const translation = useStore(s => s.route?.translation ?? [])

  return (
    <div>
      <div className="panel-header">
        <div className="panel-header-dot" />
        <span className="panel-header-title">CODEX TRANSLATION</span>
        <span className="panel-header-badge">{translation.length > 0 ? `${translation.length} HOPS` : '--'}</span>
      </div>

      <div style={{ padding: '10px 14px' }}>
        {translation.length === 0 ? (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px', color: COLORS.TEXT_DIM, letterSpacing: '0.08em',
          }}>
            [ NO TRANSLATION LOG ]
          </div>
        ) : (
          <div style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '2px' }}>
            {translation.map((entry: any, i: number) => (
              <HopCard key={i} entry={entry} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
