import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { makeNormalizer, towerWorldPos } from '../utils/coords'
import { SCENE } from '../constants/visual'

/**
 * Builds a CatmullRomCurve3 that traces the full packet route:
 *   send-tower → (void) → recv-tower → (planet surface arc) → send-tower → …
 *
 * Returns null when no valid route is in the store.
 */
export function useCurve(): THREE.CatmullRomCurve3 | null {
  const route    = useStore(s => s.route)
  const snapshot = useStore(s => s.snapshot)

  return useMemo(() => {
    if (!route?.deliverable || !route.hop_log?.length || !snapshot) return null

    const normalize = makeNormalizer(snapshot.nodes)
    const nodeMap   = new Map(snapshot.nodes.map(n => [n.id, n]))
    const points: THREE.Vector3[] = []

    for (let i = 0; i < route.hop_log.length; i++) {
      const hop  = route.hop_log[i]
      if (!hop?.planet) continue

      const node = nodeMap.get(hop.planet)
      if (!node) continue

      const [sx, sz]   = normalize(node.x, node.y)
      const planetR    = (node.radius_km ?? 1000) * SCENE.PLANET_RADIUS_SCALE
      const N          = Math.max(node.active_towers ?? 3, 1)

      if (i === 0) {
        // Origin: only a send tower exists
        const st = hop.send_tower ?? 0
        const [wx, , wz] = towerWorldPos(sx, sz, st, N, planetR)
        points.push(new THREE.Vector3(wx, 0, wz))
      } else {
        // Receiving planet: first point is the recv tower
        const rt = hop.recv_tower ?? 0
        const [rx, , rz] = towerWorldPos(sx, sz, rt, N, planetR)
        points.push(new THREE.Vector3(rx, 0, rz))

        // If there is a next hop, arc along the equator to the send tower
        if (i < route.hop_log.length - 1) {
          const st = hop.send_tower ?? 0
          if (st !== rt) {
            const recvAngle = (2 * Math.PI * rt) / N
            const sendAngle = (2 * Math.PI * st) / N
            const steps = 6
            for (let j = 1; j < steps; j++) {
              const t     = j / steps
              const angle = recvAngle + (sendAngle - recvAngle) * t
              points.push(new THREE.Vector3(
                sx + planetR * Math.sin(angle),
                0,
                sz + planetR * Math.cos(angle)
              ))
            }
          }
          const [wx, , wz] = towerWorldPos(sx, sz, st, N, planetR)
          points.push(new THREE.Vector3(wx, 0, wz))
        }
      }
    }

    if (points.length < 2) return null

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
  }, [route, snapshot])
}
