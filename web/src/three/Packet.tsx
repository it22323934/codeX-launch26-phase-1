import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { COLORS, SCENE, ANIM } from '../constants/visual'
import { useCurve } from '../hooks/useCurve'
import { useStore } from '../store'

const reducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

export function Packet() {
  const curve    = useCurve()
  const route    = useStore(s => s.route)
  const groupRef = useRef<THREE.Group>(null)
  const meshRef  = useRef<THREE.Mesh>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const tRef     = useRef(0)

  // Reset progress whenever the route changes
  useEffect(() => {
    tRef.current = 0
  }, [route])

  useFrame(({ clock }, delta) => {
    if (!curve || !groupRef.current || reducedMotion) return

    // Advance t [0 → 1]
    tRef.current = Math.min(tRef.current + delta * SCENE.PACKET_SPEED, 1)

    // Move the whole group (sphere + Html label follow together)
    const pos = curve.getPoint(tRef.current)
    groupRef.current.position.copy(pos)

    // Pulsing emissive on the inner sphere mesh
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity =
        SCENE.PACKET_EMISSIVE_INTENSITY *
        (0.6 + 0.4 * Math.sin(clock.elapsedTime * ANIM.PACKET_PULSE_SPEED * Math.PI * 2))
    }

    // Update codex label text in-place to avoid React re-renders inside useFrame
    if (labelRef.current && route?.hop_log && route.translation) {
      const hopCount = route.hop_log.length
      const hopIdx   = Math.min(Math.floor(tRef.current * hopCount), hopCount - 1)
      const entry    = route.translation[hopIdx]
      if (entry) {
        labelRef.current.textContent = `[ BASE-${entry.codex ?? '?'} ]`
      }
    }
  })

  if (!curve) return null

  const startPos = curve.getPoint(0)
  const initialCodex = route?.translation?.[0]?.codex ?? '?'

  return (
    <group ref={groupRef} position={startPos} className="packet-anim">
      {/* Packet sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color={COLORS.CYAN}
          emissive={COLORS.CYAN}
          emissiveIntensity={SCENE.PACKET_EMISSIVE_INTENSITY}
          roughness={0}
          metalness={1}
        />
      </mesh>

      {/* Codex dialect label — follows group position */}
      <Html center distanceFactor={8} position={[0, 0.25, 0]}>
        <div
          ref={labelRef}
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '10px',
            fontWeight:    700,
            color:         COLORS.CYAN,
            background:    'rgba(10, 14, 22, 0.8)',
            padding:       '2px 6px',
            border:        `1px solid ${COLORS.CYAN}`,
            borderRadius:  '2px',
            whiteSpace:    'nowrap',
            pointerEvents: 'none',
            userSelect:    'none',
            textShadow:    `0 0 4px ${COLORS.CYAN}`,
          }}
        >
          {`[ BASE-${initialCodex} ]`}
        </div>
      </Html>
    </group>
  )
}
