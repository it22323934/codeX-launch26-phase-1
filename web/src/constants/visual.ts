export const COLORS = Object.freeze({
  VOID_BLACK:  '#05060A',
  PANEL_BLACK: '#0A0E16',
  CYAN:        '#34E3FF',
  MAGENTA:     '#FF2D9B',
  STEEL:       '#3A4A63',
  TEXT_HI:     '#DCEBFF',
  TEXT_DIM:    '#6F8099',
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
