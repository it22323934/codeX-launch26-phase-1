import { useState } from 'react'
import { useStore, TranslationEntry } from '../store'
import { COLORS } from '../constants/visual'

const HEADING: React.CSSProperties = {
  fontFamily:    "'Orbitron', sans-serif",
  fontSize:      '9px',
  fontWeight:    700,
  letterSpacing: '0.14em',
  color:         COLORS.TEXT_DIM,
  marginBottom:  '10px',
}

const LABEL: React.CSSProperties = {
  fontFamily:    "'Orbitron', sans-serif",
  fontSize:      '7px',
  letterSpacing: '0.08em',
  color:         COLORS.TEXT_DIM,
}

const MONO: React.CSSProperties = {
  fontFamily:  "'JetBrains Mono', monospace",
  fontSize:    '9px',
  color:       COLORS.TEXT_HI,
  wordBreak:   'break-all',
  lineHeight:  '1.5',
}

const DIVIDER: React.CSSProperties = {
  borderTop: `1px solid rgba(52, 227, 255, 0.1)`,
  margin:    '8px 0',
}

function HopTranslation({ entry, index }: { entry: TranslationEntry; index: number }) {
  const [open, setOpen] = useState(index === 0)

  return (
    <div style={{ marginBottom: '6px' }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:           '100%',
          background:      open ? 'rgba(52,227,255,0.06)' : 'transparent',
          border:          `1px solid rgba(52,227,255,0.18)`,
          borderRadius:    '2px',
          padding:         '5px 8px',
          display:         'flex',
          justifyContent:  'space-between',
          alignItems:      'center',
          cursor:          'pointer',
          color:           COLORS.CYAN,
          fontFamily:      "'Orbitron', sans-serif",
          fontSize:        '8px',
          fontWeight:      700,
          letterSpacing:   '0.1em',
          outline:         'none',
        }}
      >
        <span>{(entry.planet ?? `HOP ${index + 1}`).toUpperCase()}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px' }}>
          BASE-{entry.codex ?? '?'}
          {'  '}{open ? '[-]' : '[+]'}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding:    '8px',
            background: 'rgba(10,14,22,0.4)',
            border:     '1px solid rgba(52,227,255,0.10)',
            borderTop:  'none',
            borderRadius: '0 0 2px 2px',
          }}
        >
          {entry.received_digits != null && (
            <>
              <div style={LABEL}>RECEIVED — BASE-{entry.codex}</div>
              <div style={{ ...MONO, color: COLORS.CYAN }}>
                [{entry.received_digits.join(', ')}]
              </div>
              <div style={DIVIDER} />
            </>
          )}

          {entry.ascii != null && (
            <>
              <div style={LABEL}>ASCII</div>
              <div style={{ ...MONO, color: COLORS.TEXT_HI }}>{entry.ascii}</div>
              <div style={DIVIDER} />
            </>
          )}

          {entry.sent_digits != null && (
            <>
              <div style={LABEL}>TRANSMITTED — BASE-{entry.codex}</div>
              <div style={{ ...MONO, color: COLORS.MAGENTA }}>
                [{entry.sent_digits.join(', ')}]
              </div>
              <div style={DIVIDER} />
            </>
          )}

          {entry.binary_stream != null && (
            <>
              <div style={LABEL}>BINARY STREAM</div>
              <div
                style={{
                  ...MONO,
                  color:      COLORS.TEXT_DIM,
                  fontSize:   '8px',
                  maxHeight:  '48px',
                  overflowY:  'auto',
                  letterSpacing: '0.05em',
                }}
              >
                {entry.binary_stream}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function EncodingPanel() {
  const route       = useStore(s => s.route)
  const translation = route?.translation ?? []

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={HEADING}>CODEX TRANSLATION</div>

      {translation.length === 0 ? (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   '10px',
            color:      COLORS.TEXT_DIM,
          }}
        >
          [ NO TRANSLATION LOG ]
        </div>
      ) : (
        <div
          style={{
            maxHeight:  '200px',
            overflowY:  'auto',
            paddingRight: '4px',
          }}
        >
          {translation.map((entry, i) => (
            <HopTranslation key={i} entry={entry} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
