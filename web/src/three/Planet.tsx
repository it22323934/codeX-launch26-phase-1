import { useRef, useState } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'
import { COLORS, SCENE } from '../constants/visual'
import { Node, useStore } from '../store'
import { TowerRing } from './TowerRing'

interface PlanetProps {
  node: Node
  scenePos: [number, number, number]
  isKillMode: boolean
  onClick: () => void
}

export function Planet({ node, scenePos, isKillMode, onClick }: PlanetProps) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)
  const route   = useStore(s => s.route)

  const planetR = (node.radius_km ?? 1000) * SCENE.PLANET_RADIUS_SCALE
  const atmoR   = planetR + (node.atmosphere_thickness_km ?? 200) * SCENE.PLANET_RADIUS_SCALE

  const isInRoute = Boolean(route?.path?.includes(node.id))
  const bodyColor = node.alive
    ? (isInRoute ? COLORS.CYAN : COLORS.TEXT_HI)
    : COLORS.STEEL

  const emissiveColor = node.alive
    ? (isInRoute ? COLORS.CYAN : COLORS.CYAN)
    : COLORS.MAGENTA

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

  return (
    <group position={scenePos}>
      {/* Planet body */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[planetR, 32, 24]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={emissiveColor}
          emissiveIntensity={
            node.alive
              ? SCENE.PLANET_EMISSIVE_INTENSITY * (hovered ? 1.6 : 1.0)
              : 0.4
          }
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* Atmosphere shell */}
      <mesh>
        <sphereGeometry args={[atmoR, 32, 24]} />
        <meshStandardMaterial
          color={node.alive ? SCENE.ATMOSPHERE_COLOR : COLORS.MAGENTA}
          transparent
          opacity={node.alive ? SCENE.ATMOSPHERE_OPACITY : 0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Dead alarm ring */}
      {!node.alive && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[atmoR * 1.05, atmoR * 1.12, 48]} />
          <meshBasicMaterial
            color={COLORS.MAGENTA}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Kill-mode hover ring */}
      {isKillMode && hovered && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[atmoR * 1.1, atmoR * 1.18, 48]} />
          <meshBasicMaterial
            color={COLORS.MAGENTA}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Tower ring */}
      <TowerRing node={node} planetRadius={planetR} />

      {/* Label */}
      <Html
        center
        position={[0, atmoR + 0.15, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '9px',
            fontWeight: 700,
            color: node.alive ? COLORS.CYAN : COLORS.MAGENTA,
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
            textShadow: node.alive
              ? `0 0 6px ${COLORS.CYAN}`
              : `0 0 6px ${COLORS.MAGENTA}`,
            userSelect: 'none',
          }}
        >
          {node.id.toUpperCase()}
        </div>
      </Html>
    </group>
  )
}
