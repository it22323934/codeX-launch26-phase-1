// src/main.tsx
//
// Entry point. Injects the visual.ts PALETTE into CSS custom properties before
// first paint so index.css and the Three.js scene share one source of color
// (constants-config-discipline: a value is defined exactly once).
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { PALETTE, PANEL_ALPHA } from "./constants/visual";
import "./index.css";

/** "#RRGGBB" + alpha -> "rgba(r, g, b, a)" for the translucent panel fill. */
function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function injectPalette() {
  const root = document.documentElement.style;
  root.setProperty("--void-black", PALETTE.VOID_BLACK);
  root.setProperty("--panel-black", PALETTE.PANEL_BLACK);
  root.setProperty("--cyan", PALETTE.CYAN);
  root.setProperty("--magenta", PALETTE.MAGENTA);
  root.setProperty("--steel", PALETTE.STEEL);
  root.setProperty("--text-hi", PALETTE.TEXT_HI);
  root.setProperty("--text-dim", PALETTE.TEXT_DIM);
  // Pre-mixed flat translucent fill (no gradient) for glass panels.
  root.setProperty("--panel-fill", hexToRgba(PALETTE.PANEL_BLACK, PANEL_ALPHA));
}

injectPalette();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
