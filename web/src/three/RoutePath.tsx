import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { COLORS, SCENE, ANIM } from '../constants/visual'
import { useCurve } from '../hooks/useCurve'

export function RoutePath() {
  const curve    = useCurve()
  const meshRef  = useRef<THREE.Mesh>(null)
  const geoRef   = useRef<THREE.TubeGeometry | null>(null)

  const tubeGeo = useMemo(() => {
    if (geoRef.current) {
      geoRef.current.dispose()
      geoRef.current = null
    }
    if (!curve) return null
    const geo = new THREE.TubeGeometry(curve, 128, SCENE.ROUTE_LINK_RADIUS, 8, false)
    geoRef.current = geo
    return geo
  }, [curve])

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      geoRef.current?.dispose()
    }
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.opacity =
      0.55 + 0.45 * Math.sin(clock.elapsedTime * ANIM.PACKET_PULSE_SPEED * Math.PI)
  })

  if (!tubeGeo) return null

  return (
    <mesh ref={meshRef} geometry={tubeGeo}>
      <meshStandardMaterial
        color={COLORS.CYAN}
        emissive={COLORS.CYAN}
        emissiveIntensity={2.2}
        transparent
        opacity={0.75}
        depthWrite={false}
      />
    </mesh>
  )
}
