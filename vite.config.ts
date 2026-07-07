import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendHost = String(process.env.VITE_WINGMAN_LOCAL_BACKEND_HOST || "127.0.0.1").trim();
// Deliberately does NOT fall back to the generic process.env.PORT: the backend server
// (server/competitor-lookup-server.mjs) also reads PORT for its own bind address, and
// dev launchers commonly set PORT to the frontend's own port. Trusting PORT here made
// the API proxy target itself whenever both conventions collided (see PORT usage below).
const parsedBackendPort = Number(process.env.VITE_WINGMAN_LOCAL_BACKEND_PORT || 8787);
const backendPort = Number.isFinite(parsedBackendPort) ? parsedBackendPort : 8787;
const apiProxyTarget = String(process.env.VITE_API_PROXY_TARGET || `http://${backendHost}:${backendPort}`).trim();

const serverHost = String(process.env.VITE_SERVER_HOST || process.env.WINGMAN_UI_HOST || "127.0.0.1").trim();
const parsedUiPort = Number(process.env.WINGMAN_UI_PORT || process.env.VITE_WINGMAN_UI_PORT || 3000);
const uiPort = Number.isFinite(parsedUiPort) ? parsedUiPort : 3000;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: serverHost,
    port: uiPort,
    strictPort: false,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: false,
        secure: false,
      },
    },
  },
  preview: {
    host: serverHost,
    port: uiPort,
    strictPort: false,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: false,
        secure: false,
      },
    },
  },
});
