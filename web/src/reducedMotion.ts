// src/reducedMotion.ts
//
// One hook so every animated surface (radar sweep, packet, boot sequence)
// honors prefers-reduced-motion identically. When reduced, callers freeze
// motion and render the route/packet statically.
import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
