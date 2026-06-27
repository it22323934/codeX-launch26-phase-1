// src/constants/protocol.ts
//
// Protocol constants mirroring the backend defaults. The UI prefers values the
// API delivers in `snapshot.constants`; these exist only as fallbacks and for
// axis/labels. Nothing here is hardcoded elsewhere in the UI, and the frontend
// never re-derives a physics value by hand - it consumes what the API sends.

/** Speed of light (km/s). Spec section B. Display / fallback only. */
export const SPEED_OF_LIGHT_KMS = 300_000;

/** Longest single void hop (km). Spec section A. Display / fallback only. */
export const LMAX_KM = 50_000_000;

/** Payload offered in the Toolbar before the operator types one. */
export const DEFAULT_PAYLOAD = "Hello world";

/** HUD labels for the four latency components, in TelemetryPanel order. */
export const LATENCY_LABELS = Object.freeze({
  void_ms: "VOID",
  atmosphere_ms: "ATMOSPHERE",
  fiber_ms: "FIBER",
  tower_ms: "TOWER",
});
