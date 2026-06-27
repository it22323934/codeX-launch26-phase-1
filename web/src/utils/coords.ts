import { SCENE } from '../constants/visual'

/**
 * Returns a function that maps raw config (x, y) coordinates
 * into Three.js scene units, centred and scaled to SCENE_SIZE.
 * config.x  maps to scene X
 * config.y  maps to scene Z  (Y is always 0 — ground plane)
 */
export function makeNormalizer(
  nodes: { x: number; y: number }[]
): (x: number, y: number) => [number, number] {
  if (nodes.length === 0) {
    return () => [0, 0]
  }

  const xs = nodes.map(n => n.x)
  const ys = nodes.map(n => n.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const rangeX = maxX - minX
  const rangeY = maxY - minY
  const range  = Math.max(rangeX, rangeY, 1)   // prevent /0
  const scale  = SCENE.SCENE_SIZE / range
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  return (x: number, y: number): [number, number] => [
    (x - cx) * scale,
    (y - cy) * scale,
  ]
}

/**
 * Compute the world-space position of tower `index` around a planet.
 * Tower k sits at angle θ_k = 2π·k/N clockwise from +Z, on the equatorial ring.
 *
 * Returns [worldX, 0, worldZ]
 */
export function towerWorldPos(
  planetSceneX: number,
  planetSceneZ: number,
  towerIndex: number,
  totalTowers: number,
  planetSceneRadius: number
): [number, number, number] {
  const N = Math.max(totalTowers, 1)
  const angle = (2 * Math.PI * towerIndex) / N
  return [
    planetSceneX + planetSceneRadius * Math.sin(angle),
    0,
    planetSceneZ + planetSceneRadius * Math.cos(angle),
  ]
}
