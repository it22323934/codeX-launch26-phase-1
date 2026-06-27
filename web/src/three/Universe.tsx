import { useCallback, useMemo } from 'react'
import { useStore } from '../store'
import { makeNormalizer } from '../utils/coords'
import { Planet } from './Planet'
import { VoidLink } from './VoidLink'
import { toggleNode, toggleLink } from '../api'

export function Universe() {
  const snapshot    = useStore(s => s.snapshot)
  const killMode    = useStore(s => s.killMode)
  const route       = useStore(s => s.route)
  const setSnapshot = useStore(s => s.setSnapshot)

  const normalize = useMemo(
    () => makeNormalizer(snapshot?.nodes ?? []),
    [snapshot]
  )

  // Build a set of edge pairs that are part of the active route
  const routeEdgeSet = useMemo(() => {
    const set = new Set<string>()
    const path = route?.path
    if (!path) return set
    for (let i = 0; i < path.length - 1; i++) {
      set.add(`${path[i]}|${path[i + 1]}`)
      set.add(`${path[i + 1]}|${path[i]}`)
    }
    return set
  }, [route])

  const handlePlanetClick = useCallback(
    async (nodeId: string) => {
      if (!killMode) return
      const node = snapshot?.nodes.find(n => n.id === nodeId)
      if (!node) return
      const next = await toggleNode(nodeId, !node.alive)
      if (next) setSnapshot(next)
    },
    [killMode, snapshot, setSnapshot]
  )

  const handleLinkClick = useCallback(
    async (a: string, b: string) => {
      if (!killMode) return
      const edge = snapshot?.edges.find(
        e => (e.a === a && e.b === b) || (e.a === b && e.b === a)
      )
      if (!edge) return
      const next = await toggleLink(a, b, !edge.alive)
      if (next) setSnapshot(next)
    },
    [killMode, snapshot, setSnapshot]
  )

  if (!snapshot) return null

  return (
    <group>
      {snapshot.edges.map(edge => {
        const na = snapshot.nodes.find(n => n.id === edge.a)
        const nb = snapshot.nodes.find(n => n.id === edge.b)
        if (!na || !nb) return null

        const [ax, az] = normalize(na.x, na.y)
        const [bx, bz] = normalize(nb.x, nb.y)
        const isRoute   = routeEdgeSet.has(`${edge.a}|${edge.b}`)

        return (
          <VoidLink
            key={`${edge.a}-${edge.b}`}
            posA={[ax, 0, az]}
            posB={[bx, 0, bz]}
            edge={edge}
            isRoute={isRoute}
            isKillMode={killMode}
            onClick={() => handleLinkClick(edge.a, edge.b)}
          />
        )
      })}

      {snapshot.nodes.map(node => {
        const [sx, sz] = normalize(node.x, node.y)
        return (
          <Planet
            key={node.id}
            node={node}
            scenePos={[sx, 0, sz]}
            isKillMode={killMode}
            onClick={() => handlePlanetClick(node.id)}
          />
        )
      })}
    </group>
  )
}
