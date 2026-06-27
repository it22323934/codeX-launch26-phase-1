// src/three/RadarGrid.tsx
//
// Signature element: a circular radar grid the universe sits inside - concentric
// range rings, bearing ticks, and a slowly sweeping radial scan line. All flat
// emissive lines (Bloom adds the glow); no gradient. The sweep freezes under
// prefers-reduced-motion.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { Group } from "three";

import { PALETTE, VISUAL } from "../constants/visual";
import { useReducedMotion } from "../reducedMotion";

type P = [number, number, number];

// Points of a circle of `radius` on the ground (XZ) plane.
function circle(radius: number, segments = 96): P[] {
  const pts: P[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
  }
  return pts;
}

export default function RadarGrid() {
  const sweep = useRef<Group>(null);
  const reduced = useReducedMotion();

  useFrame((_, dt) => {
    if (sweep.current && !reduced) {
      sweep.current.rotation.y -= ((Math.PI * 2) / VISUAL.RADAR_SWEEP_SECONDS) * dt;
    }
  });

  const rings = Array.from(
    { length: VISUAL.RADAR_RINGS },
    (_, i) => (VISUAL.RADAR_RADIUS * (i + 1)) / VISUAL.RADAR_RINGS,
  );

  const ticks = Array.from({ length: VISUAL.RADAR_TICKS }, (_, i) => {
    const a = (i / VISUAL.RADAR_TICKS) * Math.PI * 2;
    const r0 = VISUAL.RADAR_RADIUS * 0.95;
    const r1 = VISUAL.RADAR_RADIUS;
    return [
      [Math.cos(a) * r0, 0, Math.sin(a) * r0],
      [Math.cos(a) * r1, 0, Math.sin(a) * r1],
    ] as [P, P];
  });

  return (
    <group>
      {rings.map((r, i) => (
        <Line key={`r${i}`} points={circle(r)} color={PALETTE.STEEL} transparent opacity={VISUAL.RADAR_OPACITY} />
      ))}
      {ticks.map((seg, i) => (
        <Line key={`t${i}`} points={seg} color={PALETTE.STEEL} transparent opacity={VISUAL.RADAR_OPACITY} />
      ))}
      <group ref={sweep}>
        <Line
          points={[
            [0, 0, 0],
            [VISUAL.RADAR_RADIUS, 0, 0],
          ]}
          color={PALETTE.CYAN}
          lineWidth={2}
          transparent
          opacity={0.6}
        />
      </group>
    </group>
  );
}
