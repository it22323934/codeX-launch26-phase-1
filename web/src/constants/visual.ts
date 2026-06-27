// src/constants/visual.ts
//
// Presentation tuning for the Relic Ring HUD: palette, sizes, speeds,
// opacities. Edited by developers to change the look, never by end users, and
// never duplicated inline in a component (constants-config-discipline skill).
// This module is the single source of truth for color: main.tsx injects PALETTE
// into CSS custom properties so the stylesheet and the 3D scene agree.
//
// Aesthetic contract (PROMPT_frontend_threejs.md): deep-space cyberpunk command
// HUD. Color is information - CYAN means the system is working, MAGENTA means
// something is broken (alert only, never decoration). Hard rules: no gradients
// anywhere, and no emojis or decorative glyphs anywhere. Depth comes from flat
// fills, backdrop blur, box-shadow, a starfield, and Three.js emissive
// materials with Bloom postprocessing - never a gradient.

// Color tokens. Each encodes a network state; the table is disciplined, not
// decorative. Frozen so a stray write cannot reassign a meaning at runtime.
export const PALETTE = Object.freeze({
  VOID_BLACK: "#05060A", // base canvas / deep space (flat fill)
  PANEL_BLACK: "#0A0E16", // glass panel fill, used translucent (~0.55 alpha)
  CYAN: "#34E3FF", // live / healthy / active route / primary data
  MAGENTA: "#FF2D9B", // alarm / dead node / signal lost (means alert only)
  STEEL: "#3A4A63", // dormant: available-but-inactive links, idle towers
  TEXT_HI: "#DCEBFF", // primary readout text
  TEXT_DIM: "#6F8099", // secondary labels, units
});

// Glass alpha applied to PANEL_BLACK for panels. Kept < 0.6 so the starfield
// and the orbital map read through the HUD framing.
export const PANEL_ALPHA = 0.55;

export const VISUAL = Object.freeze({
  // --- Layout (scene units; see Universe.tsx normalization) ---------------
  // Target span of the normalized planet field across its widest axis. Planet
  // positions are fit to this box; camera framing assumes roughly this size.
  SCENE_SIZE: 16,

  // --- Planet bodies ------------------------------------------------------
  // Scene units per planet radius_km. Tuned to the bundled universe magnitudes
  // (radius_km ~ 4e5) so a planet reads ~0.6 units against SCENE_SIZE 16.
  // Retune if a config uses very different radii (presentation only).
  PLANET_RADIUS_SCALE: 1.5e-6,
  // Atmosphere shell opacity. Design choice; keep < 0.5 so planets stay legible.
  ATMOSPHERE_OPACITY: 0.18,
  // Emissive intensity of a live planet body; feeds the Bloom glow.
  PLANET_EMISSIVE: 0.6,

  // --- Towers -------------------------------------------------------------
  TOWER_SIZE: 0.06, // octahedron radius for an equatorial tower marker
  TOWER_EMISSIVE_ACTIVE: 1.4, // a tower on the current route (bright)
  TOWER_EMISSIVE_IDLE: 0.15, // a dormant tower (dim STEEL)

  // --- Links / route ------------------------------------------------------
  LINK_WIDTH: 1, // available void link
  ROUTE_WIDTH: 3, // active route line
  LINK_OPACITY: 0.35, // dormant link opacity (drawn in STEEL)
  DEAD_DASH_SIZE: 0.2, // dash length for a downed link
  DEAD_GAP_SIZE: 0.12, // gap length for a downed link

  // --- Packet (animation pace is visual only; telemetry shows true ms) -----
  // Curve parameter (0..1 over the whole route) advanced per second.
  PACKET_SPEED: 0.12,
  PACKET_SIZE: 0.12, // emissive packet mesh radius
  PACKET_EMISSIVE: 2.0, // bright, so Bloom makes the packet the focal point

  // --- Radar grid (signature element) -------------------------------------
  RADAR_RINGS: 4, // concentric range rings
  RADAR_TICKS: 24, // bearing ticks around the rim
  RADAR_RADIUS: 11, // outer radius of the radar grid (scene units)
  RADAR_OPACITY: 0.22, // grid line opacity (flat STEEL)
  RADAR_SWEEP_SECONDS: 8, // seconds for one full sweep rotation

  // --- Bloom postprocessing ----------------------------------------------
  BLOOM_INTENSITY: 0.9,
  BLOOM_LUMINANCE_THRESHOLD: 0.2,
  BLOOM_RADIUS: 0.6,

  // --- Camera -------------------------------------------------------------
  CAMERA_POSITION: [0, 14, 18] as [number, number, number],
  CAMERA_FOV: 50,

  // --- Stars (depth) ------------------------------------------------------
  STAR_COUNT: 4000,

  // --- Motion (ms) --------------------------------------------------------
  BOOT_SEQUENCE_MS: 1400, // HUD draw-in / panel fade on load
  GLITCH_MS: 360, // one-shot glitch flicker on a state change
});
