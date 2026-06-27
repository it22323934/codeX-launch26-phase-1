import { useState } from 'react'
import { Line } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS, SCENE } from '../constants/visual'
import { Edge } from '../store'

interface VoidLinkProps {
  posA: [number, number, number]
  posB: [number, number, number]
  edge: Edge
  isRoute: boolean
  isKillMode: boolean
  onClick: () => void
}

export function VoidLink({
  posA,
  posB,
  edge,
  isRoute,
  isKillMode,
  onClick,
}: VoidLinkProps) {
  const [hovered, setHovered] = useState(false)

  // Route edges are rendered exclusively by RoutePath as a glowing tube
  if (isRoute) return null

  const color  = !edge.alive ? COLORS.MAGENTA : hovered && isKillMode ? COLORS.MAGENTA : COLORS.STEEL
  const width  = hovered && isKillMode ? SCENE.VOID_LINK_WIDTH * 2 : SCENE.VOID_LINK_WIDTH
  const points: [THREE.Vector3, THREE.Vector3] = [
    new THREE.Vector3(...posA),
    new THREE.Vector3(...posB),
  ]

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setHovered(true)
    if (isKillMode) document.body.style.cursor = 'crosshair'
  }

  function handlePointerOut() {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    onClick()
  }

  if (!edge.alive) {
    return (
      <Line
        points={points}
        color={color}
        lineWidth={width}
        dashed
        dashSize={0.25}
        gapSize={0.15}
        transparent
        opacity={0.55}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
    )
  }

  return (
    <Line
      points={points}
      color={color}
      lineWidth={width}
      transparent
      opacity={0.4}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  )
}
