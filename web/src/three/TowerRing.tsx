import { useMemo } from 'react'
import { COLORS, SCENE } from '../constants/visual'
import { Node, useStore } from '../store'

interface TowerRingProps {
  node: Node
  planetRadius: number
}

export function TowerRing({ node, planetRadius }: TowerRingProps) {
  const route = useStore(s => s.route)

  // Find which tower indices are active send/recv in the hop_log for this planet
  const activeTowerSet = useMemo(() => {
    const set = new Set<number>()
    if (!route?.hop_log) return set
    for (const hop of route.hop_log) {
      if (hop.planet !== node.id) continue
      if (hop.recv_tower != null) set.add(hop.recv_tower)
      if (hop.send_tower != null) set.add(hop.send_tower)
    }
    return set
  }, [route, node.id])

  const N = Math.max(node.active_towers ?? 3, 1)
  const R = planetRadius

  const towers = useMemo(() => {
    const result = []
    for (let k = 0; k < N; k++) {
      const angle = (2 * Math.PI * k) / N
      result.push({
        index: k,
        x: R * Math.sin(angle),
        z: R * Math.cos(angle),
      })
    }
    return result
  }, [N, R])

  return (
    <group>
      {towers.map(t => {
        const isActive = activeTowerSet.has(t.index)
        const color    = isActive ? COLORS.CYAN : COLORS.STEEL
        const emissive = isActive ? COLORS.CYAN : COLORS.STEEL
        const intensity = isActive ? 2.5 : 0.3

        return (
          <mesh key={t.index} position={[t.x, 0, t.z]}>
            <octahedronGeometry args={[SCENE.TOWER_SIZE, 0]} />
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={intensity}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
        )
      })}
    </group>
  )
}
