import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend the dev server proxies to. Override with VITE_BACKEND_URL for a
// non-default host/port. The frontend itself only ever calls relative /api +
// /ws paths, so swapping backends is purely a proxy concern.
const BACKEND_URL = process.env.VITE_BACKEND_URL ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: BACKEND_URL, changeOrigin: true },
      "/ws": { target: BACKEND_URL, ws: true, changeOrigin: true },
    },
  },
});
