// ─── Duration formatting ──────────────────────────────────────────────────────
// The engine reports latency in milliseconds, but an interstellar hop can take
// anything from a few ms to (for a broken-but-curious "what if") many years.
// These helpers let the UI render one millisecond figure in whichever human
// unit makes sense — a single value, or an auto "2 yr 3 mo" style breakdown.

/** Milliseconds in each base time unit. One source of truth for every cast. */
export const MS = Object.freeze({
  MILLISECOND: 1,
  SECOND:      1000,
  MINUTE:      1000 * 60,
  HOUR:        1000 * 60 * 60,
  DAY:         1000 * 60 * 60 * 24,
  // Calendar-average month / year so long spans read the way people expect.
  MONTH:       1000 * 60 * 60 * 24 * 30.4375,   // 365.25 / 12 days
  YEAR:        1000 * 60 * 60 * 24 * 365.25,     // Julian year
})

export type TimeUnitKey = 'auto' | 'ms' | 's' | 'min' | 'hr' | 'day' | 'month' | 'yr'

interface UnitDef {
  key: TimeUnitKey
  /** Dropdown label. */
  label: string
  /** Short suffix shown next to the number. */
  suffix: string
  /** Size of one unit in ms (undefined for the special "auto" mode). */
  ms?: number
  /** Decimal places to show for the single-unit readout. */
  dp: number
}

/** Ordered for the selector: auto first, then ascending unit size. */
export const TIME_UNITS: readonly UnitDef[] = Object.freeze([
  { key: 'auto', label: 'Auto',         suffix: '',     dp: 0 },
  { key: 'ms',   label: 'Milliseconds', suffix: 'ms',   ms: MS.MILLISECOND, dp: 2 },
  { key: 's',    label: 'Seconds',      suffix: 's',    ms: MS.SECOND,      dp: 3 },
  { key: 'min',  label: 'Minutes',      suffix: 'min',  ms: MS.MINUTE,      dp: 3 },
  { key: 'hr',   label: 'Hours',        suffix: 'hr',   ms: MS.HOUR,        dp: 4 },
  { key: 'day',  label: 'Days',         suffix: 'days', ms: MS.DAY,         dp: 4 },
  { key: 'month',label: 'Months',       suffix: 'mo',   ms: MS.MONTH,       dp: 4 },
  { key: 'yr',   label: 'Years',        suffix: 'yr',   ms: MS.YEAR,        dp: 5 },
])

/** Largest-to-smallest cascade used to build the "auto" breakdown. */
const BREAKDOWN: readonly { ms: number; short: string }[] = Object.freeze([
  { ms: MS.YEAR,        short: 'yr'  },
  { ms: MS.MONTH,       short: 'mo'  },
  { ms: MS.DAY,         short: 'd'   },
  { ms: MS.HOUR,        short: 'h'   },
  { ms: MS.MINUTE,      short: 'min' },
  { ms: MS.SECOND,      short: 's'   },
  { ms: MS.MILLISECOND, short: 'ms'  },
])

/** Most significant breakdown parts to keep (e.g. "2 yr 3 mo", not all seven). */
const MAX_BREAKDOWN_PARTS = 2

/**
 * Render a duration as the most natural reading: the two largest non-zero
 * units (e.g. "3 min 49 s", "2 yr 3 mo"). Sub-millisecond values stay in ms.
 */
export function humanizeDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0 ms'

  // Below a second, a single fractional-ms reading is clearest.
  if (ms < MS.SECOND) return `${trimNumber(ms, 3)} ms`

  let remaining = ms
  const parts: string[] = []
  for (const unit of BREAKDOWN) {
    if (parts.length >= MAX_BREAKDOWN_PARTS) break
    if (remaining < unit.ms && parts.length === 0) continue
    const whole = Math.floor(remaining / unit.ms)
    if (whole <= 0 && parts.length === 0) continue
    if (whole > 0) {
      parts.push(`${whole} ${unit.short}`)
      remaining -= whole * unit.ms
    } else if (parts.length > 0) {
      // keep cascading once we've started so "1 h 0 min" stays contiguous
      parts.push(`${whole} ${unit.short}`)
    }
  }
  return parts.length ? parts.join(' ') : `${trimNumber(ms, 3)} ms`
}

/** Convert a millisecond figure into one named unit, formatted for display. */
export function formatInUnit(ms: number, unitKey: TimeUnitKey): string {
  if (unitKey === 'auto') return humanizeDuration(ms)
  const unit = TIME_UNITS.find(u => u.key === unitKey)
  if (!unit || unit.ms == null) return humanizeDuration(ms)
  const value = ms / unit.ms
  return `${trimNumber(value, unit.dp)} ${unit.suffix}`.trim()
}

/** Locale-grouped number with up to `dp` decimals, trailing zeros trimmed. */
function trimNumber(n: number, dp: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: dp })
}
