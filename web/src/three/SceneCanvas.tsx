// src/three/SceneCanvas.tsx
//
// The holographic orbital map: R3F Canvas with a flat VOID_BLACK background,
// a starfield for depth, OrbitControls, the radar grid, the universe, and Bloom
// postprocessing so emissive bodies and the packet glow (neon without gradients).
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

import { PALETTE, VISUAL } from "../constants/visual";
import { useReducedMotion } from "../reducedMotion";
import { useStore } from "../store";
import RadarGrid from "./RadarGrid";
import Universe from "./Universe";

export default function SceneCanvas() {
  const snapshot = useStore((s) => s.snapshot);
  const reduced = useReducedMotion();

  return (
    <Canvas
      camera={{ position: VISUAL.CAMERA_POSITION, fov: VISUAL.CAMERA_FOV }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[PALETTE.VOID_BLACK]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[12, 22, 10]} intensity={1.2} color={PALETTE.CYAN} />
      <Stars
        radius={120}
        depth={60}
        count={VISUAL.STAR_COUNT}
        factor={3}
        fade
        speed={reduced ? 0 : 0.4}
      />

      <RadarGrid />
      {snapshot && <Universe snapshot={snapshot} />}

      <OrbitControls enablePan={false} minDistance={6} maxDistance={48} />

      <EffectComposer>
        <Bloom
          intensity={VISUAL.BLOOM_INTENSITY}
          luminanceThreshold={VISUAL.BLOOM_LUMINANCE_THRESHOLD}
          radius={VISUAL.BLOOM_RADIUS}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
