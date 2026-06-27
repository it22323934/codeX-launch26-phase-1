// src/store.ts
//
// Single zustand store. Components select slices; REST calls and WS messages
// mutate it. Holds no physics - only fetched results and UI state. The scene
// re-renders declaratively from this store on every reroute.
import { create } from "zustand";

import { api, connectWs } from "./api";
import type { RouteResult, Snapshot } from "./api";
import { DEFAULT_PAYLOAD } from "./constants/protocol";

// Drives the StatusBar tag and the boot sequence.
export type Status = "boot" | "idle" | "transmitting" | "delivered" | "lost";

interface State {
  snapshot: Snapshot | null;
  originId: string | null;
  destinationId: string | null;
  payload: string;
  route: RouteResult | null;
  killMode: boolean;
  status: Status;
  error: string | null;
  // Bumped to Date.now() to fire a one-shot glitch flicker on a state change
  // (node death, route failure). Components watch this value.
  glitchAt: number;

  init: () => void;
  setOrigin: (id: string) => void;
  setDestination: (id: string) => void;
  setPayload: (p: string) => void;
  toggleKillMode: () => void;
  transmit: () => Promise<void>;
  reset: () => Promise<void>;
  killNode: (id: string) => Promise<void>;
  killLink: (a: string, b: string) => Promise<void>;
}

export const useStore = create<State>((set, get) => {
  // Reflect a route result onto status + glitch in one place.
  const applyRoute = (result: RouteResult) =>
    set({
      route: result,
      status: result.deliverable ? "delivered" : "lost",
      glitchAt: result.deliverable ? get().glitchAt : Date.now(),
    });

  return {
    snapshot: null,
    originId: null,
    destinationId: null,
    payload: DEFAULT_PAYLOAD,
    route: null,
    killMode: false,
    status: "boot",
    error: null,
    glitchAt: 0,

    init: () => {
      api
        .getUniverse()
        .then((snapshot) => {
          const ids = snapshot.nodes.map((n) => n.id);
          set({
            snapshot,
            status: "idle",
            error: null,
            originId: get().originId ?? ids[0] ?? null,
            destinationId: get().destinationId ?? ids[ids.length - 1] ?? null,
          });
        })
        .catch((e) => set({ error: String(e) }));

      // The backend pushes topology on every kill/revive, and (once the router
      // is implemented) a fresh route when one is active - no page reload.
      connectWs((msg) => {
        if (msg.type === "topology") set({ snapshot: msg.snapshot });
        else if (msg.type === "route") applyRoute(msg.result);
      });
    },

    setOrigin: (id) => set({ originId: id }),
    setDestination: (id) => set({ destinationId: id }),
    setPayload: (p) => set({ payload: p }),
    toggleKillMode: () => set((s) => ({ killMode: !s.killMode })),

    transmit: async () => {
      const { originId, destinationId, payload } = get();
      if (!originId || !destinationId) return;
      set({ status: "transmitting", error: null });
      try {
        applyRoute(await api.postRoute(originId, destinationId, payload));
      } catch (e) {
        // The backend router may still be a scaffold stub (HTTP 501). Surface
        // it on the HUD instead of throwing into the void.
        set({ status: "lost", error: String(e), route: null, glitchAt: Date.now() });
      }
    },

    reset: async () => {
      const snapshot = await api.reset();
      set({ snapshot, route: null, status: "idle", error: null });
    },

    killNode: async (id) => {
      const snapshot = await api.toggleNode(id);
      set({ snapshot, glitchAt: Date.now() });
    },

    killLink: async (a, b) => {
      const snapshot = await api.toggleLink(a, b);
      set({ snapshot, glitchAt: Date.now() });
    },
  };
});
