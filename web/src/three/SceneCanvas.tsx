import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, OrbitControls, Line } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { COLORS, SCENE, ANIM } from '../constants/visual'
import { Universe } from './Universe'
import { RoutePath } from './RoutePath'
import { Packet } from './Packet'
import { useStore } from '../store'

const RADAR_RINGS  = [2.5, 5, 7.5, 10, 12.5]
const OUTER_RADIUS = 13
const RING_SEGS   = 80

const reducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

function circlePoints(radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= RING_SEGS; i++) {
    const a = (i / RING_SEGS) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
  }
  return pts
}

function RadarGrid() {
  const sweepRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!reducedMotion && sweepRef.current) {
      sweepRef.current.rotation.y += ANIM.RADAR_SPEED * delta
    }
  })

  const ringPointArrays = useMemo(
    () => RADAR_RINGS.map(r => circlePoints(r)),
    []
  )

  const tickPairs = useMemo(() => {
    const pairs: Array<[THREE.Vector3, THREE.Vector3]> = []
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const r1    = OUTER_RADIUS - 0.6
      const r2    = OUTER_RADIUS
      pairs.push([
        new THREE.Vector3(Math.cos(angle) * r1, 0, Math.sin(angle) * r1),
        new THREE.Vector3(Math.cos(angle) * r2, 0, Math.sin(angle) * r2),
      ])
    }
    return pairs
  }, [])

  const sweepPoints = useMemo<[THREE.Vector3, THREE.Vector3]>(
    () => [new THREE.Vector3(0, 0, 0), new THREE.Vector3(OUTER_RADIUS, 0, 0)],
    []
  )

  return (
    <group>
      {ringPointArrays.map((pts, i) => (
        <Line
          key={`ring-${i}`}
          points={pts}
          color={COLORS.STEEL}
          lineWidth={0.6}
          transparent
          opacity={0.25}
        />
      ))}
      {tickPairs.map(([p1, p2], i) => (
        <Line
          key={`tick-${i}`}
          points={[p1, p2]}
          color={COLORS.STEEL}
          lineWidth={0.6}
          transparent
          opacity={0.35}
        />
      ))}
      <group ref={sweepRef} className="radar-sweep">
        <Line
          points={sweepPoints}
          color={COLORS.CYAN}
          lineWidth={1}
          transparent
          opacity={0.22}
        />
      </group>
    </group>
  )
}

export function SceneCanvas() {
  const route = useStore(s => s.route)
  const hasRoute = Boolean(route?.deliverable && route.hop_log?.length)

  return (
    <Canvas
      camera={{
        fov:      SCENE.CAMERA_FOV,
        near:     0.1,
        far:      1000,
        position: [0, 14, 16],
      }}
      style={{ background: COLORS.VOID_BLACK, width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <Stars
        radius={120}
        depth={60}
        count={SCENE.STARFIELD_COUNT}
        factor={4}
        saturation={0}
        fade
      />

      {/* Ambient base light — very dim to preserve emissive glow */}
      <ambientLight intensity={0.04} />
      {/* Cyan fill light from above */}
      <pointLight position={[0, 12, 0]} intensity={0.6} color={COLORS.CYAN} />
      {/* Magenta accent */}
      <pointLight position={[8, 4, 6]} intensity={0.25} color={COLORS.MAGENTA} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={60}
        screenSpacePanning={false}
      />

      <RadarGrid />
      <Universe />

      {hasRoute && (
        <>
          <RoutePath />
          <Packet />
        </>
      )}

      <EffectComposer>
        <Bloom
          intensity={SCENE.BLOOM_STRENGTH}
          luminanceThreshold={SCENE.BLOOM_THRESHOLD}
          radius={SCENE.BLOOM_RADIUS}
        />
      </EffectComposer>
    </Canvas>
  )
}
