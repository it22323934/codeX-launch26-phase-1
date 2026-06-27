// src/three/Universe.tsx
//
// Maps the 2D config into the 3D scene. Node x/y (grid units) are normalized to
// a centered box of SCENE_SIZE and placed at (nx, 0, ny) on the ground plane.
// Layout uses RELATIVE positions only - never the physics coordinate scale.
import { useMemo } from "react";

import type { Snapshot } from "../api";
import { VISUAL } from "../constants/visual";
import { useStore } from "../store";
import Packet from "./Packet";
import Planet from "./Planet";
import RoutePath from "./RoutePath";
import VoidLink from "./VoidLink";

export type ScenePos = [number, number, number];

export default function Universe({ snapshot }: { snapshot: Snapshot }) {
  const positions = useMemo(() => {
    const xs = snapshot.nodes.map((n) => n.x);
    const ys = snapshot.nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const k = VISUAL.SCENE_SIZE / span;

    const map = new Map<string, ScenePos>();
    for (const n of snapshot.nodes) {
      map.set(n.id, [(n.x - cx) * k, 0, (n.y - cy) * k]);
    }
    return map;
  }, [snapshot.nodes]);

  const route = useStore((s) => s.route);

  return (
    <group>
      {snapshot.edges.map((e) => (
        <VoidLink
          key={`${e.a}-${e.b}`}
          a={positions.get(e.a)!}
          b={positions.get(e.b)!}
          alive={e.alive}
        />
      ))}

      {snapshot.nodes.map((n) => (
        <Planet key={n.id} node={n} position={positions.get(n.id)!} />
      ))}

      {route?.deliverable && <RoutePath route={route} positions={positions} />}
      {route?.deliverable && <Packet route={route} positions={positions} />}
    </group>
  );
}
