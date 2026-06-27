// src/App.tsx
//
// HUD shell: title, the holographic orbital map (hero), the control/telemetry
// rail, and the status bar. Runs the boot sequence on load and kicks off the
// store (fetch universe + open the WebSocket).
import { useEffect, useState } from "react";

import { VISUAL } from "./constants/visual";
import { useReducedMotion } from "./reducedMotion";
import { useStore } from "./store";
import EncodingPanel from "./panels/EncodingPanel";
import HopLogPanel from "./panels/HopLogPanel";
import StatusBar from "./panels/StatusBar";
import TelemetryPanel from "./panels/TelemetryPanel";
import Toolbar from "./panels/Toolbar";
import SceneCanvas from "./three/SceneCanvas";

export default function App() {
  const init = useStore((s) => s.init);
  const reduced = useReducedMotion();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  // Boot sequence: panels fade in from VOID_BLACK and HUD frames draw in.
  // Reduced motion skips straight to the booted state.
  useEffect(() => {
    if (reduced) {
      setBooted(true);
      return;
    }
    const t = window.setTimeout(() => setBooted(true), VISUAL.BOOT_SEQUENCE_MS);
    return () => window.clearTimeout(t);
  }, [reduced]);

  return (
    <div className={`hud ${booted ? "hud--booted" : "hud--booting"}`}>
      <header className="hud__title">
        <span className="glitch hud__wordmark" data-text="RELIC RING PROTOCOL">
          RELIC RING PROTOCOL
        </span>
        <span className="hud__subtitle">ORBITAL ROUTING COMMAND</span>
      </header>

      <main className="hud__stage">
        <SceneCanvas />
        {/* Corner-bracket frame around the map; pure borders, no gradient. */}
        <div className="hud__map-frame" aria-hidden="true" />
      </main>

      <aside className="hud__rail">
        <Toolbar />
        <TelemetryPanel />
        <HopLogPanel />
        <EncodingPanel />
      </aside>

      <StatusBar />
    </div>
  );
}
