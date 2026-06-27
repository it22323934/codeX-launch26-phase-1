// Hand-drawn sketchbook palette. Token names are kept from the old neon theme
// so every COLORS.* reference across the app re-themes at once:
//   VOID_BLACK / PANEL_BLACK = paper tones (backgrounds)
//   CYAN  = blue ink (primary accent / active route)
//   MAGENTA = red ink (alarm / dead)
//   STEEL = pencil grey (dormant / secondary lines)
//   TEXT_HI = dark ink (primary text)   TEXT_DIM = faded pencil (secondary text)
export const COLORS = Object.freeze({
  VOID_BLACK:  '#ECE3CE',   // map / app paper
  PANEL_BLACK: '#FBF5E6',   // panel card paper (creamier)
  CYAN:        '#2E5E8C',   // blue ink (primary / active route)
  MAGENTA:     '#C0392B',   // red ink (alarm / dead)
  STEEL:       '#9C9176',   // pencil grey (dormant)
  TEXT_HI:     '#2B2722',   // dark ink (primary text)
  TEXT_DIM:    '#7B7059',   // faded pencil (secondary text)
})

// Extra named inks for the sketch theme (used where a raw hex was hardcoded).
export const INK = Object.freeze({
  PAPER:       '#ECE3CE',   // base paper
  PAPER_CARD:  '#FBF5E6',   // panel paper
  PAPER_INPUT: '#FFFDF5',   // input/field paper (near white)
  LINE:        '#2B2722',   // pen outline
  PENCIL:      '#9C9176',   // light pencil line
  HIGHLIGHT:   '#E0A33D',   // amber highlighter (route emphasis)
})

export const SCENE = Object.freeze({
  /** km → scene-unit scale for planet radii. Keeps Caelum (58 232 km) ≈ 3.5 units
   *  in a 20-unit scene while Aegis (6 371 km) ≈ 0.38. Use PLANET_MIN_RADIUS as floor. */
  PLANET_RADIUS_SCALE:      0.00006,
  /** Minimum visual radius (scene units) so small planets stay clickable. */
  PLANET_MIN_RADIUS:        0.25,
  /** Minimum visual atmosphere shell extra radius (scene units). */
  ATMO_MIN_EXTRA:           0.08,
  ATMOSPHERE_OPACITY:       0.18,
  PACKET_SPEED:             0.3,
  SCENE_SIZE:               20,
  CAMERA_FOV:               60,
  BLOOM_STRENGTH:           1.5,
  BLOOM_RADIUS:             0.4,
  BLOOM_THRESHOLD:          0.1,
  TOWER_SIZE:               0.08,
  VOID_LINK_WIDTH:          1,
  ROUTE_LINK_RADIUS:        0.04,
  PACKET_EMISSIVE_INTENSITY: 3.0,
  PLANET_EMISSIVE_INTENSITY: 0.8,
  ATMOSPHERE_COLOR:         '#1a3a5c',
  STARFIELD_COUNT:          3000,
})

export const ANIM = Object.freeze({
  BOOT_DURATION_MS:   1200,
  GLITCH_DURATION_MS: 400,
  RADAR_SPEED:        0.3,
  PACKET_PULSE_SPEED: 2.0,
})
