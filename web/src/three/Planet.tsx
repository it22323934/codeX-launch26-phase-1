// src/three/Planet.tsx
//
// A planet: emissive sphere body, flat translucent atmosphere shell, equatorial
// tower ring, and a floating HUD label. In kill mode a click toggles the node;
// a dead planet desaturates to STEEL and gains a MAGENTA alarm ring.
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";

import type { NodeSnapshot } from "../api";
import { PALETTE, VISUAL } from "../constants/visual";
import { useStore } from "../store";
import TowerRing from "./TowerRing";
import type { ScenePos } from "./Universe";

export default function Planet({ node, position }: { node: NodeSnapshot; position: ScenePos }) {
  const killMode = useStore((s) => s.killMode);
  const killNode = useStore((s) => s.killNode);
  const route = useStore((s) => s.route);

  const onRoute = !!route?.deliverable && route.path.includes(node.id);
  const bodyColor = !node.alive ? PALETTE.STEEL : onRoute ? PALETTE.CYAN : PALETTE.TEXT_HI;
  const radius = node.radius_km * VISUAL.PLANET_RADIUS_SCALE;
  const atmoRadius =
    (node.radius_km + node.atmosphere_thickness_km) * VISUAL.PLANET_RADIUS_SCALE;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!killMode) return;
    e.stopPropagation();
    void killNode(node.id);
  };

  return (
    <group position={position}>
      <mesh
        onClick={handleClick}
        onPointerOver={(e) => {
          if (killMode) {
            e.stopPropagation();
            document.body.style.cursor = "crosshair";
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={bodyColor}
          emissiveIntensity={node.alive ? VISUAL.PLANET_EMISSIVE : 0.05}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Atmosphere: larger flat translucent sphere (never a gradient). */}
      <mesh>
        <sphereGeometry args={[atmoRadius, 32, 32]} />
        <meshBasicMaterial
          color={node.alive ? PALETTE.CYAN : PALETTE.STEEL}
          transparent
          opacity={VISUAL.ATMOSPHERE_OPACITY}
          depthWrite={false}
        />
      </mesh>

      {/* Alarm ring on a killed planet. */}
      {!node.alive && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[atmoRadius * 1.15, atmoRadius * 0.03, 8, 48]} />
          <meshStandardMaterial
            color={PALETTE.MAGENTA}
            emissive={PALETTE.MAGENTA}
            emissiveIntensity={1.6}
          />
        </mesh>
      )}

      <TowerRing node={node} radius={radius} />

      <Html center distanceFactor={18} position={[0, atmoRadius + 0.5, 0]}>
        <div className={`planet-label ${node.alive ? "" : "planet-label--dead"}`}>
          <span className="planet-label__id">{node.id}</span>
          <span className="planet-label__codex">BASE {node.codex}</span>
        </div>
      </Html>
    </group>
  );
}
